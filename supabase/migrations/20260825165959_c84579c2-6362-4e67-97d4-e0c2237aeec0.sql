-- 1. Admin alert: explicit body with patient name (jsonb reorders field keys,
-- so the push body was showing "Tipo: ..." instead of the patient name)
CREATE OR REPLACE FUNCTION public.notify_admin_new_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
      'body', COALESCE(NULLIF(TRIM(NEW.patient_name), ''), NEW.patient_email, 'Paciente') || ' finalizou a avaliação.',
      'ref', NEW.id::text,
      'fields', jsonb_build_object(
        'Paciente', COALESCE(NULLIF(TRIM(NEW.patient_name), ''), NEW.patient_email, '—'),
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

-- 2. Professional/clinic push: route through notify-user with x-internal-secret
-- (calling send-push-notification with the anon key returned 401 and silently
-- killed this notification). Patient name is always in the body.
CREATE OR REPLACE FUNCTION public.push_assessment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recip uuid;
  member record;
  pname text;
  payload jsonb;
BEGIN
  IF COALESCE(NEW.status, '') <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') = 'completed' THEN
    RETURN NEW;
  END IF;

  pname := COALESCE(NULLIF(TRIM(NEW.patient_name), ''), NEW.patient_email, 'Paciente');

  payload := jsonb_build_object(
    'title', '🩺 Avaliação concluída',
    'body', pname || ' finalizou a avaliação. Toque para revisar.',
    'url', '/assessment/view/' || NEW.id::text,
    'tag', 'asm-' || NEW.id::text,
    'category', 'assessments',
    'ref', NEW.id::text
  );

  IF NEW.professional_id IS NOT NULL THEN
    SELECT user_id INTO recip FROM public.professionals WHERE id = NEW.professional_id;
    IF recip IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/notify-user',
        headers := '{"Content-Type":"application/json","x-internal-secret":"942c090a315e1c4a1c79b558fd601e4721f1857065b259b9"}'::jsonb,
        body := payload || jsonb_build_object('user_id', recip::text)
      );
    END IF;
  END IF;

  IF NEW.clinic_id IS NOT NULL THEN
    FOR member IN
      SELECT DISTINCT user_id
        FROM public.clinic_members
       WHERE clinic_id = NEW.clinic_id
         AND status = 'active'
         AND user_id IS NOT NULL
    LOOP
      IF member.user_id IS DISTINCT FROM recip THEN
        PERFORM net.http_post(
          url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/notify-user',
          headers := '{"Content-Type":"application/json","x-internal-secret":"942c090a315e1c4a1c79b558fd601e4721f1857065b259b9"}'::jsonb,
          body := payload || jsonb_build_object('user_id', member.user_id::text)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_push_assessment_completed ON public.assessments;
CREATE TRIGGER trg_push_assessment_completed
AFTER INSERT OR UPDATE OF status ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.push_assessment_completed();