
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS sex text,
  ADD COLUMN IF NOT EXISTS occupation text;

DROP POLICY IF EXISTS "Clinic owners and therapists can update clinic patients" ON public.patients;

CREATE POLICY "Clinic managers can update clinic patients"
ON public.patients
FOR UPDATE
USING (
  clinic_id IS NOT NULL
  AND get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'admin'::clinic_role, 'secretary'::clinic_role])
);
