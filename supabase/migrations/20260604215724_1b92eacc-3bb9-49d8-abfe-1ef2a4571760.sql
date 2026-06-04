ALTER TABLE public.short_links ADD COLUMN IF NOT EXISTS target_url text;
ALTER TABLE public.short_links ALTER COLUMN bucket DROP NOT NULL;
ALTER TABLE public.short_links ALTER COLUMN file_path DROP NOT NULL;
ALTER TABLE public.short_links ADD CONSTRAINT short_links_target_check CHECK (target_url IS NOT NULL OR (bucket IS NOT NULL AND file_path IS NOT NULL));
CREATE INDEX IF NOT EXISTS short_links_slug_idx ON public.short_links(slug);