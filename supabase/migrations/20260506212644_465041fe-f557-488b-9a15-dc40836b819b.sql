-- Update existing partner clinics (mark as Enterprise) based on is_partner_account
UPDATE public.clinics c
SET max_members = 9999
FROM public.professionals p
WHERE c.owner_user_id = p.user_id
  AND (p.is_partner_account = true OR p.is_partner = true)
  AND c.max_members < 9999;

-- Replace trigger to also consider is_partner_account (permanent partner flag)
CREATE OR REPLACE FUNCTION public.set_partner_clinic_unlimited()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.professionals
    WHERE user_id = NEW.owner_user_id
      AND (is_partner = true OR is_partner_account = true)
  ) THEN
    NEW.max_members := 9999;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_partner_clinic_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.is_partner = true OR NEW.is_partner_account = true)
     AND (
       (OLD.is_partner IS DISTINCT FROM NEW.is_partner AND NEW.is_partner = true)
       OR (OLD.is_partner_account IS DISTINCT FROM NEW.is_partner_account AND NEW.is_partner_account = true)
     ) THEN
    UPDATE public.clinics
    SET max_members = 9999
    WHERE owner_user_id = NEW.user_id AND max_members < 9999;
  END IF;
  RETURN NEW;
END;
$function$;