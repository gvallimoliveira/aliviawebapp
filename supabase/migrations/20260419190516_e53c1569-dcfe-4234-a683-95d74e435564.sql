DROP FUNCTION IF EXISTS public.get_public_professional_assessment_link(uuid);

CREATE OR REPLACE FUNCTION public.get_public_professional_assessment_link(_professional_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  logo_url text,
  approved boolean,
  active boolean,
  has_access boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.user_id,
    p.full_name,
    p.logo_url,
    p.approved,
    p.active,
    (
      p.subscription_status = 'active'
      OR p.is_partner = true
      OR p.lifetime_treatment = true
      OR p.premium_granted = true
      OR (p.pro_access_expires_at IS NOT NULL AND p.pro_access_expires_at > now())
    ) AS has_access
  FROM public.professionals p
  WHERE p.id = _professional_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_clinic_assessment_link(_clinic_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  brand_color text,
  has_access boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.logo_url,
    c.brand_color,
    (c.subscription_status IN ('active','trialing')) AS has_access
  FROM public.clinics c
  WHERE c.id = _clinic_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_clinic_assessment_link(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_professional_assessment_link(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_patient_assessment_link_context(text, uuid, uuid) TO anon, authenticated;