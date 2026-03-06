
-- Add profile photo column to professionals
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- Create storage bucket for professional profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-photos', 'professional-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'professional-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'professional-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'professional-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view professional photos (public bucket)
CREATE POLICY "Anyone can view professional photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'professional-photos');
