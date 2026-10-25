ALTER TABLE public.care_services ADD COLUMN IF NOT EXISTS service_type text;
UPDATE public.care_services SET service_type = CASE
  WHEN name ~* 'avalia' THEN 'avaliacao' WHEN name ~* 'pilates' THEN 'pilates'
  WHEN name ~* 'osteo' THEN 'osteopatia' WHEN name ~* 'masso|massag' THEN 'massoterapia'
  WHEN name ~* 'rpg' THEN 'rpg' ELSE 'fisioterapia' END WHERE service_type IS NULL;

CREATE OR REPLACE FUNCTION public.approve_appointment_request(_request_id uuid, _date date, _time text, _duration integer, _professional_id uuid, _service_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.appointment_requests; v_pro uuid; v_apt uuid; v_service text := 'fisioterapia'; v_time text := left(coalesce(_time,''), 5); v_sname text; v_stype text;
BEGIN
  SELECT * INTO r FROM public.appointment_requests WHERE id = _request_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'already decided'; END IF;
  IF NOT public.can_handle_appointment_request(auth.uid(), r.clinic_id, r.professional_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _date IS NULL OR v_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'invalid slot'; END IF;
  IF r.clinic_id IS NOT NULL THEN
    IF _professional_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.professionals p JOIN public.clinic_members m ON m.user_id = p.user_id
      WHERE p.id = _professional_id AND m.clinic_id = r.clinic_id AND m.status = 'active') THEN
      RAISE EXCEPTION 'invalid therapist';
    END IF;
    v_pro := _professional_id;
  ELSE
    v_pro := r.professional_id;
  END IF;
  IF _service_id IS NOT NULL THEN
    SELECT s.name, s.service_type INTO v_sname, v_stype FROM public.care_services s WHERE s.id = _service_id AND s.active
      AND ((r.clinic_id IS NOT NULL AND s.clinic_id = r.clinic_id) OR (r.clinic_id IS NULL AND s.clinic_id IS NULL AND s.professional_id = v_pro));
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid service'; END IF;
    v_service := COALESCE(NULLIF(v_stype,''), CASE
      WHEN v_sname ~* 'avalia' THEN 'avaliacao' WHEN v_sname ~* 'pilates' THEN 'pilates'
      WHEN v_sname ~* 'osteo' THEN 'osteopatia' WHEN v_sname ~* 'masso|massag' THEN 'massoterapia'
      WHEN v_sname ~* 'rpg' THEN 'rpg' ELSE 'fisioterapia' END);
  END IF;
  INSERT INTO public.professional_appointments (professional_id, clinic_id, patient_name, patient_email, appointment_date,
    appointment_time, duration_minutes, type, service_type, status, service_id, notes)
  VALUES (v_pro, r.clinic_id, r.patient_name, r.patient_email, _date, v_time::time, COALESCE(NULLIF(_duration,0), 50),
    'in_person', v_service, 'scheduled', _service_id, r.notes)
  RETURNING id INTO v_apt;
  UPDATE public.appointment_requests SET status = 'approved', appointment_id = v_apt, decided_by = auth.uid(), decided_at = now()
    WHERE id = r.id;
  RETURN v_apt;
END $function$;