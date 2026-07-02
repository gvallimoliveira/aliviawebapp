CREATE OR REPLACE FUNCTION public.get_user_ai_tier(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _email text;
  _is_vip boolean;
  _prof record;
  _clinic record;
  _clinic_size text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email IS NULL THEN RETURN 'unknown'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.vip_users WHERE lower(email) = lower(_email)) INTO _is_vip;
  IF _is_vip OR lower(_email) = 'gvallimoliveira@gmail.com' THEN
    RETURN 'unlimited';
  END IF;

  SELECT cm.clinic_id, c.max_members
    INTO _clinic
    FROM public.clinic_members cm
    JOIN public.clinics c ON c.id = cm.clinic_id
    WHERE cm.user_id = _user_id
      AND c.subscription_status IN ('active', 'trialing')
    LIMIT 1;
  IF FOUND THEN
    _clinic_size := CASE
      WHEN COALESCE(_clinic.max_members, 3) <= 3 THEN 'small'
      WHEN COALESCE(_clinic.max_members, 3) <= 8 THEN 'medium'
      ELSE 'large'
    END;
    RETURN 'clinic_' || _clinic_size;
  END IF;

  SELECT is_partner, is_student, academic_period, subscription_status, lifetime_treatment, premium_granted
    INTO _prof
    FROM public.professionals
    WHERE user_id = _user_id
    LIMIT 1;

  IF FOUND THEN
    IF _prof.is_student AND COALESCE(_prof.academic_period, 0) BETWEEN 1 AND 10 THEN
      RETURN 'academic_monthly';
    END IF;
    IF COALESCE(_prof.subscription_status,'') IN ('active','trialing')
       OR COALESCE(_prof.lifetime_treatment,false)
       OR COALESCE(_prof.premium_granted,false) THEN
      RETURN 'pro_monthly';
    END IF;
    RETURN 'premium_b2c';
  END IF;

  RETURN 'premium_b2c';
END;
$function$;