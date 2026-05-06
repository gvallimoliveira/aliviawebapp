-- Allow clinic owners/therapists to manage clinic logos in professional-photos bucket
-- Path pattern: clinic-logos/{clinic_id}.{ext}

CREATE POLICY "Clinic managers upload clinic logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'professional-photos'
  AND (storage.foldername(name))[1] = 'clinic-logos'
  AND get_clinic_role(
    auth.uid(),
    (split_part(split_part(name, '/', 2), '.', 1))::uuid
  ) = ANY (ARRAY['owner'::clinic_role, 'therapist'::clinic_role])
);

CREATE POLICY "Clinic managers update clinic logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'professional-photos'
  AND (storage.foldername(name))[1] = 'clinic-logos'
  AND get_clinic_role(
    auth.uid(),
    (split_part(split_part(name, '/', 2), '.', 1))::uuid
  ) = ANY (ARRAY['owner'::clinic_role, 'therapist'::clinic_role])
);

CREATE POLICY "Clinic managers delete clinic logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'professional-photos'
  AND (storage.foldername(name))[1] = 'clinic-logos'
  AND get_clinic_role(
    auth.uid(),
    (split_part(split_part(name, '/', 2), '.', 1))::uuid
  ) = ANY (ARRAY['owner'::clinic_role, 'therapist'::clinic_role])
);
