CREATE TABLE public.studio_feed_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.studio_brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'art',
  creation_id uuid REFERENCES public.studio_creations(id) ON DELETE CASCADE,
  pillar text,
  title text,
  notes text,
  scheduled_date date,
  posted_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_feed_calendar TO authenticated;
GRANT ALL ON public.studio_feed_calendar TO service_role;
ALTER TABLE public.studio_feed_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed calendar brand access" ON public.studio_feed_calendar
  FOR ALL TO authenticated
  USING (public.can_access_studio_brand(brand_id))
  WITH CHECK (public.can_access_studio_brand(brand_id) AND user_id = auth.uid());
CREATE UNIQUE INDEX studio_feed_calendar_creation_uq ON public.studio_feed_calendar(creation_id) WHERE creation_id IS NOT NULL;
CREATE INDEX studio_feed_calendar_brand_idx ON public.studio_feed_calendar(brand_id, created_at);