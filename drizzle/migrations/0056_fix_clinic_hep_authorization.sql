CREATE OR REPLACE FUNCTION public.can_manage_hep(_professional_id uuid, _clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.professionals p WHERE p.id = _professional_id AND (
     (_clinic_id IS NULL AND p.user_id = auth.uid() AND public.has_active_pro_subscription(p.id))
     OR (_clinic_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.clinics c
       JOIN public.clinic_members actor ON actor.clinic_id = c.id AND actor.user_id = auth.uid() AND actor.status = 'active'
       JOIN public.clinic_members author ON author.clinic_id = c.id AND author.user_id = p.user_id AND author.status = 'active'
       WHERE c.id = _clinic_id AND c.subscription_status IN ('active','trialing')
       AND actor.role IN ('owner','admin','therapist','osteopath','pilates_instructor','doctor','rpg_specialist','massage_therapist','intern')
       AND author.role IN ('owner','admin','therapist','osteopath','pilates_instructor','doctor','rpg_specialist','massage_therapist','intern')
     ))
   )
 );
$$;
REVOKE ALL ON FUNCTION public.can_manage_hep(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_hep(uuid,uuid) TO authenticated,service_role;
DROP POLICY IF EXISTS "Professionals manage own programs" ON public.exercise_programs;
DROP POLICY IF EXISTS "Professionals can delete their programs" ON public.exercise_programs;
CREATE POLICY "Scoped clinicians manage programs" ON public.exercise_programs FOR ALL TO authenticated
USING (public.can_manage_hep(professional_id,clinic_id)) WITH CHECK (public.can_manage_hep(professional_id,clinic_id));
DROP POLICY IF EXISTS "Professionals manage own program items" ON public.exercise_program_items;
DROP POLICY IF EXISTS "Professionals can delete their program items" ON public.exercise_program_items;
CREATE POLICY "Scoped clinicians manage program items" ON public.exercise_program_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.exercise_programs ep WHERE ep.id=program_id AND public.can_manage_hep(ep.professional_id,ep.clinic_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.exercise_programs ep WHERE ep.id=program_id AND public.can_manage_hep(ep.professional_id,ep.clinic_id)));
CREATE OR REPLACE FUNCTION public.can_read_exercise_program(_program_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.exercise_programs ep JOIN public.professionals p ON p.id=ep.professional_id
 WHERE ep.id=_program_id AND (
   (ep.clinic_id IS NULL AND p.user_id=auth.uid())
   OR (ep.clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(),ep.clinic_id))
   OR EXISTS (SELECT 1 FROM public.get_my_active_exercise_programs() g WHERE g.program_id=ep.id)
 ));
$$;
REVOKE ALL ON FUNCTION public.can_read_exercise_program(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_exercise_program(uuid) TO authenticated,service_role;