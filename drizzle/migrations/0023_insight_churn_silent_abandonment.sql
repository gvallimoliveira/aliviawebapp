DROP FUNCTION IF EXISTS public.get_patient_churn_risk(uuid, uuid);

CREATE FUNCTION public.get_patient_churn_risk(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
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
  WITH base_appts AS (
    SELECT pa.patient_email AS pemail, pa.patient_name AS pname, pa.professional_id AS pid,
           pa.appointment_date AS adate, pa.status AS astatus
    FROM public.professional_appointments pa
    WHERE pa.patient_email IS NOT NULL
      AND (
        (_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id AND pa.clinic_id IS NULL)
      )
  ),
  patients_set AS (
    SELECT DISTINCT LOWER(b.pemail) AS email_key,
           MAX(b.pname) AS pname,
           MAX(b.pid) AS pid
    FROM base_appts b
    GROUP BY LOWER(b.pemail)
  ),
  last_sessions AS (
    SELECT LOWER(b.pemail) AS email_key,
           MAX(CASE WHEN b.astatus IN ('completed','no_show') AND b.adate <= CURRENT_DATE
                    THEN b.adate END) AS last_done,
           MIN(CASE WHEN b.astatus = 'scheduled' AND b.adate >= CURRENT_DATE
                    THEN b.adate END) AS next_scheduled,
           SUM(CASE WHEN b.astatus = 'no_show'
                     AND b.adate >= CURRENT_DATE - INTERVAL '60 days' THEN 1 ELSE 0 END) AS recent_no_shows
    FROM base_appts b
    GROUP BY LOWER(b.pemail)
  ),
  pain_trend AS (
    SELECT LOWER(au.email) AS email_key,
           AVG(CASE WHEN pde.logged_at >= CURRENT_DATE - INTERVAL '7 days' THEN pde.pain_score END) AS recent_pain,
           AVG(CASE WHEN pde.logged_at < CURRENT_DATE - INTERVAL '7 days'
                     AND pde.logged_at >= CURRENT_DATE - INTERVAL '21 days' THEN pde.pain_score END) AS prev_pain,
           MAX(pde.logged_at) AS last_diary
    FROM public.pain_diary_entries pde
    JOIN auth.users au ON au.id = pde.user_id
    GROUP BY LOWER(au.email)
  ),
  checkin_activity AS (
    SELECT LOWER(pt.email) AS email_key,
           MAX(rc.checkin_date) AS last_checkin
    FROM public.readiness_checkins rc
    JOIN public.patients pt ON pt.id = rc.patient_id
    GROUP BY LOWER(pt.email)
  ),
  msg_activity AS (
    SELECT LOWER(au.email) AS email_key,
           MAX(m.created_at) AS last_message_at
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    JOIN auth.users au ON au.id = c.patient_user_id
    WHERE m.sender_user_id = c.patient_user_id
    GROUP BY LOWER(au.email)
  ),
  merged AS (
    SELECT
      ps.email_key,
      ps.pname,
      ps.pid,
      ls.last_done,
      ls.next_scheduled,
      COALESCE(ls.recent_no_shows, 0) AS no_shows,
      pt.recent_pain,
      pt.prev_pain,
      pt.last_diary,
      ca.last_checkin,
      ma.last_message_at,
      GREATEST(
        COALESCE(CURRENT_DATE - ls.last_done, 9999),
        COALESCE(CURRENT_DATE - pt.last_diary, 9999),
        COALESCE(CURRENT_DATE - ca.last_checkin, 9999),
        COALESCE(CURRENT_DATE - ma.last_message_at::date, 9999)
      ) AS days_since_any,
      (COALESCE(CURRENT_DATE - pt.last_diary, 9999) > 10
       AND COALESCE(CURRENT_DATE - ca.last_checkin, 9999) > 7
       AND COALESCE(CURRENT_DATE - ma.last_message_at::date, 9999) > 14) AS fully_silent
    FROM patients_set ps
    LEFT JOIN last_sessions ls USING (email_key)
    LEFT JOIN pain_trend pt USING (email_key)
    LEFT JOIN checkin_activity ca USING (email_key)
    LEFT JOIN msg_activity ma USING (email_key)
  )
  SELECT
    m.email_key,
    m.pname,
    m.pid,
    LEAST(100, (
      CASE WHEN m.next_scheduled IS NULL
            AND (m.last_done IS NULL OR m.last_done < CURRENT_DATE - INTERVAL '7 days')
           THEN 40 ELSE 0 END
      + m.no_shows * 15
      + CASE WHEN m.recent_pain IS NOT NULL AND m.prev_pain IS NOT NULL
              AND m.recent_pain >= m.prev_pain THEN 20 ELSE 0 END
      + CASE WHEN m.fully_silent THEN 25
             WHEN m.days_since_any > 14 THEN 10
             ELSE 0 END
    ))::int,
    jsonb_build_array(
      CASE WHEN m.next_scheduled IS NULL
            AND (m.last_done IS NULL OR m.last_done < CURRENT_DATE - INTERVAL '7 days')
           THEN 'Sem agendamento futuro' END,
      CASE WHEN m.no_shows > 0
           THEN m.no_shows || ' falta(s) recente(s)' END,
      CASE WHEN m.recent_pain IS NOT NULL AND m.prev_pain IS NOT NULL
            AND m.recent_pain >= m.prev_pain THEN 'Dor estagnada/aumentando' END,
      CASE WHEN m.fully_silent
           THEN 'Silêncio total: sem diário, check-in ou mensagem'
           WHEN m.days_since_any > 14
           THEN 'Sem sinal de atividade há ' || m.days_since_any || ' dias' END
    ) - 'null'::jsonb,
    m.last_done,
    m.next_scheduled,
    LEAST(m.days_since_any, 9999)::int
  FROM merged m
  WHERE (
    CASE WHEN m.next_scheduled IS NULL
          AND (m.last_done IS NULL OR m.last_done < CURRENT_DATE - INTERVAL '7 days')
         THEN 40 ELSE 0 END
    + m.no_shows * 15
    + CASE WHEN m.recent_pain IS NOT NULL AND m.prev_pain IS NOT NULL
            AND m.recent_pain >= m.prev_pain THEN 20 ELSE 0 END
    + CASE WHEN m.fully_silent THEN 25
           WHEN m.days_since_any > 14 THEN 10
           ELSE 0 END
  ) >= 40
  ORDER BY 4 DESC
  LIMIT 20;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_patient_churn_risk(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_patient_churn_risk(uuid, uuid) TO authenticated;