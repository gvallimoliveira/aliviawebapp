ALTER TABLE public.ai_credit_usage DROP CONSTRAINT IF EXISTS ai_credit_usage_user_id_fkey;
ALTER TABLE public.ai_credit_usage ALTER COLUMN user_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS ai_credit_usage_created_at_idx ON public.ai_credit_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_credit_usage_function_name_idx ON public.ai_credit_usage (function_name);