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
  _clinic_max integer;
  _clinic_size text;
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
    'clinic_size', _clinic_size
  );
END;
$$;