-- 1) Allowance agora é em GERAÇÕES por período (não em artes).
CREATE OR REPLACE FUNCTION public.studio_plan_allowance(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE lower(coalesce(p_plan, 'free'))
    WHEN 'solo' THEN 10
    WHEN 'marca' THEN 40
    WHEN 'agencia' THEN 120
    ELSE 2
  END
$function$;

-- 2) Converte o consumo do período atual: artes -> gerações (ceil(used/6)).
UPDATE public.studio_credits
   SET used_this_period = CEIL(coalesce(used_this_period, 0)::numeric / 6)::integer,
       updated_at = now()
 WHERE coalesce(used_this_period, 0) > 0;

-- 3) Status: batch_size = 1 (uma geração por clique).
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
  v_batch integer := 1;
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
    GREATEST(v_allow - coalesce(v.used_this_period, 0), 0),
    v.period_start;
END;
$function$;

-- 4) Consumo: sempre 1 geração por chamada (p_amount mantido por compatibilidade).
CREATE OR REPLACE FUNCTION public.consume_studio_generation(p_amount integer DEFAULT 1)
RETURNS TABLE(allowed boolean, plan text, unlimited boolean, allowance integer, used_this_period integer, remaining integer, generations_left integer, period_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s record;
  v_used integer;
BEGIN
  SELECT * INTO s FROM public.studio_credit_status();

  IF s.unlimited THEN
    RETURN QUERY SELECT true, s.plan, true, s.allowance, s.used_this_period, s.remaining, s.generations_left, s.period_start;
    RETURN;
  END IF;

  IF s.remaining <= 0 THEN
    RETURN QUERY SELECT false, s.plan, false, s.allowance, s.used_this_period, s.remaining, s.generations_left, s.period_start;
    RETURN;
  END IF;

  UPDATE public.studio_credits AS sc
     SET used_this_period = coalesce(sc.used_this_period, 0) + 1,
         updated_at = now()
   WHERE sc.user_id = auth.uid()
   RETURNING sc.used_this_period INTO v_used;

  RETURN QUERY SELECT
    true,
    s.plan,
    false,
    s.allowance,
    v_used,
    GREATEST(s.allowance - v_used, 0),
    GREATEST(s.allowance - v_used, 0),
    s.period_start;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.studio_credit_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_studio_generation(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.studio_plan_allowance(text) TO authenticated;
NOTIFY pgrst, 'reload schema';