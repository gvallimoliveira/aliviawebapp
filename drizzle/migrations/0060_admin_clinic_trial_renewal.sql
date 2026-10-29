ALTER TABLE public.clinics ADD COLUMN trial_started_at timestamptz;
UPDATE public.clinics SET trial_started_at = created_at WHERE trial_started_at IS NULL;
COMMENT ON COLUMN public.clinics.trial_started_at IS 'Trial period anchor; creation date is preserved during administrator renewal.';
CREATE OR REPLACE FUNCTION public.renew_my_admin_clinic_trial()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE renewed boolean := false;
BEGIN
  IF auth.uid() IS DISTINCT FROM 'e428f8ef-4c84-4c6a-8fd3-7bf97ee74997'::uuid
     OR NOT public.is_admin(auth.uid()) THEN
    RETURN false;
  END IF;
  UPDATE public.clinics
  SET trial_started_at = now(), updated_at = now()
  WHERE id = '313d8038-7e53-435a-8254-832424fb4ae3'::uuid
    AND owner_user_id = auth.uid()
    AND subscription_status = 'trialing'
    AND subscription_stripe_id IS NULL
    AND COALESCE(trial_started_at, created_at) + interval '15 days' <= now();
  renewed := FOUND;
  RETURN renewed;
END;
$$;
REVOKE ALL ON FUNCTION public.renew_my_admin_clinic_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renew_my_admin_clinic_trial() TO authenticated;
