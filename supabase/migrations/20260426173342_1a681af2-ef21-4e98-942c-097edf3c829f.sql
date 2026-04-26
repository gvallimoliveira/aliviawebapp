CREATE POLICY "Clinic owners and therapists can delete clinic assessments"
ON public.assessments
FOR DELETE
TO authenticated
USING (
  clinic_id IS NOT NULL
  AND get_clinic_role(auth.uid(), clinic_id) IN ('owner'::clinic_role, 'therapist'::clinic_role)
);