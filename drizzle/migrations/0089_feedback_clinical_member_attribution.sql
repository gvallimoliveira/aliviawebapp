ALTER TABLE public.clinic_feedback_surveys ADD COLUMN clinician_member_id uuid REFERENCES public.clinic_members(id) ON DELETE SET NULL, ADD COLUMN clinician_name text;
CREATE FUNCTION public.get_feedback_clinicians(_clinic_id uuid) RETURNS TABLE(member_id uuid, full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT cm.id, COALESCE(NULLIF(pr.full_name,''),NULLIF(p.full_name,''),'Profissional') FROM public.clinic_members cm LEFT JOIN public.professionals pr ON pr.user_id=cm.user_id LEFT JOIN public.profiles p ON p.user_id=cm.user_id WHERE cm.clinic_id=_clinic_id AND cm.status='active' AND cm.role IN ('therapist','osteopath','pilates_instructor','doctor','rpg_specialist','massage_therapist','intern') AND public.is_clinic_member(auth.uid(),_clinic_id) ORDER BY 2;
$$;
REVOKE ALL ON FUNCTION public.get_feedback_clinicians(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.get_feedback_clinicians(uuid) TO authenticated,service_role;
CREATE FUNCTION public.get_feedback_clinician_name(_clinic_id uuid,_member_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT COALESCE(NULLIF(pr.full_name,''),NULLIF(p.full_name,''),'Profissional') FROM public.clinic_members cm LEFT JOIN public.professionals pr ON pr.user_id=cm.user_id LEFT JOIN public.profiles p ON p.user_id=cm.user_id WHERE cm.id=_member_id AND cm.clinic_id=_clinic_id AND cm.status='active' AND cm.role IN ('therapist','osteopath','pilates_instructor','doctor','rpg_specialist','massage_therapist','intern');
$$;
REVOKE ALL ON FUNCTION public.get_feedback_clinician_name(uuid,uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_feedback_clinician_name(uuid,uuid) TO anon,authenticated,service_role;
CREATE FUNCTION public.validate_feedback_clinician() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.clinician_member_id IS NOT DISTINCT FROM OLD.clinician_member_id AND NEW.clinic_id IS NOT DISTINCT FROM OLD.clinic_id THEN NEW.clinician_name := OLD.clinician_name; RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.clinician_member_id IS NULL THEN NEW.clinician_name := OLD.clinician_name; RETURN NEW; END IF;
 IF NEW.clinician_member_id IS NOT NULL THEN
 NEW.clinician_name := public.get_feedback_clinician_name(NEW.clinic_id,NEW.clinician_member_id);
 IF NEW.clinician_name IS NULL THEN RAISE EXCEPTION 'Profissional não está ativo na equipe clínica selecionada' USING ERRCODE='23514'; END IF;
 ELSE NEW.clinician_name := NULL; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_feedback_clinician() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_feedback_clinician BEFORE INSERT OR UPDATE ON public.clinic_feedback_surveys FOR EACH ROW EXECUTE FUNCTION public.validate_feedback_clinician();