CREATE OR REPLACE FUNCTION public.get_user_credit_status(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
 _tier text; _is_partner boolean:=false; _unlimited boolean:=false;
 _included integer; _per_member integer; _used numeric:=0; _personal_used numeric:=0; _purchased numeric:=0;
 _period_start timestamptz:=public.credit_period_start(); _period_end timestamptz:=public.credit_period_start()+interval '1 month';
 _clinic_id uuid; _clinic_max integer; _clinic_size text; _clinic_members integer:=0; _clinical integer:=0; _secretaries integer:=0;
 _pooled boolean:=false; _trailing numeric:=0; _last_usage timestamptz; _trial_ends timestamptz; _trial boolean:=false;
 _clinic_trial boolean:=false; _clinic_trial_start timestamptz; _clinic_cap integer;
BEGIN
 IF _user_id IS NULL THEN RETURN jsonb_build_object('tier','unknown','unlimited',false,'included',0,'used',0,'purchased',0,'pct',0); END IF;
 IF auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF auth.uid() IS NOT NULL AND auth.uid()<>_user_id AND NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Access denied'; END IF;
 _tier:=public.get_user_ai_tier(_user_id);
 SELECT COALESCE(is_partner,false),pro_trial_ends_at INTO _is_partner,_trial_ends FROM public.professionals WHERE user_id=_user_id LIMIT 1;
 _unlimited:=(_tier='unlimited'); _per_member:=public.get_included_credits_for_tier(_tier); _included:=_per_member;
 SELECT COALESCE(SUM(credits_used),0) INTO _personal_used FROM public.ai_credit_usage WHERE user_id=_user_id AND created_at>=_period_start AND created_at<_period_end AND COALESCE(was_bypassed,false)=false;
 _used:=_personal_used;
 SELECT COALESCE(SUM(credits_used),0),MAX(created_at) INTO _trailing,_last_usage FROM public.ai_credit_usage WHERE user_id=_user_id AND created_at>=now()-interval '30 days' AND COALESCE(was_bypassed,false)=false;
 SELECT COALESCE(SUM(remaining_units),0) INTO _purchased FROM public.ai_credit_packages WHERE user_id=_user_id AND clinic_id IS NULL AND remaining_units>0 AND expires_at>now();
 SELECT cm.clinic_id,c.max_members INTO _clinic_id,_clinic_max FROM public.clinic_members cm JOIN public.clinics c ON c.id=cm.clinic_id WHERE cm.user_id=_user_id AND cm.status='active' AND c.subscription_status IN ('active','trialing') ORDER BY cm.created_at,cm.clinic_id LIMIT 1;
 _clinic_size:=CASE WHEN _clinic_id IS NULL THEN NULL WHEN COALESCE(_clinic_max,3)<=3 THEN 'small' WHEN _clinic_max<=8 THEN 'medium' ELSE 'large' END;
 IF _clinic_id IS NOT NULL AND _tier LIKE 'clinic_%' THEN
  SELECT COUNT(*) FILTER(WHERE role<>'secretary')::int,COUNT(*) FILTER(WHERE role='secretary')::int INTO _clinical,_secretaries FROM public.clinic_members WHERE clinic_id=_clinic_id AND status='active';
  _clinic_members:=_clinical+_secretaries; _included:=_per_member; _pooled:=true;
  SELECT COALESCE(SUM(remaining_units),0) INTO _purchased FROM public.ai_credit_packages WHERE clinic_id=_clinic_id AND remaining_units>0 AND expires_at>now();
  SELECT COALESCE(SUM(credits_used),0) INTO _used FROM public.ai_credit_usage WHERE clinic_id=_clinic_id AND created_at>=_period_start AND created_at<_period_end AND COALESCE(was_bypassed,false)=false;
  SELECT COALESCE(SUM(credits_used),0),MAX(created_at) INTO _trailing,_last_usage FROM public.ai_credit_usage WHERE clinic_id=_clinic_id AND created_at>=now()-interval '30 days' AND COALESCE(was_bypassed,false)=false;
  -- Teste grátis da clínica (sem assinatura Stripe): franquia fixa compartilhada desde o início do teste.
  SELECT (c.subscription_status='trialing' AND c.subscription_stripe_id IS NULL), COALESCE(c.trial_started_at,c.created_at), LEAST(COALESCE(c.trial_credits_cap,20),20)
    INTO _clinic_trial,_clinic_trial_start,_clinic_cap FROM public.clinics c WHERE c.id=_clinic_id;
  IF COALESCE(_clinic_trial,false) THEN
   _included:=_clinic_cap; _per_member:=_included;
   SELECT COALESCE(SUM(credits_used),0) INTO _used FROM public.ai_credit_usage WHERE clinic_id=_clinic_id AND created_at>=_clinic_trial_start AND COALESCE(was_bypassed,false)=false;
  END IF;
 END IF;
 _clinic_trial:=COALESCE(_clinic_trial,false);
 -- Teste PRO de 7 dias: franquia fixa de 5 créditos, nunca em clínica nem ilimitado.
 _trial:=NOT _pooled AND NOT _unlimited AND NOT COALESCE(_is_partner,false) AND _trial_ends IS NOT NULL AND _trial_ends>now() AND (_tier LIKE 'pro_%' OR _tier LIKE 'academic_%');
 IF _trial THEN
  _included:=LEAST(_included,5); _per_member:=_included;
  SELECT COALESCE(SUM(credits_used),0) INTO _used FROM public.ai_credit_usage WHERE user_id=_user_id AND created_at>=_trial_ends-interval '7 days' AND COALESCE(was_bypassed,false)=false;
  _personal_used:=_used;
 END IF;
 RETURN jsonb_build_object('trial',_trial OR _clinic_trial,'clinic_trial',_clinic_trial,'trial_ends_at',CASE WHEN _trial THEN _trial_ends WHEN _clinic_trial THEN _clinic_trial_start+interval '15 days' ELSE NULL END,'tier',_tier,'is_partner',_is_partner,'unlimited',_unlimited,'included',_included,'per_member',CASE WHEN _pooled THEN NULL ELSE _per_member END,'pooled',_pooled,'clinic_members',_clinic_members,'clinical_members',_clinical,'secretary_members',_secretaries,'used',ROUND(_used,2),'personal_used',ROUND(_personal_used,2),'purchased',_purchased,'pct',CASE WHEN _included>0 THEN LEAST(100,ROUND((_used/_included)*100))::int ELSE 0 END,'period_start',_period_start,'period_end',_period_end,'timezone','America/Sao_Paulo','trailing_30d_used',ROUND(_trailing,2),'last_usage_at',_last_usage,'clinic_id',CASE WHEN _pooled THEN _clinic_id ELSE NULL END,'clinic_size',_clinic_size,'grace_ratio',CASE WHEN _trial OR _clinic_trial THEN 1 ELSE public.ai_credit_grace_ratio(_tier) END,'hard_enabled',_trial OR _clinic_trial OR (EXISTS(SELECT 1 FROM public.app_config WHERE key='ai_credits_enforced' AND value='true'::jsonb) AND EXISTS(SELECT 1 FROM public.app_config WHERE key='ai_credits_enforced_tiers' AND value ? _tier)),'can_buy',NOT _pooled OR EXISTS(SELECT 1 FROM public.clinic_members WHERE clinic_id=_clinic_id AND user_id=_user_id AND status='active' AND role IN ('owner','admin')));
END $function$
;
REVOKE EXECUTE ON FUNCTION public.studio_credit_status_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studio_credit_status_for(uuid) TO service_role;
