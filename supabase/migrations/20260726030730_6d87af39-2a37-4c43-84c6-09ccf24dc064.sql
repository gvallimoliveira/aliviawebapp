
CREATE TABLE public.ai_credit_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  function_name TEXT NOT NULL,
  tier TEXT,
  path_taken TEXT NOT NULL,
  decision TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT false,
  enforced BOOLEAN NOT NULL DEFAULT false,
  unlimited BOOLEAN NOT NULL DEFAULT false,
  remaining NUMERIC,
  cost NUMERIC NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX ai_credit_decisions_created_at_idx ON public.ai_credit_decisions (created_at DESC);
CREATE INDEX ai_credit_decisions_function_idx ON public.ai_credit_decisions (function_name, created_at DESC);
CREATE INDEX ai_credit_decisions_user_idx ON public.ai_credit_decisions (user_id, created_at DESC);
CREATE INDEX ai_credit_decisions_path_idx ON public.ai_credit_decisions (path_taken, created_at DESC);

GRANT ALL ON public.ai_credit_decisions TO service_role;

ALTER TABLE public.ai_credit_decisions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_config (key, value)
VALUES ('ai_credits_enforced', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb;
