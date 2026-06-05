
-- 1. Tabela pending_questionnaires
CREATE TABLE public.pending_questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  patient_id uuid,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  questionnaire_id text NOT NULL,
  domain text NOT NULL CHECK (domain IN ('cardio','geri')),
  suggested_reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped')),
  answers jsonb,
  score jsonb,
  completed_at timestamptz,
  completed_via text CHECK (completed_via IN ('in_session','patient_link','manual_later')),
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_q_assessment ON public.pending_questionnaires(assessment_id);
CREATE INDEX idx_pending_q_professional ON public.pending_questionnaires(professional_id);
CREATE INDEX idx_pending_q_clinic ON public.pending_questionnaires(clinic_id);
CREATE INDEX idx_pending_q_patient ON public.pending_questionnaires(patient_id);
CREATE INDEX idx_pending_q_token ON public.pending_questionnaires(share_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_questionnaires TO authenticated;
GRANT SELECT, UPDATE ON public.pending_questionnaires TO anon;
GRANT ALL ON public.pending_questionnaires TO service_role;

ALTER TABLE public.pending_questionnaires ENABLE ROW LEVEL SECURITY;

-- Professional owner
CREATE POLICY "pq_pro_owner_all" ON public.pending_questionnaires
FOR ALL TO authenticated
USING (
  professional_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = pending_questionnaires.professional_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  professional_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = pending_questionnaires.professional_id AND p.user_id = auth.uid()
  )
);

-- Clinic members
CREATE POLICY "pq_clinic_members_all" ON public.pending_questionnaires
FOR ALL TO authenticated
USING (
  clinic_id IS NOT NULL
  AND public.is_clinic_member(auth.uid(), clinic_id)
)
WITH CHECK (
  clinic_id IS NOT NULL
  AND public.is_clinic_member(auth.uid(), clinic_id)
);

-- Patient owner (via auth.uid match on patient_id used as user_id when applicable)
CREATE POLICY "pq_patient_select" ON public.pending_questionnaires
FOR SELECT TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "pq_patient_update" ON public.pending_questionnaires
FOR UPDATE TO authenticated
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

-- Public via share_token (the application filters by token; here we allow basic ops)
CREATE POLICY "pq_public_select_by_token" ON public.pending_questionnaires
FOR SELECT TO anon
USING (share_token IS NOT NULL);

CREATE POLICY "pq_public_update_by_token" ON public.pending_questionnaires
FOR UPDATE TO anon
USING (share_token IS NOT NULL AND status = 'pending')
WITH CHECK (share_token IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER trg_pq_updated_at
BEFORE UPDATE ON public.pending_questionnaires
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Flag needs_reimpression on assessments
ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS needs_reimpression boolean NOT NULL DEFAULT false;

-- 3. Trigger: when a pending_questionnaire is completed, set assessment.needs_reimpression
CREATE OR REPLACE FUNCTION public.mark_assessment_needs_reimpression()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.assessment_id IS NOT NULL THEN
    UPDATE public.assessments
    SET needs_reimpression = true
    WHERE id = NEW.assessment_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pq_needs_reimpression
AFTER UPDATE ON public.pending_questionnaires
FOR EACH ROW EXECUTE FUNCTION public.mark_assessment_needs_reimpression();
