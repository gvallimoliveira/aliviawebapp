CREATE TABLE public.appointment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  patient_name text NOT NULL,
  patient_email text,
  patient_phone text,
  clinic_id uuid,
  professional_id uuid,
  requested_date date NOT NULL,
  requested_time text,
  requested_period text,
  service_id uuid,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','dismissed','cancelled')),
  appointment_id uuid,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (clinic_id IS NOT NULL OR professional_id IS NOT NULL),
  CHECK (requested_period IS NULL OR requested_period IN ('morning','afternoon','evening'))
);
CREATE INDEX appointment_requests_clinic_idx ON public.appointment_requests (clinic_id, status);
CREATE INDEX appointment_requests_pro_idx ON public.appointment_requests (professional_id, status);
CREATE INDEX appointment_requests_patient_idx ON public.appointment_requests (patient_user_id);

GRANT SELECT, UPDATE ON public.appointment_requests TO authenticated;
GRANT ALL ON public.appointment_requests TO service_role;
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_handle_appointment_request(_user_id uuid, _clinic_id uuid, _professional_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _clinic_id IS NOT NULL THEN EXISTS (
      SELECT 1 FROM public.clinic_members WHERE user_id = _user_id AND clinic_id = _clinic_id
        AND status = 'active' AND role IN ('owner','admin','secretary'))
    ELSE EXISTS (SELECT 1 FROM public.professionals WHERE id = _professional_id AND user_id = _user_id)
  END
$$;

CREATE POLICY "Patient reads own requests" ON public.appointment_requests FOR SELECT TO authenticated
  USING (patient_user_id = auth.uid());
CREATE POLICY "Staff reads scoped requests" ON public.appointment_requests FOR SELECT TO authenticated
  USING (public.can_handle_appointment_request(auth.uid(), clinic_id, professional_id));
CREATE POLICY "Patient cancels own pending" ON public.appointment_requests FOR UPDATE TO authenticated
  USING (patient_user_id = auth.uid() AND status = 'pending')
  WITH CHECK (patient_user_id = auth.uid() AND status IN ('pending','cancelled'));

-- Providers the signed-in patient is linked to (clinic or solo PRO)
CREATE OR REPLACE FUNCTION public.get_my_care_providers()
RETURNS TABLE(kind text, provider_id uuid, name text, logo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT id, lower(email) AS email FROM auth.users WHERE id = auth.uid()),
  clin AS (
    SELECT pt.clinic_id AS cid FROM public.patients pt, me
      WHERE pt.clinic_id IS NOT NULL AND pt.email IS NOT NULL AND lower(trim(pt.email)) = me.email
    UNION SELECT a.clinic_id FROM public.assessments a, me
      WHERE a.clinic_id IS NOT NULL AND (a.user_id = me.id OR lower(trim(a.patient_email)) = me.email)
  ),
  pro AS (
    SELECT pt.professional_id AS pid FROM public.patients pt, me
      WHERE pt.clinic_id IS NULL AND pt.professional_id IS NOT NULL AND pt.email IS NOT NULL AND lower(trim(pt.email)) = me.email
    UNION SELECT a.professional_id FROM public.assessments a, me
      WHERE a.clinic_id IS NULL AND a.professional_id IS NOT NULL AND (a.user_id = me.id OR lower(trim(a.patient_email)) = me.email)
  )
  SELECT 'clinic'::text, c.id, c.name, c.logo_url FROM public.clinics c JOIN clin ON clin.cid = c.id
  UNION ALL
  SELECT 'professional'::text, p.id, p.full_name, p.logo_url FROM public.professionals p JOIN pro ON pro.pid = p.id WHERE p.active = true
$$;
GRANT EXECUTE ON FUNCTION public.get_my_care_providers() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_appointment_request(
  _kind text, _provider_id uuid, _date date, _time text, _period text, _notes text, _phone text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_name text; v_email text; v_pending int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.get_my_care_providers() g WHERE g.kind = _kind AND g.provider_id = _provider_id) THEN
    RAISE EXCEPTION 'provider not linked';
  END IF;
  IF _date IS NULL OR _date < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'invalid date'; END IF;
  IF _time IS NOT NULL AND _time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'invalid time'; END IF;
  SELECT count(*) INTO v_pending FROM public.appointment_requests WHERE patient_user_id = auth.uid() AND status = 'pending';
  IF v_pending >= 5 THEN RAISE EXCEPTION 'too many pending requests'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  SELECT COALESCE(NULLIF(trim(full_name),''), split_part(v_email,'@',1)) INTO v_name FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.appointment_requests (patient_user_id, patient_name, patient_email, patient_phone, clinic_id, professional_id,
    requested_date, requested_time, requested_period, notes)
  VALUES (auth.uid(), COALESCE(v_name, split_part(v_email,'@',1)), v_email, NULLIF(left(trim(_phone),30),''),
    CASE WHEN _kind = 'clinic' THEN _provider_id END, CASE WHEN _kind = 'professional' THEN _provider_id END,
    _date, _time, _period, NULLIF(left(trim(_notes),500),''))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.create_appointment_request(text, uuid, date, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_appointment_request(
  _request_id uuid, _date date, _time text, _duration int, _professional_id uuid, _service_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.appointment_requests; v_pro uuid; v_apt uuid; v_service text := 'fisioterapia';
BEGIN
  SELECT * INTO r FROM public.appointment_requests WHERE id = _request_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'already decided'; END IF;
  IF NOT public.can_handle_appointment_request(auth.uid(), r.clinic_id, r.professional_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _date IS NULL OR _time IS NULL OR _time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'invalid slot'; END IF;
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
  IF _service_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.care_services s WHERE s.id = _service_id AND s.active
      AND ((r.clinic_id IS NOT NULL AND s.clinic_id = r.clinic_id) OR (r.clinic_id IS NULL AND s.clinic_id IS NULL AND s.professional_id = v_pro))) THEN
    RAISE EXCEPTION 'invalid service';
  END IF;
  INSERT INTO public.professional_appointments (professional_id, clinic_id, patient_name, patient_email, appointment_date,
    appointment_time, duration_minutes, type, service_type, status, service_id, notes)
  VALUES (v_pro, r.clinic_id, r.patient_name, r.patient_email, _date, _time, COALESCE(NULLIF(_duration,0), 50),
    'in_person', v_service, 'scheduled', _service_id, r.notes)
  RETURNING id INTO v_apt;
  UPDATE public.appointment_requests SET status = 'approved', appointment_id = v_apt, decided_by = auth.uid(), decided_at = now()
    WHERE id = r.id;
  RETURN v_apt;
END $$;
GRANT EXECUTE ON FUNCTION public.approve_appointment_request(uuid, date, text, int, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dismiss_appointment_request(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.appointment_requests;
BEGIN
  SELECT * INTO r FROM public.appointment_requests WHERE id = _request_id FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'pending' THEN RAISE EXCEPTION 'not pending'; END IF;
  IF NOT public.can_handle_appointment_request(auth.uid(), r.clinic_id, r.professional_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.appointment_requests SET status = 'dismissed', decided_by = auth.uid(), decided_at = now() WHERE id = r.id;
END $$;
GRANT EXECUTE ON FUNCTION public.dismiss_appointment_request(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_requests;