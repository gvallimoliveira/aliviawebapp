ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS assessment_token text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_patients_assessment_token ON public.patients(assessment_token) WHERE assessment_token IS NOT NULL;

CREATE POLICY "Anyone with token can view patient"
ON public.patients
FOR SELECT
TO anon, authenticated
USING (assessment_token IS NOT NULL);