CREATE OR REPLACE FUNCTION public.get_included_credits_for_tier(_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _tier
    WHEN 'pro_monthly'       THEN 60
    WHEN 'pro_annual'        THEN 72
    WHEN 'academic_monthly'  THEN 60
    WHEN 'academic_annual'   THEN 72
    WHEN 'clinic_small'      THEN 100
    WHEN 'clinic_medium'     THEN 250
    WHEN 'clinic_large'      THEN 300
    WHEN 'premium_b2c'       THEN 15
    ELSE 0
  END;
$$;