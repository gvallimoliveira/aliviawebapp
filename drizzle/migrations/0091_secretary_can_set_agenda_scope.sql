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
     AND COALESCE(public.get_clinic_role(auth.uid(), OLD.clinic_id)::text, '') NOT IN ('owner','admin','secretary') THEN
    RAISE EXCEPTION 'Only the clinic owner, admin or secretary can change agenda visibility' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL
     AND COALESCE(public.get_clinic_role(auth.uid(), NEW.clinic_id)::text, '') NOT IN ('owner','admin','secretary') THEN
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