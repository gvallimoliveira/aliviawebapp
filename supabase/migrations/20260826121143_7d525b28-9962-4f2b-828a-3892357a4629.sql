CREATE OR REPLACE FUNCTION public.notify_admin_new_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only alert when the assessment is actually finished.
  IF COALESCE(NEW.status, '') <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Privacy: never alert the admin about assessments that belong to a
  -- professional or a clinic. Those are their patients, not platform data.
  IF NEW.professional_id IS NOT NULL OR NEW.clinic_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/notify-admin',
    headers := '{"Content-Type":"application/json","x-internal-secret":"942c090a315e1c4a1c79b558fd601e4721f1857065b259b9"}'::jsonb,
    body := jsonb_build_object(
      'action', 'alert',
      'event_type', 'new_assessment',
      'title', '🩺 Nova autoavaliação concluída',
      'ref', NEW.id::text,
      'fields', jsonb_build_object(
        'Tipo', COALESCE(NEW.type, '—'),
        'Origem', 'Autoavaliação (paciente)'
      ),
      'url', 'https://aliviawebapp.com.br/admin'
    )
  );
  RETURN NEW;
END;
$function$;