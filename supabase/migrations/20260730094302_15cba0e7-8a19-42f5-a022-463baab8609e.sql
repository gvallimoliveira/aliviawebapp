CREATE TABLE public.assessment_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_key text NOT NULL UNIQUE,
  snapshot jsonb NOT NULL,
  device_id text NOT NULL,
  device_label text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.assessment_progress TO service_role;

ALTER TABLE public.assessment_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to assessment_progress"
ON public.assessment_progress FOR ALL
USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.save_assessment_progress(
  _scope_key text,
  _snapshot jsonb,
  _device_id text,
  _device_label text DEFAULT NULL
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated timestamp with time zone;
BEGIN
  IF _scope_key IS NULL OR length(_scope_key) < 8 OR _device_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.assessment_progress (scope_key, snapshot, device_id, device_label, expires_at, updated_at)
  VALUES (_scope_key, _snapshot, _device_id, _device_label, now() + interval '24 hours', now())
  ON CONFLICT (scope_key) DO UPDATE
    SET snapshot = EXCLUDED.snapshot,
        device_id = EXCLUDED.device_id,
        device_label = EXCLUDED.device_label,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
  RETURNING updated_at INTO _updated;

  DELETE FROM public.assessment_progress WHERE expires_at < now();

  RETURN _updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_assessment_progress(_scope_key text)
RETURNS TABLE (
  snapshot jsonb,
  device_id text,
  device_label text,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ap.snapshot, ap.device_id, ap.device_label, ap.updated_at
  FROM public.assessment_progress ap
  WHERE ap.scope_key = _scope_key
    AND ap.expires_at > now()
    AND length(_scope_key) >= 8
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.clear_assessment_progress(_scope_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.assessment_progress WHERE scope_key = _scope_key;
$$;

REVOKE ALL ON FUNCTION public.save_assessment_progress(text, jsonb, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_assessment_progress(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_assessment_progress(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_assessment_progress(text, jsonb, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_assessment_progress(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clear_assessment_progress(text) TO anon, authenticated, service_role;