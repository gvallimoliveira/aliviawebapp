DROP TRIGGER IF EXISTS trg_notify_admin_new_assessment ON public.assessments;

CREATE OR REPLACE FUNCTION public.notify_admin_new_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only alert when the assessment is actually finished by the patient.
  IF COALESCE(NEW.status, '') <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') = 'completed' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/notify-admin',
    headers := '{"Content-Type":"application/json","x-internal-secret":"942c090a315e1c4a1c79b558fd601e4721f1857065b259b9"}'::jsonb,
    body := jsonb_build_object(
      'action', 'alert',
      'event_type', 'new_assessment',
      'title', '🩺 Nova avaliação concluída',
      'ref', NEW.id::text,
      'fields', jsonb_build_object(
        'Paciente', COALESCE(NEW.patient_name, NEW.patient_email, '—'),
        'Tipo', COALESCE(NEW.type, '—'),
        'Status', COALESCE(NEW.status, '—'),
        'Origem', CASE WHEN NEW.clinic_id IS NOT NULL THEN 'Clínica'
                       WHEN NEW.professional_id IS NOT NULL THEN 'Profissional'
                       ELSE 'Paciente' END
      ),
      'url', 'https://aliviawebapp.com.br/admin'
    )
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_admin_new_assessment
AFTER INSERT OR UPDATE OF status ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_assessment();