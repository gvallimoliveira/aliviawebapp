CREATE TABLE public.studio_internal_favorites (
  user_id uuid PRIMARY KEY,
  favorites jsonb NOT NULL DEFAULT '[]'::jsonb,
  thumbs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_internal_favorites TO authenticated;
GRANT ALL ON public.studio_internal_favorites TO service_role;
ALTER TABLE public.studio_internal_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own studio backup" ON public.studio_internal_favorites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());