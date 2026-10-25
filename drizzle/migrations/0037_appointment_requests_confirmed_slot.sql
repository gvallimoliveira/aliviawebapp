ALTER TABLE public.appointment_requests ADD COLUMN confirmed_date date, ADD COLUMN confirmed_time text;
CREATE OR REPLACE FUNCTION public.sync_confirmed_slot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.appointment_id IS NOT NULL THEN
    SELECT appointment_date, left(appointment_time::text,5) INTO NEW.confirmed_date, NEW.confirmed_time
      FROM public.professional_appointments WHERE id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER appointment_requests_confirmed_slot BEFORE UPDATE ON public.appointment_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_confirmed_slot();