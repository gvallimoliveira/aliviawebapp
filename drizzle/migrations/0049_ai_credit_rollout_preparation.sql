ALTER TABLE public.ai_credit_packages ADD COLUMN IF NOT EXISTS remaining_units numeric NOT NULL DEFAULT 0;
UPDATE public.ai_credit_packages SET remaining_units=credits_remaining;
ALTER TABLE public.ai_credit_usage ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);
ALTER TABLE public.ai_credit_usage ADD COLUMN IF NOT EXISTS package_debited numeric NOT NULL DEFAULT 0;
ALTER TABLE public.ai_credit_usage ADD COLUMN IF NOT EXISTS accounting_applied boolean NOT NULL DEFAULT false;
UPDATE public.ai_credit_usage u SET clinic_id=(SELECT cm.clinic_id FROM public.clinic_members cm JOIN public.clinics c ON c.id=cm.clinic_id WHERE cm.user_id=u.user_id AND cm.status='active' AND c.subscription_status IN ('active','trialing') ORDER BY cm.created_at,cm.clinic_id LIMIT 1) WHERE clinic_id IS NULL AND COALESCE(was_bypassed,false)=false;
UPDATE public.ai_credit_packages p SET clinic_id=(SELECT cm.clinic_id FROM public.clinic_members cm JOIN public.clinics c ON c.id=cm.clinic_id WHERE cm.user_id=p.user_id AND cm.status='active' AND cm.role IN ('owner','admin') AND c.subscription_status IN ('active','trialing') ORDER BY cm.created_at,cm.clinic_id LIMIT 1) WHERE clinic_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ai_credit_packages_session_unique ON public.ai_credit_packages(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.ai_credit_grace_ratio(_tier text) RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE WHEN _tier LIKE 'clinic_%' THEN 1.2 WHEN _tier IN ('pro_monthly','pro_annual','academic_monthly','academic_annual') THEN 1.1 ELSE 1 END $$;
CREATE OR REPLACE FUNCTION public.get_included_credits_for_tier(_tier text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE _tier WHEN 'partner' THEN 25 WHEN 'pro_monthly' THEN 60 WHEN 'pro_annual' THEN 72 WHEN 'academic_monthly' THEN 60 WHEN 'academic_annual' THEN 72 WHEN 'clinic_small' THEN 100 WHEN 'clinic_medium' THEN 250 WHEN 'clinic_large' THEN 300 WHEN 'premium_b2c' THEN 15 ELSE 0 END $$;
CREATE OR REPLACE FUNCTION public.get_user_ai_tier(_user_id uuid) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _email text; _prof record; _clinic record;
BEGIN
 IF auth.uid() IS NOT NULL AND auth.uid()<>_user_id AND NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Access denied'; END IF;
 SELECT email INTO _email FROM auth.users WHERE id=_user_id;
 IF _email IS NULL THEN RETURN 'unknown'; END IF;
 IF lower(_email) IN ('gvallimoliveira@gmail.com','gvallim.fisio@gmail.com') OR EXISTS(SELECT 1 FROM public.vip_users WHERE lower(email)=lower(_email)) THEN RETURN 'unlimited'; END IF;
 SELECT c.max_members INTO _clinic FROM public.clinic_members cm JOIN public.clinics c ON c.id=cm.clinic_id WHERE cm.user_id=_user_id AND cm.status='active' AND c.subscription_status IN ('active','trialing') ORDER BY cm.created_at,cm.clinic_id LIMIT 1;
 IF FOUND THEN RETURN CASE WHEN COALESCE(_clinic.max_members,3)<=3 THEN 'clinic_small' WHEN _clinic.max_members<=8 THEN 'clinic_medium' ELSE 'clinic_large' END; END IF;
 SELECT is_partner,is_partner_account,is_student,subscription_status,lifetime_treatment,premium_granted INTO _prof FROM public.professionals WHERE user_id=_user_id LIMIT 1;
 IF FOUND THEN
  IF COALESCE(_prof.is_partner,false) OR COALESCE(_prof.is_partner_account,false) THEN RETURN 'partner'; END IF;
  IF _prof.is_student THEN RETURN 'academic_monthly'; END IF;
  IF COALESCE(_prof.subscription_status,'') IN ('active','trialing') OR COALESCE(_prof.lifetime_treatment,false) OR COALESCE(_prof.premium_granted,false) THEN RETURN 'pro_monthly'; END IF;
 END IF;
 RETURN 'premium_b2c';
END $$;
CREATE OR REPLACE FUNCTION public.get_user_credit_status(_user_id uuid) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public AS $$
DECLARE
 _tier text; _is_partner boolean:=false; _unlimited boolean:=false;
 _included integer; _per_member integer; _used numeric:=0; _personal_used numeric:=0; _purchased numeric:=0;
 _period_start timestamptz:=public.credit_period_start(); _period_end timestamptz:=public.credit_period_start()+interval '1 month';
 _clinic_id uuid; _clinic_max integer; _clinic_size text; _clinic_members integer:=0; _clinical integer:=0; _secretaries integer:=0;
 _pooled boolean:=false; _trailing numeric:=0; _last_usage timestamptz;
BEGIN
 IF _user_id IS NULL THEN RETURN jsonb_build_object('tier','unknown','unlimited',false,'included',0,'used',0,'purchased',0,'pct',0); END IF;
 IF auth.uid() IS NOT NULL AND auth.uid()<>_user_id AND NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Access denied'; END IF;
 _tier:=public.get_user_ai_tier(_user_id);
 SELECT COALESCE(is_partner,false) INTO _is_partner FROM public.professionals WHERE user_id=_user_id LIMIT 1;
 _unlimited:=(_tier='unlimited'); _per_member:=public.get_included_credits_for_tier(_tier); _included:=_per_member;
 SELECT COALESCE(SUM(credits_used),0) INTO _personal_used FROM public.ai_credit_usage WHERE user_id=_user_id AND created_at>=_period_start AND created_at<_period_end AND COALESCE(was_bypassed,false)=false;
 _used:=_personal_used;
 SELECT COALESCE(SUM(credits_used),0),MAX(created_at) INTO _trailing,_last_usage FROM public.ai_credit_usage WHERE user_id=_user_id AND created_at>=now()-interval '30 days' AND COALESCE(was_bypassed,false)=false;
 SELECT COALESCE(SUM(remaining_units),0) INTO _purchased FROM public.ai_credit_packages WHERE user_id=_user_id AND clinic_id IS NULL AND remaining_units>0 AND expires_at>now();
 SELECT cm.clinic_id,c.max_members INTO _clinic_id,_clinic_max FROM public.clinic_members cm JOIN public.clinics c ON c.id=cm.clinic_id WHERE cm.user_id=_user_id AND cm.status='active' AND c.subscription_status IN ('active','trialing') ORDER BY cm.created_at,cm.clinic_id LIMIT 1;
 _clinic_size:=CASE WHEN _clinic_id IS NULL THEN NULL WHEN COALESCE(_clinic_max,3)<=3 THEN 'small' WHEN _clinic_max<=8 THEN 'medium' ELSE 'large' END;
 IF _clinic_id IS NOT NULL AND _tier LIKE 'clinic_%' THEN
  SELECT COUNT(*) FILTER(WHERE role<>'secretary')::int,COUNT(*) FILTER(WHERE role='secretary')::int INTO _clinical,_secretaries FROM public.clinic_members WHERE clinic_id=_clinic_id AND status='active';
  _clinic_members:=_clinical+_secretaries; _included:=GREATEST(ROUND(_per_member*(_clinical+0.5*_secretaries))::int,_per_member); _pooled:=true;
  SELECT COALESCE(SUM(remaining_units),0) INTO _purchased FROM public.ai_credit_packages WHERE clinic_id=_clinic_id AND remaining_units>0 AND expires_at>now();
  SELECT COALESCE(SUM(credits_used),0) INTO _used FROM public.ai_credit_usage WHERE clinic_id=_clinic_id AND created_at>=_period_start AND created_at<_period_end AND COALESCE(was_bypassed,false)=false;
  SELECT COALESCE(SUM(credits_used),0),MAX(created_at) INTO _trailing,_last_usage FROM public.ai_credit_usage WHERE clinic_id=_clinic_id AND created_at>=now()-interval '30 days' AND COALESCE(was_bypassed,false)=false;
 END IF;
 RETURN jsonb_build_object('tier',_tier,'is_partner',_is_partner,'unlimited',_unlimited,'included',_included,'per_member',_per_member,'pooled',_pooled,'clinic_members',_clinic_members,'clinical_members',_clinical,'secretary_members',_secretaries,'used',ROUND(_used,2),'personal_used',ROUND(_personal_used,2),'purchased',_purchased,'pct',CASE WHEN _included>0 THEN LEAST(100,ROUND((_used/_included)*100))::int ELSE 0 END,'period_start',_period_start,'period_end',_period_end,'timezone','America/Sao_Paulo','trailing_30d_used',ROUND(_trailing,2),'last_usage_at',_last_usage,'clinic_id',CASE WHEN _pooled THEN _clinic_id ELSE NULL END,'clinic_size',_clinic_size,'grace_ratio',public.ai_credit_grace_ratio(_tier),'hard_enabled',EXISTS(SELECT 1 FROM public.app_config WHERE key='ai_credits_enforced' AND value='true'::jsonb) AND EXISTS(SELECT 1 FROM public.app_config WHERE key='ai_credits_enforced_tiers' AND value ? _tier),'can_buy',NOT _pooled OR EXISTS(SELECT 1 FROM public.clinic_members WHERE clinic_id=_clinic_id AND user_id=_user_id AND status='active' AND role IN ('owner','admin')));
END $$;
CREATE OR REPLACE FUNCTION public.account_ai_credit_usage() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s jsonb; old_used numeric; allowance numeric; debit numeric; take numeric; p record;
BEGIN
 IF NEW.was_blocked OR NEW.was_bypassed OR NEW.user_id IS NULL OR NEW.user_id='00000000-0000-0000-0000-000000000000' THEN RETURN NEW; END IF;
 s:=public.get_user_credit_status(NEW.user_id);
 IF COALESCE((s->>'unlimited')::boolean,false) THEN NEW.was_bypassed:=true; RETURN NEW; END IF;
 NEW.clinic_id:=NULLIF(s->>'clinic_id','')::uuid;
 PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(NEW.clinic_id,NEW.user_id)::text,0));
 s:=public.get_user_credit_status(NEW.user_id); old_used:=COALESCE((s->>'used')::numeric,0); allowance:=COALESCE((s->>'included')::numeric,0)*public.ai_credit_grace_ratio(s->>'tier');
 debit:=GREATEST(0,NEW.credits_used-GREATEST(0,allowance-old_used));
 FOR p IN SELECT id,remaining_units FROM public.ai_credit_packages WHERE remaining_units>0 AND expires_at>now() AND ((NEW.clinic_id IS NOT NULL AND clinic_id=NEW.clinic_id) OR (NEW.clinic_id IS NULL AND clinic_id IS NULL AND user_id=NEW.user_id)) ORDER BY expires_at,created_at,id FOR UPDATE LOOP
  EXIT WHEN debit<=0; take:=LEAST(debit,p.remaining_units);
  UPDATE public.ai_credit_packages SET remaining_units=remaining_units-take,credits_remaining=CEIL(remaining_units-take)::integer WHERE id=p.id;
  NEW.package_debited:=NEW.package_debited+take; debit:=debit-take;
 END LOOP;
 NEW.accounting_applied:=true; RETURN NEW;
