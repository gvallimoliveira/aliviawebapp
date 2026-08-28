CREATE OR REPLACE FUNCTION public.consume_studio_generation(p_amount integer DEFAULT 6)
RETURNS TABLE(allowed boolean, plan text, unlimited boolean, allowance integer, used_this_period integer, remaining integer, generations_left integer, period_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF s.remaining <= 0 THEN
    RETURN QUERY SELECT false, s.plan, false, s.allowance, s.used_this_period, s.remaining, s.generations_left, s.period_start;
    RETURN;
  END IF;

  v_amount := least(v_amount, s.remaining);

  UPDATE public.studio_credits AS sc
     SET used_this_period = coalesce(sc.used_this_period, 0) + v_amount,
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
    GREATEST((s.allowance - v_used) / s.batch_size, 0),
    s.period_start;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_studio_generation(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_studio_generation(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_studio_generation(integer) TO service_role;
NOTIFY pgrst, 'reload schema';