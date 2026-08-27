ALTER TABLE public.studio_brands
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS content_source text NOT NULL DEFAULT 'generic';