CREATE OR REPLACE FUNCTION public.search_marketplace_professionals(_state text DEFAULT NULL, _city text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  full_name text,
  crefito text,
  profile_photo_url text,
  specialties text[],
  bio text,
  clinic_name text,
  clinic_address text,
  social_media text,
  phone text,
  email text,
  city text,
  state text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.crefito, p.profile_photo_url, p.specialties, p.bio,
         p.clinic_name, p.clinic_address, p.social_media, p.phone, p.email, p.city, p.state
  FROM public.professionals p
  WHERE auth.uid() IS NOT NULL
    AND p.active = true
    AND p.approved = true
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
$$;

REVOKE ALL ON FUNCTION public.search_marketplace_professionals(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_marketplace_professionals(text, text) TO authenticated;