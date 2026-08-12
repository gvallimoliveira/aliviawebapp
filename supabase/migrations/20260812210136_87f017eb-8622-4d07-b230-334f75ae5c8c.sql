-- 1. New columns
ALTER TABLE public.data_subject_requests
  ADD COLUMN IF NOT EXISTS protocol text,
  ADD COLUMN IF NOT EXISTS requester_email text,
  ADD COLUMN IF NOT EXISTS requester_name text,
  ADD COLUMN IF NOT EXISTS requester_account_type text,
  ADD COLUMN IF NOT EXISTS requester_signup_provider text,
  ADD COLUMN IF NOT EXISTS account_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_purge_at timestamptz,
  ADD COLUMN IF NOT EXISTS audit jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS data_subject_requests_protocol_key
  ON public.data_subject_requests (protocol);

CREATE SEQUENCE IF NOT EXISTS public.dsr_protocol_seq;

-- 2. Snapshot + protocol trigger
CREATE OR REPLACE FUNCTION public.dsr_fill_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_created timestamptz;
  v_provider text;
  v_name text;
  v_type text;
  v_pro record;
  v_members int;
BEGIN
  IF NEW.protocol IS NULL THEN
    NEW.protocol := 'LGPD-' || to_char(now(), 'YYYY') || '-' ||
                    lpad(nextval('public.dsr_protocol_seq')::text, 4, '0');
  END IF;

  SELECT u.email::text,
         u.created_at,
         COALESCE(
           (u.raw_app_meta_data->'providers'->>0),
           (u.raw_app_meta_data->>'provider'),
           'email'
         ),
         COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
    INTO v_email, v_created, v_provider, v_name
  FROM auth.users u
  WHERE u.id = NEW.user_id;

  IF v_name IS NULL THEN
    SELECT p.full_name INTO v_name FROM public.profiles p WHERE p.user_id = NEW.user_id;
  END IF;

  SELECT * INTO v_pro FROM public.professionals WHERE user_id = NEW.user_id LIMIT 1;
  SELECT count(*)::int INTO v_members FROM public.clinic_members WHERE user_id = NEW.user_id;

  IF v_pro.id IS NOT NULL THEN
    IF COALESCE(v_pro.is_student, false) THEN
      v_type := 'student';
    ELSE
      v_type := 'professional';
    END IF;
  ELSIF COALESCE(v_members, 0) > 0 THEN
    v_type := 'clinic_staff';
  ELSE
    v_type := 'patient';
  END IF;

  NEW.requester_email := COALESCE(NEW.requester_email, v_email);
  NEW.requester_name := COALESCE(NEW.requester_name, v_name);
  NEW.requester_signup_provider := COALESCE(NEW.requester_signup_provider, v_provider);
  NEW.account_created_at := COALESCE(NEW.account_created_at, v_created);
  NEW.requester_account_type := COALESCE(NEW.requester_account_type, v_type);

  IF NEW.audit IS NULL OR jsonb_array_length(NEW.audit) = 0 THEN
    NEW.audit := jsonb_build_array(jsonb_build_object(
      'event', 'opened',
      'at', now(),
      'actor', COALESCE(v_email, NEW.user_id::text),
      'note', 'Pedido registrado pelo titular'
    ));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsr_fill_snapshot ON public.data_subject_requests;
CREATE TRIGGER trg_dsr_fill_snapshot
BEFORE INSERT ON public.data_subject_requests
FOR EACH ROW EXECUTE FUNCTION public.dsr_fill_snapshot();

-- 3. Helper to append audit events (used by edge functions via service role)
CREATE OR REPLACE FUNCTION public.dsr_append_audit(_request_id uuid, _event jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.data_subject_requests
     SET audit = COALESCE(audit, '[]'::jsonb) || jsonb_build_array(_event || jsonb_build_object('at', COALESCE(_event->>'at', now()::text))),
         updated_at = now()
   WHERE id = _request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.dsr_append_audit(uuid, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dsr_append_audit(uuid, jsonb) TO service_role;

-- 4. Admin reader with frozen identity + audit
DROP FUNCTION IF EXISTS public.get_dsr_admin();
CREATE OR REPLACE FUNCTION public.get_dsr_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  protocol text,
  request_type text,
  status text,
  details text,
  created_at timestamptz,
  updated_at timestamptz,
  handled_at timestamptz,
  notified_at timestamptz,
  scheduled_purge_at timestamptz,
  subject_name text,
  subject_email text,
  account_type text,
  signup_provider text,
  account_created_at timestamptz,
  account_exists boolean,
  audit jsonb,
  alerts jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    r.protocol,
    r.request_type,
    r.status,
    r.details,
    r.created_at,
    r.updated_at,
    r.handled_at,
    r.notified_at,
    r.scheduled_purge_at,
    COALESCE(r.requester_name, p.full_name),
    COALESCE(r.requester_email, u.email::text),
    r.requester_account_type,
    r.requester_signup_provider,
    COALESCE(r.account_created_at, u.created_at),
    (u.id IS NOT NULL),
    COALESCE(r.audit, '[]'::jsonb),
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'channel', l.channel,
                   'status', l.status,
                   'event_type', l.event_type,
                   'detail', l.detail,
                   'created_at', l.created_at
                 ) ORDER BY l.created_at DESC
               )
        FROM public.admin_alert_log l
        WHERE l.ref = r.id::text
      ),
      '[]'::jsonb
    )
  FROM public.data_subject_requests r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  LEFT JOIN auth.users u ON u.id = r.user_id
  ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dsr_admin() TO authenticated;