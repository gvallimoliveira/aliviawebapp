CREATE OR REPLACE FUNCTION public.studio_credit_status()
RETURNS TABLE(plan text, unlimited boolean, batch_size integer, allowance integer, used_this_period integer, remaining integer, generations_left integer, period_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v public.studio_credits;
  v_plan text;
  v_granted_plan text;
  v_email text;
  v_unlimited boolean;
  v_allow integer;
  v_batch integer := 6;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_email := lower(coalesce(nullif(auth.jwt() ->> 'email', ''), ''));
  IF v_email = '' THEN
    SELECT lower(coalesce(u.email, '')) INTO v_email
      FROM auth.users u WHERE u.id = auth.uid();
    v_email := coalesce(v_email, '');
  END IF;

  INSERT INTO public.studio_credits (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v FROM public.studio_credits WHERE user_id = auth.uid();

  IF v.period_start IS NULL OR v.period_start <= (current_date - INTERVAL '30 days') THEN
    UPDATE public.studio_credits
       SET used_this_period = 0, period_start = current_date, updated_at = now()
     WHERE user_id = auth.uid()
     RETURNING * INTO v;
  END IF;

  v_unlimited := public.is_studio_vip();
  v_plan := CASE lower(coalesce(v.plan, 'free'))
    WHEN 'solo' THEN 'solo'
    WHEN 'marca' THEN 'marca'
    WHEN 'agencia' THEN 'agencia'
    ELSE 'free'
  END;

  IF NOT v_unlimited AND v_email <> '' THEN
    SELECT CASE lower(coalesce(g.plan, 'solo'))
      WHEN 'marca' THEN 'marca'
      WHEN 'agencia' THEN 'agencia'
      ELSE 'solo'
    END
    INTO v_granted_plan
    FROM public.studio_granted_access g
    WHERE lower(g.email) = v_email
      AND g.revoked_at IS NULL
    ORDER BY CASE lower(coalesce(g.plan, 'solo'))
      WHEN 'agencia' THEN 3
      WHEN 'marca' THEN 2
      ELSE 1
    END DESC
    LIMIT 1;

    IF v_granted_plan IS NOT NULL THEN
      v_plan := v_granted_plan;
    END IF;
  END IF;

  v_allow := public.studio_plan_allowance(v_plan) + coalesce(v.extra_credits, 0);

  RETURN QUERY SELECT
    v_plan,
    v_unlimited,
    v_batch,
    v_allow,
    coalesce(v.used_this_period, 0),
    GREATEST(v_allow - coalesce(v.used_this_period, 0), 0),
    GREATEST((v_allow - coalesce(v.used_this_period, 0)) / v_batch, 0),
    v.period_start;
END;
$function$;