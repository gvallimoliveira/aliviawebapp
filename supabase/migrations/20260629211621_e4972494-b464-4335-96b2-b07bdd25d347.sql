CREATE TABLE IF NOT EXISTS public.app_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scope TEXT NOT NULL DEFAULT 'frontend',
  severity TEXT NOT NULL DEFAULT 'error',
  error_message TEXT NOT NULL,
  error_stack TEXT,
  function_name TEXT,
  route TEXT,
  user_id UUID,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT INSERT ON public.app_errors TO authenticated, anon;
GRANT SELECT ON public.app_errors TO authenticated;
GRANT ALL ON public.app_errors TO service_role;

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_log_errors"
  ON public.app_errors FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "vip_admins_can_read_errors"
  ON public.app_errors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vip_users v
      WHERE v.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS app_errors_created_at_idx ON public.app_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS app_errors_scope_severity_idx ON public.app_errors (scope, severity);
CREATE INDEX IF NOT EXISTS app_errors_function_name_idx ON public.app_errors (function_name);

CREATE OR REPLACE FUNCTION public.app_errors_prune()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF random() < 0.01 THEN
    DELETE FROM public.app_errors WHERE created_at < now() - interval '60 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_errors_prune_trigger ON public.app_errors;
CREATE TRIGGER app_errors_prune_trigger
  AFTER INSERT ON public.app_errors
  FOR EACH ROW EXECUTE FUNCTION public.app_errors_prune();