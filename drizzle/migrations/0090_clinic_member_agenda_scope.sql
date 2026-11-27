ALTER TABLE public.clinic_members
  ADD COLUMN IF NOT EXISTS agenda_scope text NOT NULL DEFAULT 'clinic',
  ADD COLUMN IF NOT EXISTS agenda_services text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.clinic_members.agenda_scope IS 'Agenda visibility for clinical roles: own | services | clinic. Managers (owner/admin/secretary) always see everything.';
COMMENT ON COLUMN public.clinic_members.agenda_services IS 'Service keys visible when agenda_scope = services: a service_type or svc:<care_services.id> for custom catalog services.';

CREATE OR REPLACE FUNCTION public.guard_clinic_member_agenda_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _k text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.agenda_scope IS NOT DISTINCT FROM OLD.agenda_scope
     AND NEW.agenda_services IS NOT DISTINCT FROM OLD.agenda_services THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL
     AND COALESCE(public.get_clinic_role(auth.uid(), OLD.clinic_id)::text, '') NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'Only the clinic owner or admin can change agenda visibility' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL
     AND COALESCE(public.get_clinic_role(auth.uid(), NEW.clinic_id)::text, '') NOT IN ('owner','admin') THEN
    NEW.agenda_scope := 'clinic';
    NEW.agenda_services := '{}'::text[];
  END IF;
  IF NEW.agenda_scope NOT IN ('own','services','clinic') THEN
    RAISE EXCEPTION 'Invalid agenda scope';
  END IF;
  NEW.agenda_services := COALESCE(NEW.agenda_services, '{}'::text[]);
  IF cardinality(NEW.agenda_services) > 60 THEN
    RAISE EXCEPTION 'Too many agenda services';
  END IF;
  FOREACH _k IN ARRAY NEW.agenda_services LOOP
    IF _k = 'compromisso' OR _k !~ '^([a-z_]{2,40}|svc:[0-9a-f-]{36})$' THEN
      RAISE EXCEPTION 'Invalid agenda service key';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_clinic_member_agenda_scope ON public.clinic_members;
CREATE TRIGGER guard_clinic_member_agenda_scope
BEFORE INSERT OR UPDATE ON public.clinic_members
FOR EACH ROW EXECUTE FUNCTION public.guard_clinic_member_agenda_scope();

CREATE OR REPLACE FUNCTION public.can_view_clinic_appointment(
  _user_id uuid, _clinic_id uuid, _professional_id uuid, _service_type text, _service_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members m
    WHERE m.user_id = _user_id AND m.clinic_id = _clinic_id AND m.status = 'active'
      AND (
        m.role IN ('owner','admin','secretary')
        OR m.agenda_scope = 'clinic'
        OR (_professional_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.professionals p
              WHERE p.id = _professional_id AND p.user_id = _user_id))
        OR (m.agenda_scope = 'services'
            AND COALESCE(_service_type, '') <> 'compromisso'
            AND (CASE WHEN _service_type = 'personalizado' AND _service_id IS NOT NULL
                      THEN 'svc:' || _service_id::text
                      ELSE COALESCE(NULLIF(_service_type, ''), 'fisioterapia') END) = ANY (m.agenda_services))
      )
  )
$function$;

REVOKE ALL ON FUNCTION public.can_view_clinic_appointment(uuid, uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_clinic_appointment(uuid, uuid, uuid, text, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Clinic members can view clinic appointments" ON public.professional_appointments;
CREATE POLICY "Clinic members can view clinic appointments"
ON public.professional_appointments FOR SELECT
TO authenticated
USING (
  clinic_id IS NOT NULL
  AND public.can_view_clinic_appointment(auth.uid(), clinic_id, professional_id, service_type, service_id)
);