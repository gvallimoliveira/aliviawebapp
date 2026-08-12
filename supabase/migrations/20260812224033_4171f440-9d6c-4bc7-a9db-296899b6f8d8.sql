CREATE OR REPLACE FUNCTION public.admin_list_patient_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  signup_origin text,
  basic_count bigint,
  premium_count bigint,
  paid_premium boolean,
  granted_premium boolean,
  last_assessment_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    u.email::text,
    p.created_at,
    p.signup_origin,
    COALESCE(a.basic_count, 0) AS basic_count,
    COALESCE(a.premium_count, 0) AS premium_count,
    COALESCE(a.paid_premium, false) AS paid_premium,
    (gp.email IS NOT NULL) AS granted_premium,
    a.last_assessment_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT
      count(*) FILTER (WHERE asm.type = 'basic') AS basic_count,
      count(*) FILTER (WHERE asm.type = 'premium') AS premium_count,
      bool_or(asm.type = 'premium' AND asm.payment_status IN ('paid','treatment_paid')) AS paid_premium,
      max(asm.created_at) AS last_assessment_at
    FROM public.assessments asm
    WHERE asm.user_id = p.user_id
      AND asm.professional_id IS NULL
      AND asm.clinic_id IS NULL
  ) a ON true
  LEFT JOIN public.granted_premium_users gp ON lower(gp.email) = lower(u.email::text)
  WHERE NOT EXISTS (
      SELECT 1 FROM public.professionals pr WHERE pr.user_id = p.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.clinic_members cm WHERE cm.user_id = p.user_id AND cm.status = 'active'
    )
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_patient_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_patient_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_patient_users() TO service_role;