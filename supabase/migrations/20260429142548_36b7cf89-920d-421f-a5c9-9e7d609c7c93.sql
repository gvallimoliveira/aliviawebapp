
CREATE POLICY "Professionals can update their patient files"
ON public.patient_files FOR UPDATE TO authenticated
USING (clinic_id IS NULL AND professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()))
WITH CHECK (clinic_id IS NULL AND professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Clinic owners and therapists can update patient files"
ON public.patient_files FOR UPDATE TO authenticated
USING (clinic_id IS NOT NULL AND get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'therapist'::clinic_role]))
WITH CHECK (clinic_id IS NOT NULL AND get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'therapist'::clinic_role]));

CREATE POLICY "Professionals can update their patient photos"
ON public.patient_photos FOR UPDATE TO authenticated
USING (clinic_id IS NULL AND professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()))
WITH CHECK (clinic_id IS NULL AND professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Clinic owners and therapists can update patient photos"
ON public.patient_photos FOR UPDATE TO authenticated
USING (clinic_id IS NOT NULL AND get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'therapist'::clinic_role]))
WITH CHECK (clinic_id IS NOT NULL AND get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'therapist'::clinic_role]));
