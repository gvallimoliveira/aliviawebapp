ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS signature_image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Professionals can read own signature"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Professionals can upload own signature"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Professionals can update own signature"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Professionals can delete own signature"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);