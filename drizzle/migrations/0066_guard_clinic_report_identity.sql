CREATE OR REPLACE FUNCTION public.guard_clinic_report_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.report_full_name IS DISTINCT FROM OLD.report_full_name OR NEW.council_type IS DISTINCT FROM OLD.council_type OR NEW.council_number IS DISTINCT FROM OLD.council_number THEN
  IF auth.uid() IS NOT NULL AND (NOT public.is_clinic_member(auth.uid(),OLD.clinic_id) OR NOT (OLD.user_id=auth.uid() OR public.get_clinic_role(auth.uid(),OLD.clinic_id) IN ('owner','admin'))) THEN RAISE EXCEPTION 'Not authorized to edit report identity' USING ERRCODE='42501'; END IF;
  IF NEW.clinic_id IS DISTINCT FROM OLD.clinic_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Report identity cannot move between members' USING ERRCODE='42501'; END IF;
  IF NEW.report_full_name IS NOT NULL AND (length(trim(NEW.report_full_name))<3 OR length(NEW.report_full_name)>160) THEN RAISE EXCEPTION 'Invalid report name'; END IF;
  IF NEW.council_type IS NOT NULL AND NEW.council_type NOT IN ('CREFITO','CREF','CRM','OTHER') THEN RAISE EXCEPTION 'Invalid council'; END IF;
  IF (NEW.council_type IS NULL) <> (NEW.council_number IS NULL) OR NEW.council_number IN ('','0-X','0','000000') OR length(NEW.council_number)>60 THEN RAISE EXCEPTION 'Invalid council registration'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER guard_clinic_report_identity BEFORE UPDATE ON public.clinic_members FOR EACH ROW EXECUTE FUNCTION public.guard_clinic_report_identity();