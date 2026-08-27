-- Cota mensal por plano do Studio público (artes por período).
CREATE OR REPLACE FUNCTION public.studio_plan_allowance(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(p_plan, 'free'))
    WHEN 'solo' THEN 60
    WHEN 'marca' THEN 200
    WHEN 'agencia' THEN 800
    ELSE 5
  END
$$;

-- Estado da cota do usuário logado (sem consumir nada).
CREATE OR REPLACE FUNCTION public.studio_credit_status()
RETURNS TABLE (
  plan text,
  unlimited boolean,
  batch_size integer,
  allowance integer,
  used_this_period integer,
  remaining integer,
  generations_left integer,
  period_start date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.studio_credits;
  v_plan text;
  v_email text := lower(coalesce((auth.jwt() ->> 'email'), ''));
  v_unlimited boolean;
  v_allow integer;
  v_batch integer := 6;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.studio_credits (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v FROM public.studio_credits WHERE user_id = auth.uid();

  -- Período de 30 dias: zera o consumo quando vira o ciclo.
  IF v.period_start IS NULL OR v.period_start <= (current_date - INTERVAL '30 days') THEN
    UPDATE public.studio_credits
       SET used_this_period = 0, period_start = current_date, updated_at = now()
     WHERE user_id = auth.uid()
     RETURNING * INTO v;
  END IF;

  v_unlimited := public.is_studio_vip();
  v_plan := lower(coalesce(v.plan, 'free'));

  -- Acesso cortesia concedido por um VIP entra como Solo.
  IF NOT v_unlimited AND v_plan = 'free' AND EXISTS (
    SELECT 1 FROM public.studio_granted_access g
     WHERE lower(g.email) = v_email AND g.revoked_at IS NULL
  ) THEN
    v_plan := 'solo';
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
$$;

-- Consome uma geração (lote de artes) e devolve o novo estado da cota.
CREATE OR REPLACE FUNCTION public.consume_studio_generation(p_amount integer DEFAULT 6)
RETURNS TABLE (
  allowed boolean,
  plan text,
  unlimited boolean,
  allowance integer,
  used_this_period integer,
  remaining integer,
  generations_left integer,
  period_start date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  v_amount integer := GREATEST(least(coalesce(p_amount, 6), 24), 1);
  v_used integer;
BEGIN
  SELECT * INTO s FROM public.studio_credit_status();

  IF s.unlimited THEN
    RETURN QUERY SELECT true, s.plan, true, s.allowance, s.used_this_period, s.remaining, s.generations_left, s.period_start;
    RETURN;
  END IF;

  IF s.remaining < v_amount THEN
    RETURN QUERY SELECT false, s.plan, false, s.allowance, s.used_this_period, s.remaining, s.generations_left, s.period_start;
    RETURN;
  END IF;

  UPDATE public.studio_credits
     SET used_this_period = coalesce(used_this_period, 0) + v_amount, updated_at = now()
   WHERE user_id = auth.uid()
   RETURNING used_this_period INTO v_used;

  RETURN QUERY SELECT
    true,
    s.plan,
    false,
    s.allowance,
    v_used,
    GREATEST(s.allowance - v_used, 0),
    GREATEST((s.allowance - v_used) / s.batch_size, 0),
    s.period_start;
END;
$$;

REVOKE ALL ON FUNCTION public.studio_plan_allowance(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.studio_credit_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_studio_generation(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studio_credit_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_studio_generation(integer) TO authenticated;