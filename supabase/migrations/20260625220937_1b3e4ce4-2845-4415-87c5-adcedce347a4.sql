
CREATE TABLE public.ai_response_cache (
  cache_key TEXT PRIMARY KEY,
  function_name TEXT NOT NULL,
  response JSONB NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.ai_response_cache TO service_role;

ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Service role only (edge functions). No direct client access.
CREATE POLICY "service_role manages ai cache"
  ON public.ai_response_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_ai_cache_expires ON public.ai_response_cache(expires_at);
CREATE INDEX idx_ai_cache_function ON public.ai_response_cache(function_name);
