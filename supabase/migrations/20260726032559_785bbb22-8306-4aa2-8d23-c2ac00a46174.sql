
-- Tighten storage policies on assessment-reports: require ownership via path prefix
DROP POLICY IF EXISTS "Authenticated users can upload assessment reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update assessment reports" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete assessment reports" ON storage.objects;

CREATE POLICY "Users can upload their own assessment reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'assessment-reports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own assessment reports"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'assessment-reports'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'assessment-reports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own assessment reports"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'assessment-reports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
