CREATE OR REPLACE FUNCTION public.notify_admin_new_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/notify-admin',
    headers := '{"Content-Type":"application/json","x-internal-secret":"942c090a315e1c4a1c79b558fd601e4721f1857065b259b9"}'::jsonb,
    body := jsonb_build_object(
      'action', 'alert',
      'event_type', 'new_assessment',
      'title', '🩺 Nova avaliação recebida',
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
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_assessment ON public.assessments;
CREATE TRIGGER trg_notify_admin_new_assessment
AFTER INSERT ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_assessment();