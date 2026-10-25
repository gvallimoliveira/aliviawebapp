CREATE TABLE public.ai_credit_admin_roles (user_id uuid NOT NULL, role text NOT NULL DEFAULT 'admin' CHECK(role='admin'), PRIMARY KEY(user_id,role));
GRANT SELECT ON public.ai_credit_admin_roles TO authenticated;
GRANT ALL ON public.ai_credit_admin_roles TO service_role;
ALTER TABLE public.ai_credit_admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_credit_admin_role ON public.ai_credit_admin_roles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.can_admin_ai_credits(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.ai_credit_admin_roles WHERE user_id=_user_id AND role='admin') $$;
REVOKE ALL ON FUNCTION public.can_admin_ai_credits(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_admin_ai_credits(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_ai_credit_rollout(_enabled boolean DEFAULT NULL,_tiers jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.can_admin_ai_credits(auth.uid()) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF _enabled IS NOT NULL THEN
  IF _tiers IS NULL OR jsonb_typeof(_tiers)<>'array' OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(_tiers) t WHERE t NOT IN ('partner','pro_monthly','pro_annual','academic_monthly','academic_annual','clinic_small','clinic_medium','clinic_large','premium_b2c')) THEN RAISE EXCEPTION 'Invalid categories'; END IF;
  INSERT INTO public.app_config(key,value) VALUES ('ai_credits_enforced',to_jsonb(_enabled)),('ai_credits_enforced_tiers',_tiers) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value;
 END IF;
 RETURN jsonb_build_object('enabled',COALESCE((SELECT value FROM public.app_config WHERE key='ai_credits_enforced'),'false'::jsonb),'tiers',COALESCE((SELECT value FROM public.app_config WHERE key='ai_credits_enforced_tiers'),'[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.fulfill_ai_credit_package(_user_id uuid,_clinic_id uuid,_session text,_payment text,_key text,_credits integer,_price numeric) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted uuid;
BEGIN
 IF _session IS NULL OR length(_session)=0 OR NOT ((_key='mini' AND _credits=15 AND _price=29) OR (_key='plus' AND _credits=30 AND _price=59) OR (_key='pro' AND _credits=60 AND _price=89)) THEN RAISE EXCEPTION 'Invalid package'; END IF;
 IF _clinic_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.clinic_members WHERE clinic_id=_clinic_id AND user_id=_user_id AND status='active' AND role IN ('owner','admin')) THEN RAISE EXCEPTION 'Clinic access denied'; END IF;
 INSERT INTO public.ai_credit_packages(user_id,clinic_id,package_type,credits_total,credits_remaining,remaining_units,price_paid,stripe_session_id,stripe_payment_intent_id) VALUES (_user_id,_clinic_id,_key,_credits,_credits,_credits,_price,_session,_payment) ON CONFLICT(stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING RETURNING id INTO inserted;
 IF inserted IS NULL THEN RETURN false; END IF;
 INSERT INTO public.ai_credit_transactions(user_id,clinic_id,transaction_type,product_key,amount_brl,credits_delta,stripe_session_id,notes) VALUES (_user_id,_clinic_id,'purchase','ai_credits_'||_key,_price,_credits,_session,'Pacote confirmado via Stripe');
 RETURN true;
END $$;