END $$;
CREATE TRIGGER account_ai_credit_usage BEFORE INSERT ON public.ai_credit_usage FOR EACH ROW EXECUTE FUNCTION public.account_ai_credit_usage();
CREATE OR REPLACE FUNCTION public.fulfill_ai_credit_package(_user_id uuid,_clinic_id uuid,_session text,_payment text,_key text,_credits integer,_price numeric) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted uuid;
BEGIN
 IF _credits<=0 OR _key NOT IN ('mini','plus','pro') THEN RAISE EXCEPTION 'Invalid package'; END IF;
 IF _clinic_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.clinic_members WHERE clinic_id=_clinic_id AND user_id=_user_id AND status='active' AND role IN ('owner','admin')) THEN RAISE EXCEPTION 'Clinic access denied'; END IF;
 INSERT INTO public.ai_credit_packages(user_id,clinic_id,package_type,credits_total,credits_remaining,remaining_units,price_paid,stripe_session_id,stripe_payment_intent_id) VALUES (_user_id,_clinic_id,_key,_credits,_credits,_credits,_price,_session,_payment) ON CONFLICT(stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING RETURNING id INTO inserted;
 IF inserted IS NULL THEN RETURN false; END IF;
 INSERT INTO public.ai_credit_transactions(user_id,clinic_id,transaction_type,product_key,amount_brl,credits_delta,stripe_session_id,notes) VALUES (_user_id,_clinic_id,'purchase','ai_credits_'||_key,_price,_credits,_session,'Pacote confirmado via Stripe');
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fulfill_ai_credit_package(uuid,uuid,text,text,text,integer,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_ai_credit_package(uuid,uuid,text,text,text,integer,numeric) TO service_role;
CREATE OR REPLACE FUNCTION public.admin_ai_credit_rollout(_enabled boolean DEFAULT NULL,_tiers jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e text;
BEGIN
 SELECT lower(email) INTO e FROM auth.users WHERE id=auth.uid();
 IF e IS NULL OR e NOT IN ('gvallimoliveira@gmail.com','gvallim.fisio@gmail.com') THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF _enabled IS NOT NULL THEN
  IF _tiers IS NULL OR jsonb_typeof(_tiers)<>'array' OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(_tiers) t WHERE t NOT IN ('partner','pro_monthly','pro_annual','academic_monthly','academic_annual','clinic_small','clinic_medium','clinic_large','premium_b2c')) THEN RAISE EXCEPTION 'Invalid categories'; END IF;
  INSERT INTO public.app_config(key,value) VALUES ('ai_credits_enforced',to_jsonb(_enabled)),('ai_credits_enforced_tiers',_tiers) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value;
 END IF;
 RETURN jsonb_build_object('enabled',COALESCE((SELECT value FROM public.app_config WHERE key='ai_credits_enforced'),'false'::jsonb),'tiers',COALESCE((SELECT value FROM public.app_config WHERE key='ai_credits_enforced_tiers'),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.admin_ai_credit_rollout(boolean,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_credit_rollout(boolean,jsonb) TO authenticated,service_role;