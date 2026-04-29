
CREATE POLICY "Clinic members read patient-files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] = 'clinic'
  AND is_clinic_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Clinic members upload patient-files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] = 'clinic'
  AND is_clinic_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Clinic managers delete patient-files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] = 'clinic'
  AND get_clinic_role(auth.uid(), ((storage.foldername(name))[2])::uuid) = ANY (ARRAY['owner'::clinic_role, 'therapist'::clinic_role])
);

CREATE POLICY "Pros read own patient-files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] = 'pro'
  AND ((storage.foldername(name))[2])::uuid IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Pros upload own patient-files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] = 'pro'
  AND ((storage.foldername(name))[2])::uuid IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Pros delete own patient-files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] = 'pro'
  AND ((storage.foldername(name))[2])::uuid IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
);
