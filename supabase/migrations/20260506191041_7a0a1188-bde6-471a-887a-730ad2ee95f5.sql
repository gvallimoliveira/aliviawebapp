-- Set unlimited (enterprise) member capacity for clinics owned by partners
UPDATE public.clinics c
SET max_members = 9999
WHERE EXISTS (
  SELECT 1 FROM public.professionals p
  WHERE p.user_id = c.owner_user_id AND p.is_partner = true
);

-- Trigger: when a new clinic is created by a partner, give enterprise capacity
CREATE OR REPLACE FUNCTION public.set_partner_clinic_unlimited()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.professionals
    WHERE user_id = NEW.owner_user_id AND is_partner = true
  ) THEN
    NEW.max_members := 9999;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_clinic_unlimited ON public.clinics;
CREATE TRIGGER trg_partner_clinic_unlimited
BEFORE INSERT ON public.clinics
FOR EACH ROW
EXECUTE FUNCTION public.set_partner_clinic_unlimited();

-- Trigger: when a professional becomes a partner, upgrade their clinic(s) too
CREATE OR REPLACE FUNCTION public.sync_partner_clinic_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_partner = true AND (OLD.is_partner IS DISTINCT FROM true) THEN
    UPDATE public.clinics
    SET max_members = 9999
    WHERE owner_user_id = NEW.user_id AND max_members < 9999;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_partner_clinic_capacity ON public.professionals;
CREATE TRIGGER trg_sync_partner_clinic_capacity
AFTER INSERT OR UPDATE OF is_partner ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.sync_partner_clinic_capacity();