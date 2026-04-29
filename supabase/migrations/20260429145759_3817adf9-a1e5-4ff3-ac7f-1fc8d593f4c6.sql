-- Short links table for sharing patient files/photos with compact URLs
CREATE TABLE public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  bucket text NOT NULL,
  file_path text NOT NULL,
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_short_links_slug ON public.short_links(slug);
CREATE INDEX idx_short_links_expires_at ON public.short_links(expires_at);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create links (their own user id)
CREATE POLICY "Users can create their own short links"
ON public.short_links FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Users can view their own links
CREATE POLICY "Users can view their own short links"
ON public.short_links FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Users can delete their own links
CREATE POLICY "Users can delete their own short links"
ON public.short_links FOR DELETE
TO authenticated
USING (auth.uid() = created_by);