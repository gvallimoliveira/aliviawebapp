CREATE OR REPLACE FUNCTION public.get_user_credit_status(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tier text;
  _is_partner boolean := false;
  _unlimited boolean := false;
  _included integer;
  _per_member integer;
  _used numeric := 0;
  _personal_used numeric := 0;
  _purchased integer := 0;
  _period_start timestamptz := date_trunc('month', now());
  _period_end   timestamptz := date_trunc('month', now()) + interval '1 month';
  _clinic_id uuid;
  _clinic_max integer;
  _clinic_size text;
  _clinic_members integer := 0;
  _pooled boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('tier','unknown','unlimited',false,'included',0,'used',0,'purchased',0,'pct',0);
  END IF;

  _tier := public.get_user_ai_tier(_user_id);

  SELECT COALESCE(is_partner, false) INTO _is_partner
    FROM public.professionals WHERE user_id = _user_id LIMIT 1;

  _unlimited := (_tier = 'unlimited') OR COALESCE(_is_partner, false);

  _per_member := public.get_included_credits_for_tier(_tier);
  _included := _per_member;

  SELECT COALESCE(SUM(credits_used)::numeric, 0) INTO _personal_used
    FROM public.ai_credit_usage
   WHERE user_id = _user_id
     AND created_at >= _period_start
     AND created_at <  _period_end
     AND COALESCE(was_bypassed, false) = false;

  _used := _personal_used;

  SELECT COALESCE(SUM(credits_remaining)::int, 0) INTO _purchased
    FROM public.ai_credit_packages
   WHERE user_id = _user_id
     AND credits_remaining > 0
     AND expires_at > now();

  SELECT cm.clinic_id, c.max_members
    INTO _clinic_id, _clinic_max
    FROM public.clinic_members cm
    JOIN public.clinics c ON c.id = cm.clinic_id
    WHERE cm.user_id = _user_id
      AND c.subscription_status IN ('active','trialing')
    LIMIT 1;

  _clinic_size := CASE
    WHEN _clinic_id IS NULL THEN NULL
    WHEN COALESCE(_clinic_max, 3) <= 3 THEN 'small'
    WHEN COALESCE(_clinic_max, 3) <= 8 THEN 'medium'
    ELSE 'large'
  END;

  -- Clinic tiers use an aggregated (pooled) quota shared by the whole team.
  IF _clinic_id IS NOT NULL AND _tier LIKE 'clinic_%' THEN
    SELECT COUNT(*)::int INTO _clinic_members
      FROM public.clinic_members
     WHERE clinic_id = _clinic_id;

    _clinic_members := GREATEST(COALESCE(_clinic_members, 1), 1);
    _included := _per_member * _clinic_members;
    _pooled := true;

    SELECT COALESCE(SUM(u.credits_used)::numeric, 0) INTO _used
      FROM public.ai_credit_usage u
      JOIN public.clinic_members cm2 ON cm2.user_id = u.user_id
     WHERE cm2.clinic_id = _clinic_id
       AND u.created_at >= _period_start
       AND u.created_at <  _period_end
       AND COALESCE(u.was_bypassed, false) = false;
  END IF;

  RETURN jsonb_build_object(
    'tier', _tier,
    'is_partner', _is_partner,
    'unlimited', _unlimited,
    'included', _included,
    'per_member', _per_member,
    'pooled', _pooled,
    'clinic_members', _clinic_members,
    'used', ROUND(_used, 2),
    'personal_used', ROUND(_personal_used, 2),
    'purchased', _purchased,
    'pct', CASE WHEN _included > 0 THEN LEAST(100, ROUND((_used / _included) * 100))::int ELSE 0 END,
    'period_start', _period_start,
    'period_end', _period_end,
    'clinic_id', _clinic_id,
    'clinic_size', _clinic_size
  );
END;
$function$;