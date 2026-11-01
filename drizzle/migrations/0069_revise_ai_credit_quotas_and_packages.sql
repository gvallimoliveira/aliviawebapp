CREATE OR REPLACE FUNCTION public.get_included_credits_for_tier(_tier text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE _tier WHEN 'partner' THEN 25 WHEN 'pro_monthly' THEN 30 WHEN 'pro_annual' THEN 33 WHEN 'academic_monthly' THEN 20 WHEN 'academic_annual' THEN 22 WHEN 'clinic_small' THEN 80 WHEN 'clinic_medium' THEN 120 WHEN 'clinic_large' THEN 200 WHEN 'premium_b2c' THEN 15 ELSE 0 END $$;
DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.get_user_credit_status(uuid)'::regprocedure) INTO definition;
 IF position('_included:=GREATEST(ROUND(_per_member*(_clinical+0.5*_secretaries))::int,_per_member)' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected clinic quota definition'; END IF;
 definition:=replace(definition,'_included:=GREATEST(ROUND(_per_member*(_clinical+0.5*_secretaries))::int,_per_member)','_included:=_per_member');
 definition:=replace(definition,'''per_member'',_per_member','''per_member'',CASE WHEN _pooled THEN NULL ELSE _per_member END');
 EXECUTE definition;
 SELECT pg_get_functiondef('public.fulfill_ai_credit_package(uuid,uuid,text,text,text,integer,numeric)'::regprocedure) INTO definition;
 IF position('_price=29' IN definition)=0 OR position('_price=59' IN definition)=0 OR position('_price=89' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected package validation definition'; END IF;
 definition:=replace(replace(replace(definition,'_price=29','_price IN (29,39)'),'_price=59','_price IN (59,69)'),'_price=89','_price IN (89,129)');
 EXECUTE definition;
END $migration$;
COMMENT ON FUNCTION public.get_included_credits_for_tier(text) IS 'Monthly included application AI credits; clinic tiers are fixed shared pools, not per-member grants. Annual PRO/Academic bonus is 10%. Application units do not establish Lovable credit costs.';
COMMENT ON FUNCTION public.fulfill_ai_credit_package(uuid,uuid,text,text,text,integer,numeric) IS 'Service-only fulfillment. Previous prices remain accepted for already-open paid checkout sessions; Stripe webhook verifies the exact authorized price ID and amount.';