-- Allow anyone to read basic clinic info (for assessment page branding)
CREATE POLICY "Anyone can read clinic basic info"
ON public.clinics
FOR SELECT
TO public
USING (true);

-- Allow anonymous creation of clinic assessments (no professional_id, just clinic_id)
CREATE POLICY "Anyone can create clinic assessments"
ON public.assessments
FOR INSERT
TO public
WITH CHECK (
  type = 'professional'
  AND user_id IS NULL
  AND clinic_id IS NOT NULL
);

-- Allow anonymous update of clinic assessments during flow
CREATE POLICY "Anyone can update clinic assessments during flow"
ON public.assessments
FOR UPDATE
TO anon, authenticated
USING (
  type = 'professional'
  AND user_id IS NULL
  AND clinic_id IS NOT NULL
);
