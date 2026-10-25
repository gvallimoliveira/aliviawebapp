CREATE OR REPLACE FUNCTION public.validate_crefito_format()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
  _is_vip boolean := false;
  _was_student boolean := false;
  _had_crefito boolean := false;
  _is_service_role boolean := false;
  _fallback_vips text[] := ARRAY['gvallimoliveira@gmail.com','gvallim.fisio@gmail.com'];
BEGIN
  BEGIN
    _is_service_role := (current_setting('request.jwt.claim.role', true) = 'service_role') OR (auth.role() = 'service_role');
  EXCEPTION WHEN OTHERS THEN
    _is_service_role := false;
  END;
  IF TG_OP = 'UPDATE' THEN
    _was_student := COALESCE(OLD.is_student, false);
    _had_crefito := OLD.crefito IS NOT NULL AND length(trim(OLD.crefito)) > 0;
    -- Revocation is not professional registration. Keep an already missing
    -- CREFITO missing only while all professional/academic access is disabled.
    -- Inserts and any activation still require the existing validation below.
    IF NOT _had_crefito
       AND (NEW.crefito IS NULL OR length(trim(NEW.crefito)) = 0)
       AND NEW.is_student IS FALSE
       AND NEW.is_partner IS FALSE
       AND NEW.approved IS FALSE
       AND NEW.subscription_status = 'inactive'
       AND NEW.active_profile_mode = 'professional' THEN
      RETURN NEW;
    END IF;
  END IF;
  IF NOT _is_service_role
     AND COALESCE(NEW.is_student, false) = true
     AND NEW.crefito IS NOT NULL AND length(trim(NEW.crefito)) > 0
     AND (TG_OP = 'INSERT' OR (NOT _was_student AND _had_crefito)) THEN
    SELECT u.email INTO _email FROM auth.users u WHERE u.id = NEW.user_id;
    SELECT EXISTS (SELECT 1 FROM public.vip_users v WHERE lower(v.email) = lower(_email)) INTO _is_vip;
    IF NOT _is_vip AND lower(COALESCE(_email,'')) = ANY (_fallback_vips) THEN _is_vip := true; END IF;
    IF NOT _is_vip THEN RAISE EXCEPTION 'Professional accounts with CREFITO cannot enable Student mode.'; END IF;
  END IF;
  IF COALESCE(NEW.is_student, false) = true THEN RETURN NEW; END IF;
  IF NEW.crefito IS NULL OR length(trim(NEW.crefito)) = 0 THEN
    RAISE EXCEPTION 'CREFITO is required for professional accounts. Enable Student Access if you are still studying.';
  END IF;
  IF NEW.crefito !~ '^\d{1,6}-[A-Z]$' THEN
    RAISE EXCEPTION 'Invalid CREFITO format. Expected pattern: 123456-F';
  END IF;
  RETURN NEW;
END;
$function$;