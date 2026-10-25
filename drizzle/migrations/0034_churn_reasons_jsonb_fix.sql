-- jsonb não tem operador de subtração: motivos passam a ser agregados filtrando NULLs
CREATE OR REPLACE FUNCTION public.get_patient_churn_risk(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(patient_email text, patient_name text, professional_id uuid, score integer, reasons jsonb, last_session_date date, next_session_date date, silent_days integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _clinic_id IS NOT NULL THEN
    IF NOT public.is_clinic_member(auth.uid(), _clinic_id) THEN
      RAISE EXCEPTION 'Not authorized for this clinic';
    END IF;
  ELSIF _professional_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = _professional_id AND p.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Not authorized for this professional';
    END IF;
  ELSE
    RAISE EXCEPTION 'clinic_id or professional_id required';
  END IF;

  RETURN QUERY
  WITH keys AS (
    SELECT LOWER(pt.email) AS email_key, MAX(pt.full_name) AS pname
    FROM public.patients pt
    WHERE pt.email IS NOT NULL AND pt.email <> ''
      AND ((_clinic_id IS NOT NULL AND pt.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pt.professional_id = _professional_id AND pt.clinic_id IS NULL))
    GROUP BY 1
    UNION
    SELECT LOWER(pa.patient_email), MAX(pa.patient_name)
    FROM public.professional_appointments pa
    WHERE pa.patient_email IS NOT NULL AND pa.patient_email <> ''
      AND ((_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id AND pa.clinic_id IS NULL))
    GROUP BY 1
    UNION
    SELECT LOWER(sn.patient_email), MAX(NULL::text)
    FROM public.session_notes sn
    WHERE sn.patient_email IS NOT NULL AND sn.patient_email <> ''
      AND ((_clinic_id IS NOT NULL AND sn.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND sn.professional_id = _professional_id AND sn.clinic_id IS NULL))
    GROUP BY 1
  ),
  appts AS (
    SELECT LOWER(pa.patient_email) AS email_key,
           MAX(pa.professional_id::text)::uuid AS pid,
           MAX(CASE WHEN pa.status = 'completed' AND pa.appointment_date <= CURRENT_DATE
                    THEN pa.appointment_date END) AS last_done_appt,
           MIN(CASE WHEN pa.status = 'scheduled' AND pa.appointment_date >= CURRENT_DATE
                    THEN pa.appointment_date END) AS next_scheduled,
           COUNT(*) FILTER (WHERE pa.status = 'no_show'
                     AND pa.appointment_date >= CURRENT_DATE - 60) AS no_shows
    FROM public.professional_appointments pa
    WHERE pa.patient_email IS NOT NULL
      AND ((_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id AND pa.clinic_id IS NULL))
    GROUP BY LOWER(pa.patient_email)
  ),
  notes AS (
    SELECT LOWER(sn.patient_email) AS email_key,
           MAX(sn.session_date) AS last_note
    FROM public.session_notes sn
    WHERE sn.patient_email IS NOT NULL
      AND sn.session_date <= CURRENT_DATE
      AND ((_clinic_id IS NOT NULL AND sn.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND sn.professional_id = _professional_id AND sn.clinic_id IS NULL))
    GROUP BY LOWER(sn.patient_email)
  ),
  checkins AS (
    SELECT LOWER(pt.email) AS email_key,
           MAX(rc.checkin_date) AS last_checkin,
           AVG(CASE WHEN rc.checkin_date >= CURRENT_DATE - 7 THEN rc.pain END) AS recent_pain,
           AVG(CASE WHEN rc.checkin_date < CURRENT_DATE - 7
                     AND rc.checkin_date >= CURRENT_DATE - 21 THEN rc.pain END) AS prev_pain
    FROM public.readiness_checkins rc
    JOIN public.patients pt ON pt.id = rc.patient_id
    GROUP BY LOWER(pt.email)
  ),
  merged AS (
    SELECT
      k.email_key,
      MAX(k.pname) AS pname,
      a.pid,
      GREATEST(a.last_done_appt, n.last_note) AS last_done,
      a.next_scheduled,
      COALESCE(a.no_shows, 0) AS no_shows,
      c.last_checkin,
      c.recent_pain,
      c.prev_pain,
      LEAST(
        COALESCE(CURRENT_DATE - GREATEST(a.last_done_appt, n.last_note), 9999),
        COALESCE(CURRENT_DATE - c.last_checkin, 9999)
      ) AS days_since_activity
    FROM keys k
    LEFT JOIN appts a ON a.email_key = k.email_key
    LEFT JOIN notes n ON n.email_key = k.email_key
    LEFT JOIN checkins c ON c.email_key = k.email_key
    GROUP BY k.email_key, a.pid, a.last_done_appt, n.last_note, a.next_scheduled, a.no_shows,
             c.last_checkin, c.recent_pain, c.prev_pain
  )
  SELECT
    m.email_key,
    m.pname,
    m.pid,
    LEAST(100, (
      CASE WHEN m.next_scheduled IS NULL
            AND (m.last_done IS NULL OR m.last_done < CURRENT_DATE - 7)
           THEN 40 ELSE 0 END
      + LEAST(m.no_shows, 3) * 15
      + CASE WHEN m.recent_pain IS NOT NULL AND m.prev_pain IS NOT NULL
              AND m.recent_pain >= m.prev_pain THEN 20 ELSE 0 END
      + CASE WHEN COALESCE(CURRENT_DATE - m.last_done, 9999) > 14
              AND COALESCE(CURRENT_DATE - m.last_checkin, 9999) > 7 THEN 25
             WHEN m.days_since_activity > 14 THEN 10
             ELSE 0 END
    ))::int,
    (SELECT COALESCE(jsonb_agg(x.reason), '[]'::jsonb) FROM (
       SELECT 'Sem agendamento futuro'::text AS reason
         WHERE m.next_scheduled IS NULL
           AND (m.last_done IS NULL OR m.last_done < CURRENT_DATE - 7)
       UNION ALL
       SELECT m.no_shows || ' falta(s) recente(s)'
         WHERE m.no_shows > 0
       UNION ALL
       SELECT 'Dor estagnada/aumentando nos check-ins'
         WHERE m.recent_pain IS NOT NULL AND m.prev_pain IS NOT NULL
           AND m.recent_pain >= m.prev_pain
       UNION ALL
       SELECT 'Sem sessão registrada nem check-in recente'
         WHERE COALESCE(CURRENT_DATE - m.last_done, 9999) > 14
           AND COALESCE(CURRENT_DATE - m.last_checkin, 9999) > 7
       UNION ALL
       SELECT 'Sem sinal de atividade há ' || m.days_since_activity || ' dias'
         WHERE NOT (COALESCE(CURRENT_DATE - m.last_done, 9999) > 14
                AND COALESCE(CURRENT_DATE - m.last_checkin, 9999) > 7)
           AND m.days_since_activity > 14
    ) x),
    m.last_done,
    m.next_scheduled,
    LEAST(m.days_since_activity, 9999)::int
  FROM merged m
  WHERE (m.last_done IS NOT NULL OR m.no_shows > 0 OR m.last_checkin IS NOT NULL)
    AND (
      CASE WHEN m.next_scheduled IS NULL
            AND (m.last_done IS NULL OR m.last_done < CURRENT_DATE - 7)
           THEN 40 ELSE 0 END
      + LEAST(m.no_shows, 3) * 15
      + CASE WHEN m.recent_pain IS NOT NULL AND m.prev_pain IS NOT NULL
              AND m.recent_pain >= m.prev_pain THEN 20 ELSE 0 END
      + CASE WHEN COALESCE(CURRENT_DATE - m.last_done, 9999) > 14
              AND COALESCE(CURRENT_DATE - m.last_checkin, 9999) > 7 THEN 25
             WHEN m.days_since_activity > 14 THEN 10
             ELSE 0 END
    ) >= 40
  ORDER BY 4 DESC
  LIMIT 20;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_patient_churn_risk(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_patient_churn_risk(uuid, uuid) TO authenticated;