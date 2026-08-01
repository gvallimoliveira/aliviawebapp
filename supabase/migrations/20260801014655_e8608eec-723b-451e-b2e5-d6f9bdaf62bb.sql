ALTER TABLE public.data_subject_requests
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.notify_admin_new_dsr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/notify-admin',
    headers := '{"Content-Type":"application/json","x-internal-secret":"942c090a315e1c4a1c79b558fd601e4721f1857065b259b9"}'::jsonb,
    body := jsonb_build_object('action', 'dsr', 'request_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_dsr ON public.data_subject_requests;
CREATE TRIGGER trg_notify_admin_new_dsr
AFTER INSERT ON public.data_subject_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_dsr();