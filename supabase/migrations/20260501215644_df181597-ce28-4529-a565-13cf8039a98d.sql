
CREATE TABLE IF NOT EXISTS public.youtube_video_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_key text NOT NULL UNIQUE,
  video_id text NOT NULL,
  title text,
  duration_seconds int,
  resolved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_youtube_cache_key ON public.youtube_video_cache(query_key);
ALTER TABLE public.youtube_video_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read youtube cache"
  ON public.youtube_video_cache FOR SELECT
  USING (true);
