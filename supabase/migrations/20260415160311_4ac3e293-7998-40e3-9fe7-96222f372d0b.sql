CREATE TABLE public.clinic_feedback_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  service_type text NOT NULL DEFAULT 'fisioterapia',
  professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  patient_name text,
  patient_email text,
  service_answers jsonb NOT NULL DEFAULT '{}',
  professional_answers jsonb NOT NULL DEFAULT '{}',
  clinic_answers jsonb NOT NULL DEFAULT '{}',
  general_observations text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_feedback_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON public.clinic_feedback_surveys FOR INSERT
  TO public WITH CHECK (true);

CREATE POLICY "Clinic members can view feedback"
  ON public.clinic_feedback_surveys FOR SELECT
  TO authenticated
  USING (is_clinic_member(auth.uid(), clinic_id));

CREATE INDEX idx_feedback_clinic_id ON public.clinic_feedback_surveys(clinic_id);
CREATE INDEX idx_feedback_service_type ON public.clinic_feedback_surveys(service_type);
CREATE INDEX idx_feedback_created_at ON public.clinic_feedback_surveys(created_at DESC);