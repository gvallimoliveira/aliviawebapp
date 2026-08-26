CREATE TABLE public.studio_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  usage TEXT NOT NULL DEFAULT 'livre',
  credit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_photos TO authenticated;
GRANT ALL ON public.studio_photos TO service_role;

ALTER TABLE public.studio_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their studio photos"
ON public.studio_photos FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE INDEX idx_studio_photos_owner ON public.studio_photos(owner_id, sort_order);

CREATE TRIGGER update_studio_photos_updated_at
BEFORE UPDATE ON public.studio_photos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Studio photos: owner reads own folder"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'studio-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Studio photos: owner uploads own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'studio-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Studio photos: owner updates own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'studio-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Studio photos: owner deletes own folder"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'studio-photos' AND (storage.foldername(name))[1] = auth.uid()::text);