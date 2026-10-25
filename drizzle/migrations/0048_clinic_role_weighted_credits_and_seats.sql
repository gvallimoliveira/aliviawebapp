CREATE OR REPLACE FUNCTION public.clinic_member_credit_weight(_role clinic_role)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$ SELECT CASE WHEN _role = 'secretary' THEN 0.5 ELSE 1.0 END $$;

CREATE OR REPLACE FUNCTION public.get_user_credit_status(_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _tier text; _is_partner boolean := false; _unlimited boolean := false;
  _included integer; _per_member integer; _used numeric := 0; _personal_used numeric := 0;
  _purchased integer := 0;
  _period_start timestamptz := public.credit_period_start();
  _period_end   timestamptz := public.credit_period_start() + interval '1 month';
  _clinic_id uuid; _clinic_max integer; _clinic_size text; _clinic_members integer := 0;
  _clinical integer := 0; _secretaries integer := 0;
  _pooled boolean := false; _trailing numeric := 0; _last_usage timestamptz;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('tier','unknown','unlimited',false,'included',0,'used',0,'purchased',0,'pct',0);
  END IF;
  _tier := public.get_user_ai_tier(_user_id);
  SELECT COALESCE(is_partner, false) INTO _is_partner FROM public.professionals WHERE user_id = _user_id LIMIT 1;
  _unlimited := (_tier = 'unlimited') OR COALESCE(_is_partner, false);
  _per_member := public.get_included_credits_for_tier(_tier);
  _included := _per_member;

  SELECT COALESCE(SUM(credits_used)::numeric, 0) INTO _personal_used FROM public.ai_credit_usage
   WHERE user_id = _user_id AND created_at >= _period_start AND created_at < _period_end AND COALESCE(was_bypassed, false) = false;
  _used := _personal_used;

  SELECT COALESCE(SUM(credits_used)::numeric, 0), MAX(created_at) INTO _trailing, _last_usage FROM public.ai_credit_usage
   WHERE user_id = _user_id AND created_at >= now() - interval '30 days' AND COALESCE(was_bypassed, false) = false;

  SELECT COALESCE(SUM(credits_remaining)::int, 0) INTO _purchased FROM public.ai_credit_packages
   WHERE user_id = _user_id AND credits_remaining > 0 AND expires_at > now();

  SELECT cm.clinic_id, c.max_members INTO _clinic_id, _clinic_max
    FROM public.clinic_members cm JOIN public.clinics c ON c.id = cm.clinic_id
   WHERE cm.user_id = _user_id AND c.subscription_status IN ('active','trialing') LIMIT 1;

  _clinic_size := CASE WHEN _clinic_id IS NULL THEN NULL
    WHEN COALESCE(_clinic_max, 3) <= 3 THEN 'small' WHEN COALESCE(_clinic_max, 3) <= 8 THEN 'medium' ELSE 'large' END;

  IF _clinic_id IS NOT NULL AND _tier LIKE 'clinic_%' THEN
    SELECT COUNT(*) FILTER (WHERE role <> 'secretary')::int, COUNT(*) FILTER (WHERE role = 'secretary')::int
      INTO _clinical, _secretaries FROM public.clinic_members WHERE clinic_id = _clinic_id;
    _clinic_members := COALESCE(_clinical,0) + COALESCE(_secretaries,0);
    -- Clinical roles add 100% of the per-member quota; secretaries add 50%.
    _included := GREATEST(ROUND(_per_member * (COALESCE(_clinical,0) + 0.5 * COALESCE(_secretaries,0)))::int, _per_member);
    _pooled := true;

    SELECT COALESCE(SUM(u.credits_used)::numeric, 0) INTO _used FROM public.ai_credit_usage u
      JOIN public.clinic_members cm2 ON cm2.user_id = u.user_id
     WHERE cm2.clinic_id = _clinic_id AND u.created_at >= _period_start AND u.created_at < _period_end AND COALESCE(u.was_bypassed, false) = false;
    SELECT COALESCE(SUM(u.credits_used)::numeric, 0), MAX(u.created_at) INTO _trailing, _last_usage FROM public.ai_credit_usage u
      JOIN public.clinic_members cm3 ON cm3.user_id = u.user_id
     WHERE cm3.clinic_id = _clinic_id AND u.created_at >= now() - interval '30 days' AND COALESCE(u.was_bypassed, false) = false;
  END IF;

  RETURN jsonb_build_object('tier', _tier, 'is_partner', _is_partner, 'unlimited', _unlimited,
    'included', _included, 'per_member', _per_member, 'pooled', _pooled,
    'clinic_members', _clinic_members, 'clinical_members', _clinical, 'secretary_members', _secretaries,
    'used', ROUND(_used, 2), 'personal_used', ROUND(_personal_used, 2), 'purchased', _purchased,
    'pct', CASE WHEN _included > 0 THEN LEAST(100, ROUND((_used / _included) * 100))::int ELSE 0 END,
    'period_start', _period_start, 'period_end', _period_end, 'timezone', 'America/Sao_Paulo',
    'trailing_30d_used', ROUND(_trailing, 2), 'last_usage_at', _last_usage,
    'clinic_id', _clinic_id, 'clinic_size', _clinic_size);
END;
$function$;

-- Seats: max_members counts clinical seats; one secretary seat is included on top.
CREATE OR REPLACE FUNCTION public.try_direct_clinic_add(_clinic_id uuid, _email text, _role clinic_role, _invited_by uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _target_user_id uuid; _max int; _used int;
BEGIN
  IF NOT can_manage_clinic(_invited_by, _clinic_id) THEN RAISE EXCEPTION 'Not authorized to manage this clinic'; END IF;
  SELECT max_members INTO _max FROM public.clinics WHERE id = _clinic_id;
  IF COALESCE(_max, 3) < 9999 THEN
    SELECT (SELECT count(*) FROM public.clinic_members WHERE clinic_id = _clinic_id AND status = 'active'
              AND ((_role = 'secretary') = (role = 'secretary')))
         + (SELECT count(*) FROM public.clinic_invitations WHERE clinic_id = _clinic_id
              AND ((_role = 'secretary') = (role = 'secretary')))
      INTO _used;
    IF _role = 'secretary' AND _used >= 1 THEN
      RAISE EXCEPTION 'O plano inclui 1 vaga de secretária, já ocupada.';
    ELSIF _role <> 'secretary' AND _used >= COALESCE(_max, 3) THEN
      RAISE EXCEPTION 'Limite de % vagas clínicas do plano atingido.', COALESCE(_max, 3);
    END IF;
  END IF;

  SELECT id INTO _target_user_id FROM auth.users WHERE LOWER(email) = LOWER(_email);
  IF _target_user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id = _clinic_id AND user_id = _target_user_id AND status = 'active') THEN
      RAISE EXCEPTION 'User is already a member of this clinic';
    END IF;
    INSERT INTO public.clinic_members (clinic_id, user_id, role, status, accepted_at, invited_by)
    VALUES (_clinic_id, _target_user_id, _role, 'active', now(), _invited_by) ON CONFLICT DO NOTHING;
    RETURN 'added';
  ELSE
    INSERT INTO public.clinic_invitations (clinic_id, email, role, invited_by) VALUES (_clinic_id, LOWER(_email), _role, _invited_by);
    RETURN 'invited';
  END IF;
END;
$$;