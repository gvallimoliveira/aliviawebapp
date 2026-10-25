-- Fix 1: max(uuid) não existe -> agrega como texto
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
    jsonb_build_array(
      CASE WHEN m.next_scheduled IS NULL
            AND (m.last_done IS NULL OR m.last_done < CURRENT_DATE - 7)
           THEN 'Sem agendamento futuro' END,
      CASE WHEN m.no_shows > 0
           THEN m.no_shows || ' falta(s) recente(s)' END,
      CASE WHEN m.recent_pain IS NOT NULL AND m.prev_pain IS NOT NULL
            AND m.recent_pain >= m.prev_pain THEN 'Dor estagnada/aumentando nos check-ins' END,
      CASE WHEN COALESCE(CURRENT_DATE - m.last_done, 9999) > 14
            AND COALESCE(CURRENT_DATE - m.last_checkin, 9999) > 7
           THEN 'Sem sessão registrada nem check-in recente'
           WHEN m.days_since_activity > 14
           THEN 'Sem sinal de atividade há ' || m.days_since_activity || ' dias' END
    ) - 'null'::jsonb,
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

-- Fix 2: alias de coluna no agregado de motivos dos alertas de carga
CREATE OR REPLACE FUNCTION public.get_patient_load_alerts(
  _clinic_id uuid DEFAULT NULL::uuid,
  _professional_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  patient_id uuid,
  patient_name text,
  acwr numeric,
  acute_load integer,
  chronic_load integer,
  readiness_current integer,
  readiness_baseline integer,
  last_srpe_date date,
  last_checkin_date date,
  pain_spike boolean,
  level text,
  reasons jsonb
)
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
  WITH pset AS (
    SELECT pt.id AS pid, pt.full_name AS pname, LOWER(pt.email) AS email_key
    FROM public.patients pt
    WHERE (_clinic_id IS NOT NULL AND pt.clinic_id = _clinic_id)
       OR (_professional_id IS NOT NULL AND pt.professional_id = _professional_id AND pt.clinic_id IS NULL)
  ),
  loads AS (
    SELECT s.patient_id AS pid,
           SUM(CASE WHEN s.session_date > CURRENT_DATE - 7 THEN s.training_load ELSE 0 END)::int AS acute,
           ROUND(SUM(CASE WHEN s.session_date > CURRENT_DATE - 28 THEN s.training_load ELSE 0 END) / 4.0)::int AS chronic,
           MAX(s.session_date) AS last_srpe,
           COUNT(*) FILTER (WHERE s.training_load > 0) AS sessions,
           MIN(s.session_date) AS first_srpe
    FROM public.srpe_entries s
    JOIN pset ON pset.pid = s.patient_id
    WHERE s.session_date > CURRENT_DATE - 28
    GROUP BY s.patient_id
  ),
  scored AS (
    SELECT c.patient_id AS pid,
           c.checkin_date AS cdate,
           ROUND(
             (((
               COALESCE(c.readiness, 0) + COALESCE(c.sleep, 0)
               + CASE WHEN c.soreness IS NULL THEN 0 ELSE 11 - c.soreness END
               + CASE WHEN c.stress   IS NULL THEN 0 ELSE 11 - c.stress   END
               + CASE WHEN c.fatigue  IS NULL THEN 0 ELSE 11 - c.fatigue  END
               + CASE WHEN c.pain     IS NULL THEN 0 ELSE 11 - c.pain     END
             )::numeric / NULLIF(
               (c.readiness IS NOT NULL)::int + (c.sleep IS NOT NULL)::int
               + (c.soreness IS NOT NULL)::int + (c.stress IS NOT NULL)::int
               + (c.fatigue IS NOT NULL)::int + (c.pain IS NOT NULL)::int, 0)
             ) - 1) / 9.0 * 100
           )::int AS score
    FROM public.readiness_checkins c
    JOIN pset ON pset.pid = c.patient_id
    WHERE c.checkin_date > CURRENT_DATE - 28
  ),
  ranked AS (
    SELECT sc.pid, sc.cdate, sc.score,
           ROW_NUMBER() OVER (PARTITION BY sc.pid ORDER BY sc.cdate DESC) AS rn
    FROM scored sc
    WHERE sc.score IS NOT NULL
  ),
  readiness AS (
    SELECT r.pid,
           MAX(CASE WHEN r.rn = 1 THEN r.score END) AS current_score,
           MAX(CASE WHEN r.rn = 1 THEN r.cdate END) AS last_checkin,
           ROUND(AVG(CASE WHEN r.rn BETWEEN 2 AND 8 THEN r.score END))::int AS baseline_score
    FROM ranked r
    GROUP BY r.pid
  ),
  pain_stats AS (
    SELECT c.patient_id AS pid,
           c.pain,
           c.checkin_date,
           ROW_NUMBER() OVER (PARTITION BY c.patient_id ORDER BY c.checkin_date DESC) AS rn,
           AVG(c.pain) OVER (PARTITION BY c.patient_id) AS avg_all,
           COUNT(*) OVER (PARTITION BY c.patient_id) AS entries
    FROM public.readiness_checkins c
    JOIN pset ON pset.pid = c.patient_id
    WHERE c.pain IS NOT NULL
      AND c.checkin_date >= CURRENT_DATE - 30
  ),
  spikes AS (
    SELECT ps.pid,
           ps.pain AS latest_pain,
           ROUND(ps.avg_all, 1) AS avg_pain
    FROM pain_stats ps
    WHERE ps.rn = 1
      AND ps.entries >= 3
      AND ps.checkin_date >= CURRENT_DATE - 3
      AND ps.pain >= ps.avg_all + 2
  ),
  merged AS (
    SELECT pset.pid,
           pset.pname,
           l.acute,
           (CASE WHEN COALESCE(l.sessions, 0) >= 4
                  AND l.first_srpe IS NOT NULL
                  AND (CURRENT_DATE - l.first_srpe) >= 14
                 THEN l.chronic END) AS chronic,
           l.last_srpe,
           CASE WHEN COALESCE(l.chronic, 0) > 0
                 AND COALESCE(l.sessions, 0) >= 4
                 AND l.first_srpe IS NOT NULL
                 AND (CURRENT_DATE - l.first_srpe) >= 14
                THEN ROUND((l.acute::numeric / l.chronic), 2) END AS ratio,
           rd.current_score,
           rd.baseline_score,
           rd.last_checkin,
           sp.latest_pain,
           sp.avg_pain
    FROM pset
    LEFT JOIN loads l ON l.pid = pset.pid
    LEFT JOIN readiness rd ON rd.pid = pset.pid
    LEFT JOIN spikes sp ON sp.pid = pset.pid
    WHERE l.pid IS NOT NULL OR rd.pid IS NOT NULL OR sp.pid IS NOT NULL
  )
  SELECT m.pid,
         m.pname,
         m.ratio,
         COALESCE(m.acute, 0),
         COALESCE(m.chronic, 0),
         m.current_score,
         m.baseline_score,
         m.last_srpe,
         m.last_checkin,
         (m.latest_pain IS NOT NULL) AS pain_spike,
         CASE
           WHEN (m.ratio IS NOT NULL AND m.ratio > 1.5)
             OR (m.current_score IS NOT NULL AND m.baseline_score IS NOT NULL
                 AND m.baseline_score - m.current_score >= 20)
             OR (m.latest_pain IS NOT NULL AND m.ratio IS NOT NULL AND m.ratio > 1.3)
           THEN 'danger'
           WHEN (m.ratio IS NOT NULL AND (m.ratio > 1.3 OR m.ratio < 0.8))
             OR (m.current_score IS NOT NULL AND m.current_score < 40)
             OR m.latest_pain IS NOT NULL
           THEN 'caution'
           ELSE 'ok'
         END AS level,
         (
           SELECT COALESCE(jsonb_agg(x.reason), '[]'::jsonb) FROM (
             SELECT 'Pico de dor no check-in (' || m.latest_pain || ' vs média ' || m.avg_pain || ')' AS reason
               WHERE m.latest_pain IS NOT NULL
             UNION ALL
             SELECT 'ACWR ' || m.ratio::text
               WHERE m.ratio IS NOT NULL AND m.ratio > 1.3
             UNION ALL
             SELECT 'Carga abaixo do habitual (ACWR ' || m.ratio::text || ')'
               WHERE m.ratio IS NOT NULL AND m.ratio < 0.8
             UNION ALL
             SELECT 'Queda de prontidão (' || m.baseline_score::text || ' para ' || m.current_score::text || ')'
               WHERE m.current_score IS NOT NULL AND m.baseline_score IS NOT NULL
                 AND m.baseline_score - m.current_score >= 20
             UNION ALL
             SELECT 'Prontidão baixa (' || m.current_score::text || '/100)'
               WHERE m.current_score IS NOT NULL AND m.current_score < 40
           ) x
         ) AS reasons
  FROM merged m
  ORDER BY (m.ratio IS NULL), m.ratio DESC NULLS LAST;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_patient_load_alerts(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_patient_load_alerts(uuid, uuid) TO authenticated;