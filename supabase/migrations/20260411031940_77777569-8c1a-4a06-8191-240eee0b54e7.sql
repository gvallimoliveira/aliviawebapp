
CREATE TABLE public.clinic_assessment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor_user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinic_assessment_logs_clinic ON public.clinic_assessment_logs(clinic_id, created_at DESC);

ALTER TABLE public.clinic_assessment_logs ENABLE ROW LEVEL SECURITY;

-- Owner and secretary can view audit logs
CREATE POLICY "Managers can view clinic logs"
ON public.clinic_assessment_logs
FOR SELECT
TO authenticated
USING (can_manage_clinic(auth.uid(), clinic_id));

-- Anyone can insert logs (for anonymous assessment flow)
CREATE POLICY "Anyone can insert clinic logs"
ON public.clinic_assessment_logs
FOR INSERT
TO public
WITH CHECK (true);
