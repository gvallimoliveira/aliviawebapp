ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS marketplace_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketplace_hidden_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_marketplace_hidden()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_service_role boolean := coalesce((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role', false);
  is_privileged boolean := is_service_role OR auth.uid() IS NULL OR public.is_admin(auth.uid());
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT is_privileged THEN
      NEW.marketplace_hidden := false;
      NEW.marketplace_hidden_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT is_privileged THEN
    -- O próprio profissional nunca altera a visibilidade definida pelo admin.
    NEW.marketplace_hidden := OLD.marketplace_hidden;
    NEW.marketplace_hidden_at := OLD.marketplace_hidden_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_marketplace_hidden_trg ON public.professionals;
CREATE TRIGGER protect_marketplace_hidden_trg
BEFORE INSERT OR UPDATE ON public.professionals
FOR EACH ROW EXECUTE FUNCTION public.protect_marketplace_hidden();

CREATE OR REPLACE FUNCTION public.admin_set_professional_marketplace_hidden(_professional_id uuid, _hidden boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF _hidden IS NULL THEN
    RAISE EXCEPTION 'hidden flag is required';
  END IF;

  UPDATE public.professionals
     SET marketplace_hidden = _hidden,
         marketplace_hidden_at = CASE WHEN _hidden THEN now() ELSE NULL END
   WHERE id = _professional_id
  RETURNING marketplace_hidden INTO _result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Professional not found';
  END IF;
  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_professional_marketplace_hidden(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_professional_marketplace_hidden(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_marketplace_professionals(_state text DEFAULT NULL::text, _city text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, full_name text, crefito text, profile_photo_url text, specialties text[], bio text, clinic_name text, clinic_address text, social_media text, phone text, email text, city text, state text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, p.crefito, p.profile_photo_url, p.specialties, p.bio,
         p.clinic_name, p.clinic_address, p.social_media, p.phone, p.email, p.city, p.state
  FROM public.professionals p
  WHERE auth.uid() IS NOT NULL
    AND p.active = true
    AND p.approved = true
    AND p.marketplace_hidden = false
    AND p.active_profile_mode = 'professional'
    AND (
      (p.subscription_status = 'active' AND p.subscription_stripe_id IS NOT NULL)
      OR p.pro_access_expires_at > now()
      OR p.subscription_grace_until > now()
      OR p.is_partner = true
    )
    AND (_state IS NULL OR _state = '' OR p.state = _state)
    AND (_city IS NULL OR _city = '' OR p.city ILIKE '%' || _city || '%')
  ORDER BY p.full_name;
$function$;