ALTER TABLE public.studio_photos
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.studio_brands(id) ON DELETE CASCADE;

UPDATE public.studio_photos p
SET brand_id = (
  SELECT b.id FROM public.studio_brands b
  WHERE b.user_id = p.owner_id
  ORDER BY b.created_at ASC
  LIMIT 1
)
WHERE p.brand_id IS NULL;

CREATE INDEX IF NOT EXISTS studio_photos_brand_idx ON public.studio_photos (brand_id);