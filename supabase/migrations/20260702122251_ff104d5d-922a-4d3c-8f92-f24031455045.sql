CREATE OR REPLACE FUNCTION public.get_included_credits_for_tier(_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _tier
    WHEN 'unlimited'         THEN 0
    WHEN 'partner'           THEN 0
    WHEN 'pro_monthly'       THEN 100
    WHEN 'pro_annual'        THEN 120
    WHEN 'academic_monthly'  THEN 40
    WHEN 'academic_annual'   THEN 50
    WHEN 'clinic_small'      THEN 200
    WHEN 'clinic_medium'     THEN 250
    WHEN 'clinic_large'      THEN 300
    WHEN 'premium_b2c'       THEN 15
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_current_credit_quota(_user_id uuid)
RETURNS public.ai_credit_quotas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier text;
  _included integer;
  _period_start timestamptz := date_trunc('month', now());
  _period_end   timestamptz := date_trunc('month', now()) + interval '1 month';
  _row public.ai_credit_quotas;
  _clinic_id uuid;
BEGIN
  _tier := public.get_user_ai_tier(_user_id);
  _included := public.get_included_credits_for_tier(_tier);

  SELECT cm.clinic_id INTO _clinic_id
    FROM public.clinic_members cm
    JOIN public.clinics c ON c.id = cm.clinic_id
    WHERE cm.user_id = _user_id
      AND c.subscription_status IN ('active','trialing')
    LIMIT 1;

  INSERT INTO public.ai_credit_quotas (
    user_id, tier, included_credits, used_credits,
    period_start, period_end, clinic_id
  )
  VALUES (
    _user_id, _tier, _included, 0,
    _period_start, _period_end, _clinic_id
  )
  ON CONFLICT (user_id, period_start) DO UPDATE
    SET tier = EXCLUDED.tier,
        included_credits = EXCLUDED.included_credits,
        clinic_id = EXCLUDED.clinic_id
  RETURNING * INTO _row;

  UPDATE public.ai_credit_quotas q
     SET used_credits = COALESCE((
           SELECT SUM(credits_used)::int
             FROM public.ai_credit_usage u
            WHERE u.user_id = _user_id
              AND u.created_at >= _period_start
              AND u.created_at <  _period_end
              AND COALESCE(u.was_bypassed, false) = false
         ), 0)
   WHERE q.id = _row.id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_credit_status(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _tier text;
  _is_partner boolean := false;
  _unlimited boolean := false;
  _included integer;
  _used integer := 0;
  _purchased integer := 0;
  _period_start timestamptz := date_trunc('month', now());
  _period_end   timestamptz := date_trunc('month', now()) + interval '1 month';
  _clinic_id uuid;
  _clinic_tier text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('tier','unknown','unlimited',false,'included',0,'used',0,'purchased',0,'pct',0);
  END IF;

  _tier := public.get_user_ai_tier(_user_id);

  SELECT COALESCE(is_partner, false) INTO _is_partner
    FROM public.professionals WHERE user_id = _user_id LIMIT 1;

  _unlimited := (_tier = 'unlimited') OR COALESCE(_is_partner, false);

  _included := public.get_included_credits_for_tier(_tier);

  SELECT COALESCE(SUM(credits_used)::int, 0) INTO _used
    FROM public.ai_credit_usage
   WHERE user_id = _user_id
     AND created_at >= _period_start
     AND created_at <  _period_end
     AND COALESCE(was_bypassed, false) = false;

  SELECT COALESCE(SUM(credits_remaining)::int, 0) INTO _purchased
    FROM public.ai_credit_packages
   WHERE user_id = _user_id
     AND credits_remaining > 0
     AND expires_at > now();

  SELECT cm.clinic_id, c.subscription_tier
    INTO _clinic_id, _clinic_tier
    FROM public.clinic_members cm
    JOIN public.clinics c ON c.id = cm.clinic_id
    WHERE cm.user_id = _user_id
      AND c.subscription_status IN ('active','trialing')
    LIMIT 1;

  RETURN jsonb_build_object(
    'tier', _tier,
    'is_partner', _is_partner,
    'unlimited', _unlimited,
    'included', _included,
    'used', _used,
    'purchased', _purchased,
    'pct', CASE WHEN _included > 0 THEN LEAST(100, ROUND((_used::numeric / _included) * 100))::int ELSE 0 END,
    'period_start', _period_start,
    'period_end', _period_end,
    'clinic_id', _clinic_id,
    'clinic_tier', _clinic_tier
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_included_credits_for_tier(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.ensure_current_credit_quota(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_credit_status(uuid) TO authenticated, service_role;