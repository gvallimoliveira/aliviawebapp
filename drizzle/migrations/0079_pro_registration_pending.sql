ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS registration_pending boolean NOT NULL DEFAULT false;

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
  -- Subscribe-first rows: no CREFITO yet, locked until registration completes.
  IF NEW.registration_pending IS TRUE
     AND COALESCE(NEW.is_student, false) = false
     AND (NEW.crefito IS NULL OR length(trim(NEW.crefito)) = 0) THEN
    RETURN NEW;
  END IF;
  BEGIN
    _is_service_role := (current_setting('request.jwt.claim.role', true) = 'service_role') OR (auth.role() = 'service_role');
  EXCEPTION WHEN OTHERS THEN
    _is_service_role := false;
  END;
  IF TG_OP = 'UPDATE' THEN
    _was_student := COALESCE(OLD.is_student, false);
    _had_crefito := OLD.crefito IS NOT NULL AND length(trim(OLD.crefito)) > 0;
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

CREATE OR REPLACE FUNCTION public.sync_registration_pending()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.registration_pending IS TRUE THEN
    IF COALESCE(NEW.is_student, false) = true
       OR (NEW.crefito IS NOT NULL AND length(trim(NEW.crefito)) > 0) THEN
      NEW.registration_pending := false;
      NEW.approved := true;
    ELSE
      NEW.approved := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zz_sync_registration_pending_trg ON public.professionals;
CREATE TRIGGER zz_sync_registration_pending_trg
  BEFORE INSERT OR UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.sync_registration_pending();

CREATE OR REPLACE FUNCTION public.can_manage_hep(_professional_id uuid, _clinic_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.professionals p WHERE p.id = _professional_id AND (
     (_clinic_id IS NULL AND p.user_id = auth.uid() AND NOT COALESCE(p.registration_pending, false) AND public.has_active_pro_subscription(p.id))
     OR (_clinic_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.clinics c
       JOIN public.clinic_members actor ON actor.clinic_id = c.id AND actor.user_id = auth.uid() AND actor.status = 'active'
       JOIN public.clinic_members author ON author.clinic_id = c.id AND author.user_id = p.user_id AND author.status = 'active'
       WHERE c.id = _clinic_id AND c.subscription_status IN ('active','trialing')
       AND actor.role IN ('owner','admin','therapist','osteopath','pilates_instructor','doctor','rpg_specialist','massage_therapist','intern')
       AND author.role IN ('owner','admin','therapist','osteopath','pilates_instructor','doctor','rpg_specialist','massage_therapist','intern')
     ))
   )
 );
$function$;

CREATE OR REPLACE FUNCTION public.get_public_professional_assessment_link(_professional_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, full_name text, logo_url text, approved boolean, active boolean, has_access boolean, is_student boolean, student_institution text, student_period text, active_profile_mode text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id, p.user_id, p.full_name, p.logo_url, p.approved, p.active,
    (public.has_active_pro_subscription(p.id) AND NOT COALESCE(p.registration_pending, false)) AS has_access,
    COALESCE(p.is_student, false) AS is_student,
    p.student_institution, p.student_period,
    COALESCE(p.active_profile_mode, CASE WHEN p.is_student THEN 'student' ELSE 'professional' END) AS active_profile_mode
  FROM public.professionals p
  WHERE p.id = _professional_id;
$function$;