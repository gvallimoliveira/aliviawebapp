CREATE OR REPLACE FUNCTION public.validate_crefito_format()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
  _is_vip boolean := false;
  _was_student boolean := false;
  _had_crefito boolean := false;
  _is_service_role boolean := false;
  _fallback_vips text[] := ARRAY['gvallimoliveira@gmail.com','gvallim.fisio@gmail.com'];
BEGIN
  -- Service role (admin edge functions) bypasses the student/CREFITO trap entirely.
  -- This allows admin to flip is_student on partners that already have a CREFITO.
  BEGIN
    _is_service_role := (current_setting('request.jwt.claim.role', true) = 'service_role')
                      OR (auth.role() = 'service_role');
  EXCEPTION WHEN OTHERS THEN
    _is_service_role := false;
  END;

  IF TG_OP = 'UPDATE' THEN
    _was_student := COALESCE(OLD.is_student, false);
    _had_crefito := OLD.crefito IS NOT NULL AND length(trim(OLD.crefito)) > 0;
  END IF;

  IF NOT _is_service_role
     AND COALESCE(NEW.is_student, false) = true
     AND NEW.crefito IS NOT NULL AND length(trim(NEW.crefito)) > 0
     AND (TG_OP = 'INSERT' OR (NOT _was_student AND _had_crefito)) THEN
    SELECT u.email INTO _email FROM auth.users u WHERE u.id = NEW.user_id;
    SELECT EXISTS (SELECT 1 FROM public.vip_users v WHERE lower(v.email) = lower(_email)) INTO _is_vip;
    IF NOT _is_vip AND lower(COALESCE(_email,'')) = ANY (_fallback_vips) THEN
      _is_vip := true;
    END IF;
    IF NOT _is_vip THEN
      RAISE EXCEPTION 'Professional accounts with CREFITO cannot enable Student mode.';
    END IF;
  END IF;

  IF COALESCE(NEW.is_student, false) = true THEN
    RETURN NEW;
  END IF;

  IF NEW.crefito IS NULL OR length(trim(NEW.crefito)) = 0 THEN
    RAISE EXCEPTION 'CREFITO is required for professional accounts. Enable Student Access if you are still studying.';
  END IF;
  IF NEW.crefito !~ '^\d{1,6}-[A-Z]$' THEN
    RAISE EXCEPTION 'Invalid CREFITO format. Expected pattern: 123456-F';
  END IF;
  RETURN NEW;
END;
$function$;