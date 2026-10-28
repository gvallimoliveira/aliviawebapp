CREATE OR REPLACE FUNCTION public.is_active_clinic_clinician_anywhere(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members m JOIN public.clinics c ON c.id = m.clinic_id
    WHERE m.user_id = _user_id AND m.status = 'active'
      AND c.subscription_status IN ('active','trialing')
      AND m.role IN ('owner','admin','therapist','osteopath','pilates_instructor','doctor','rpg_specialist','massage_therapist','intern'));
$$;
REVOKE ALL ON FUNCTION public.is_active_clinic_clinician_anywhere(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_clinic_clinician_anywhere(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Professionals can view their referrals" ON public.professional_referrals;
DROP POLICY IF EXISTS "Professionals can update referral status" ON public.professional_referrals;
DROP POLICY IF EXISTS "Professionals can delete their referrals" ON public.professional_referrals;
CREATE POLICY "Professionals can view their referrals" ON public.professional_referrals FOR SELECT TO authenticated
USING (professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
  AND (public.has_active_pro_subscription(p.id) OR public.is_active_clinic_clinician_anywhere(auth.uid()))));
CREATE POLICY "Professionals can update referral status" ON public.professional_referrals FOR UPDATE TO authenticated
USING (professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
  AND (public.has_active_pro_subscription(p.id) OR public.is_active_clinic_clinician_anywhere(auth.uid()))));
CREATE POLICY "Professionals can delete their referrals" ON public.professional_referrals FOR DELETE TO authenticated
USING (professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
  AND (public.has_active_pro_subscription(p.id) OR public.is_active_clinic_clinician_anywhere(auth.uid()))));