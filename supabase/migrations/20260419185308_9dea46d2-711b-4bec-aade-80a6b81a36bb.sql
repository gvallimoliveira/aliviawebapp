CREATE OR REPLACE FUNCTION public.get_public_professional_assessment_link(_professional_id uuid)
RETURNS TABLE (
  id uuid,
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

CREATE OR REPLACE FUNCTION public.get_patient_assessment_link_context(
  _token text,
  _professional_id uuid DEFAULT NULL,
  _clinic_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  professional_id uuid,
  clinic_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.professional_id,
    p.clinic_id
  FROM public.patients p
  WHERE p.assessment_token = _token
    AND (
      (_professional_id IS NOT NULL AND p.professional_id = _professional_id)
      OR (_clinic_id IS NOT NULL AND p.clinic_id = _clinic_id)
    )
  LIMIT 1;
$$;

DROP POLICY IF EXISTS "Anyone with token can view patient" ON public.patients;