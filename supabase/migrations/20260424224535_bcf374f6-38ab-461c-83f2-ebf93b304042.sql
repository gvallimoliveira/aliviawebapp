-- Allow clinic managers (owners + secretaries) to reassign professionals on clinic assessments.
-- The existing policy only included owner+therapist, blocking secretaries from triaging.

DROP POLICY IF EXISTS "Clinic therapists and owners can update clinic assessments" ON public.assessments;

CREATE POLICY "Clinic managers and therapists can update clinic assessments"
ON public.assessments
FOR UPDATE
TO authenticated
USING (
  clinic_id IS NOT NULL
  AND get_clinic_role(auth.uid(), clinic_id) IN ('owner'::clinic_role, 'secretary'::clinic_role, 'therapist'::clinic_role)
);