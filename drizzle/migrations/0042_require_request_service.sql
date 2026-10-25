CREATE OR REPLACE FUNCTION public.create_appointment_request_v2(_kind text, _provider_id uuid, _date date, _time text, _service_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_id uuid;
BEGIN
  IF _time IS NULL THEN RAISE EXCEPTION 'invalid time'; END IF;
  IF _service_id IS NULL AND EXISTS (SELECT 1 FROM public.get_provider_services(_kind, _provider_id)) THEN
    RAISE EXCEPTION 'service required';
  END IF;
  IF _service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.get_provider_services(_kind, _provider_id) s WHERE s.id = _service_id) THEN
    RAISE EXCEPTION 'invalid service';
  END IF;
  v_id := public.create_appointment_request(_kind, _provider_id, _date, left(_time,5), NULL, NULL, NULL);
  UPDATE public.appointment_requests SET service_id = _service_id WHERE id = v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_appointment_request_v2(text, uuid, date, text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_appointment_request_v2(text, uuid, date, text, uuid) TO authenticated;