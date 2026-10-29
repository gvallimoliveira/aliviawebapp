CREATE OR REPLACE FUNCTION public.renew_my_admin_clinic_trial()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Temporarily paused at Guilherme's request for expired-trial UI review.
  -- Restore the original implementation from 0060_admin_clinic_trial_renewal.sql when requested.
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.renew_my_admin_clinic_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renew_my_admin_clinic_trial() TO authenticated;