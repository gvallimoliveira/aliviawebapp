ALTER TABLE public.studio_creations
  ADD COLUMN IF NOT EXISTS png_path text,
  ADD COLUMN IF NOT EXISTS composition jsonb,
  ADD COLUMN IF NOT EXISTS segment text,
  ADD COLUMN IF NOT EXISTS angle text;

CREATE POLICY "studio art owner read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'studio-art' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "studio art owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'studio-art' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "studio art owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'studio-art' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "studio art owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'studio-art' AND (storage.foldername(name))[1] = auth.uid()::text);