CREATE OR REPLACE FUNCTION public.is_clinic_clinician(_user_id uuid, _clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members m JOIN public.clinics c ON c.id = m.clinic_id
    WHERE m.user_id = _user_id AND m.clinic_id = _clinic_id AND m.status = 'active'
      AND c.subscription_status IN ('active','trialing')
      AND m.role IN ('owner','admin','therapist','osteopath','pilates_instructor','doctor','rpg_specialist','massage_therapist','intern')
  )
$$;
REVOKE ALL ON FUNCTION public.is_clinic_clinician(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clinic_clinician(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_any_clinic_clinician(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinic_members m WHERE m.user_id = _user_id AND m.status='active'
    AND public.is_clinic_clinician(_user_id, m.clinic_id))
$$;
REVOKE ALL ON FUNCTION public.is_any_clinic_clinician(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_any_clinic_clinician(uuid) TO authenticated, service_role;

-- Clinic clinicians manage their own appointments inside their clinic (no separate PRO needed)
DROP POLICY IF EXISTS "Clinic clinicians manage own clinic appointments" ON public.professional_appointments;
CREATE POLICY "Clinic clinicians manage own clinic appointments" ON public.professional_appointments FOR ALL TO authenticated
USING (clinic_id IS NOT NULL AND public.is_clinic_clinician(auth.uid(), clinic_id)
  AND professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()))
WITH CHECK (clinic_id IS NOT NULL AND public.is_clinic_clinician(auth.uid(), clinic_id)
  AND professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()));

-- Session notes: all clinical roles of the clinic, not only owner/therapist/intern
DROP POLICY IF EXISTS "Clinic clinicians manage clinic session notes" ON public.session_notes;
CREATE POLICY "Clinic clinicians manage clinic session notes" ON public.session_notes FOR ALL TO authenticated
USING (clinic_id IS NOT NULL AND public.is_clinic_clinician(auth.uid(), clinic_id))
WITH CHECK (clinic_id IS NOT NULL AND public.is_clinic_clinician(auth.uid(), clinic_id));

-- Photos/files: all clinical roles can update/delete in their clinic
DROP POLICY IF EXISTS "Clinic clinicians update patient photos" ON public.patient_photos;
CREATE POLICY "Clinic clinicians update patient photos" ON public.patient_photos FOR UPDATE TO authenticated
USING (clinic_id IS NOT NULL AND public.is_clinic_clinician(auth.uid(), clinic_id))
WITH CHECK (clinic_id IS NOT NULL AND public.is_clinic_clinician(auth.uid(), clinic_id));
DROP POLICY IF EXISTS "Clinic clinicians delete patient photos" ON public.patient_photos;
CREATE POLICY "Clinic clinicians delete patient photos" ON public.patient_photos FOR DELETE TO authenticated
USING (clinic_id IS NOT NULL AND public.is_clinic_clinician(auth.uid(), clinic_id));
DROP POLICY IF EXISTS "Clinic clinicians update patient files" ON public.patient_files;
CREATE POLICY "Clinic clinicians update patient files" ON public.patient_files FOR UPDATE TO authenticated
USING (clinic_id IS NOT NULL AND public.is_clinic_clinician(auth.uid(), clinic_id))
WITH CHECK (clinic_id IS NOT NULL AND public.is_clinic_clinician(auth.uid(), clinic_id));
DROP POLICY IF EXISTS "Clinic clinicians delete patient files" ON public.patient_files;
CREATE POLICY "Clinic clinicians delete patient files" ON public.patient_files FOR DELETE TO authenticated
USING (clinic_id IS NOT NULL AND public.is_clinic_clinician(auth.uid(), clinic_id));

-- Personal professional notes: own rows, for PRO subscribers or active clinic clinicians
DROP POLICY IF EXISTS "Clinic clinicians manage own notes" ON public.professional_notes;
CREATE POLICY "Clinic clinicians manage own notes" ON public.professional_notes FOR ALL TO authenticated
USING (public.is_any_clinic_clinician(auth.uid()) AND professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()))
WITH CHECK (public.is_any_clinic_clinician(auth.uid()) AND professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()));