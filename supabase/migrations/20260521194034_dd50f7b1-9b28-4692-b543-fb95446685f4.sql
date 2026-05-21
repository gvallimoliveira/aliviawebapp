-- Update can_manage_clinic to include 'admin' (same as owner) — secretary already included
CREATE OR REPLACE FUNCTION public.can_manage_clinic(_user_id uuid, _clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE user_id = _user_id AND clinic_id = _clinic_id AND status = 'active'
    AND role IN ('owner', 'admin', 'secretary')
  )
$$;

-- Recreate role-restricted RLS policies to grant 'admin' the same power as 'owner'

-- clinics
DROP POLICY IF EXISTS "Owners can update their clinic" ON public.clinics;
CREATE POLICY "Owners and admins can update their clinic"
ON public.clinics
FOR UPDATE
USING (get_clinic_role(auth.uid(), id) IN ('owner'::clinic_role, 'admin'::clinic_role));

-- assessments
DROP POLICY IF EXISTS "Clinic managers and therapists can update clinic assessments" ON public.assessments;
CREATE POLICY "Clinic managers and therapists can update clinic assessments"
ON public.assessments
FOR UPDATE
TO authenticated
USING ((clinic_id IS NOT NULL) AND (get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'admin'::clinic_role, 'secretary'::clinic_role, 'therapist'::clinic_role])));

DROP POLICY IF EXISTS "Clinic owners and therapists can delete clinic assessments" ON public.assessments;
CREATE POLICY "Clinic owners and therapists can delete clinic assessments"
ON public.assessments
FOR DELETE
TO authenticated
USING ((clinic_id IS NOT NULL) AND (get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'admin'::clinic_role, 'therapist'::clinic_role])));

-- patients
DROP POLICY IF EXISTS "Clinic owners and therapists can delete clinic patients" ON public.patients;
CREATE POLICY "Clinic owners and therapists can delete clinic patients"
ON public.patients
FOR DELETE
USING ((clinic_id IS NOT NULL) AND (get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'admin'::clinic_role, 'therapist'::clinic_role])));

DROP POLICY IF EXISTS "Clinic owners and therapists can update clinic patients" ON public.patients;
CREATE POLICY "Clinic owners and therapists can update clinic patients"
ON public.patients
FOR UPDATE
USING ((clinic_id IS NOT NULL) AND (get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'admin'::clinic_role, 'therapist'::clinic_role])));

-- patient_files
DROP POLICY IF EXISTS "Clinic owners and therapists can delete patient files" ON public.patient_files;
CREATE POLICY "Clinic owners and therapists can delete patient files"
ON public.patient_files
FOR DELETE
TO authenticated
USING ((clinic_id IS NOT NULL) AND (get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'admin'::clinic_role, 'therapist'::clinic_role])));

DROP POLICY IF EXISTS "Clinic owners and therapists can update patient files" ON public.patient_files;
CREATE POLICY "Clinic owners and therapists can update patient files"
ON public.patient_files
FOR UPDATE
TO authenticated
USING ((clinic_id IS NOT NULL) AND (get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'admin'::clinic_role, 'therapist'::clinic_role])))
WITH CHECK ((clinic_id IS NOT NULL) AND (get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'admin'::clinic_role, 'therapist'::clinic_role])));

-- patient_photos
DROP POLICY IF EXISTS "Clinic owners and therapists can delete patient photos" ON public.patient_photos;
CREATE POLICY "Clinic owners and therapists can delete patient photos"
ON public.patient_photos
FOR DELETE
TO authenticated
USING ((clinic_id IS NOT NULL) AND (get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'admin'::clinic_role, 'therapist'::clinic_role])));

DROP POLICY IF EXISTS "Clinic owners and therapists can update patient photos" ON public.patient_photos;
CREATE POLICY "Clinic owners and therapists can update patient photos"
ON public.patient_photos
FOR UPDATE
TO authenticated
USING ((clinic_id IS NOT NULL) AND (get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'admin'::clinic_role, 'therapist'::clinic_role])))
WITH CHECK ((clinic_id IS NOT NULL) AND (get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'admin'::clinic_role, 'therapist'::clinic_role])));