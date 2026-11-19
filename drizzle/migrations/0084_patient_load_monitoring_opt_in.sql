ALTER TABLE public.patients ADD COLUMN load_monitoring_enabled boolean NOT NULL DEFAULT false;
UPDATE public.patients p SET load_monitoring_enabled = true WHERE EXISTS (SELECT 1 FROM public.periodization_plans x WHERE x.patient_id=p.id) OR EXISTS (SELECT 1 FROM public.periodization_sessions x WHERE x.patient_id=p.id) OR EXISTS (SELECT 1 FROM public.srpe_entries x WHERE x.patient_id=p.id) OR EXISTS (SELECT 1 FROM public.readiness_checkins x WHERE x.patient_id=p.id) OR EXISTS (SELECT 1 FROM public.periodization_links x WHERE x.patient_id=p.id) OR EXISTS (SELECT 1 FROM public.cardio_functional_tests x WHERE x.patient_id=p.id);
COMMENT ON COLUMN public.patients.load_monitoring_enabled IS 'Explicit record UI opt-in; false preserves clinical history and existing public links.';
CREATE OR REPLACE FUNCTION public.can_manage_patient_load(_professional_id uuid, _clinic_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND CASE WHEN _clinic_id IS NOT NULL THEN public.is_clinic_clinician(auth.uid(), _clinic_id) ELSE EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=_professional_id AND p.user_id=auth.uid() AND public.has_active_pro_subscription(p.id)) END;
$$;
REVOKE ALL ON FUNCTION public.can_manage_patient_load(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_patient_load(uuid,uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.guard_patient_load_opt_in() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF (TG_OP='INSERT' AND NEW.load_monitoring_enabled) OR (TG_OP='UPDATE' AND NEW.load_monitoring_enabled IS DISTINCT FROM OLD.load_monitoring_enabled) THEN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.can_manage_patient_load(NEW.professional_id,NEW.clinic_id) THEN RAISE EXCEPTION 'Sem permissão para alterar o controle de carga deste paciente' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER guard_patient_load_opt_in BEFORE INSERT OR UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.guard_patient_load_opt_in();
CREATE OR REPLACE FUNCTION public.set_patient_load_monitoring(_patient_id uuid, _enabled boolean, _clinic_id uuid DEFAULT NULL, _professional_id uuid DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.patients;
BEGIN
 SELECT * INTO p FROM public.patients WHERE id=_patient_id AND clinic_id IS NOT DISTINCT FROM _clinic_id AND (_clinic_id IS NOT NULL OR professional_id=_professional_id) FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_patient_load(p.professional_id,p.clinic_id) THEN RAISE EXCEPTION 'Sem permissão para alterar o controle de carga deste paciente' USING ERRCODE='42501'; END IF;
 IF _enabled IS NULL THEN RAISE EXCEPTION 'Informe ativar ou desativar' USING ERRCODE='22004'; END IF;
 UPDATE public.patients SET load_monitoring_enabled=_enabled WHERE id=p.id;
 RETURN _enabled;
END;
$$;
REVOKE ALL ON FUNCTION public.set_patient_load_monitoring(uuid,boolean,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_patient_load_monitoring(uuid,boolean,uuid,uuid) TO authenticated,service_role;