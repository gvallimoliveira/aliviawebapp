CREATE POLICY "Anyone can update assessment reports"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'assessment-reports')
WITH CHECK (bucket_id = 'assessment-reports');

CREATE POLICY "Anyone can delete assessment reports"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'assessment-reports');