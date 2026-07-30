CREATE OR REPLACE FUNCTION public.prevent_professional_sensitive_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_service_role boolean := (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role';
  is_admin_user boolean := public.is_admin(auth.uid());
BEGIN
  IF is_service_role OR is_admin_user THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id = auth.uid() THEN
    IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.premium_granted IS DISTINCT FROM OLD.premium_granted
       OR NEW.is_partner IS DISTINCT FROM OLD.is_partner
       OR NEW.is_partner_account IS DISTINCT FROM OLD.is_partner_account
       OR NEW.pro_access_expires_at IS DISTINCT FROM OLD.pro_access_expires_at
       OR NEW.subscription_stripe_id IS DISTINCT FROM OLD.subscription_stripe_id
       OR NEW.lifetime_treatment IS DISTINCT FROM OLD.lifetime_treatment
    THEN
      RAISE EXCEPTION 'Not allowed to modify subscription/billing fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;