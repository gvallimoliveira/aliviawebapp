CREATE TABLE public.ai_token_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  function_name TEXT NOT NULL,
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  fallback_index INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ai_token_usage_created_at ON public.ai_token_usage (created_at DESC);
CREATE INDEX idx_ai_token_usage_function ON public.ai_token_usage (function_name, created_at DESC);

GRANT SELECT ON public.ai_token_usage TO authenticated;
GRANT ALL ON public.ai_token_usage TO service_role;

ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VIP admins can view token usage"
ON public.ai_token_usage
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.vip_users v
  WHERE lower(v.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
));