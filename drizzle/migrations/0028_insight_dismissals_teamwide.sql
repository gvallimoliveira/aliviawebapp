-- Team-wide insight dismissals: clinic owners/admins can hide an item for the whole team
ALTER TABLE public.insight_dismissals ADD COLUMN scope_wide boolean NOT NULL DEFAULT false;

-- Clinic members can read team-wide dismissals of their clinic (personal rows already covered by the existing FOR ALL policy)
CREATE POLICY "Clinic members read team-wide dismissals"
ON public.insight_dismissals FOR SELECT TO authenticated
USING (scope_wide AND public.is_clinic_member(auth.uid(), scope_key::uuid));

-- Only clinic owners/admins can create team-wide dismissals
CREATE POLICY "Clinic owners and admins insert team-wide dismissals"
ON public.insight_dismissals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND scope_wide AND public.get_clinic_role(auth.uid(), scope_key::uuid) IN ('owner'::clinic_role, 'admin'::clinic_role));

-- Only clinic owners/admins can delete team-wide dismissals
CREATE POLICY "Clinic owners and admins delete team-wide dismissals"
ON public.insight_dismissals FOR DELETE TO authenticated
USING (scope_wide AND public.get_clinic_role(auth.uid(), scope_key::uuid) IN ('owner'::clinic_role, 'admin'::clinic_role));