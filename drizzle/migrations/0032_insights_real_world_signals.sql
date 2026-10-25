-- =============================================================
-- Insights passam a usar sinais do mundo real:
--  - evolução registrada (notas de sessão) conta como sessão realizada
--  - dor/prontidão vêm dos check-ins de prontidão (não do diário de dor)
--  - mensagens internas deixam de ser sinal (equipes usam WhatsApp)
-- =============================================================

-- 1) RISCO DE ABANDONO -------------------------------------------------------
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
           MAX(pa.professional_id) AS pid,
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

-- 2) ALERTAS DE CARGA: pico de dor vem do check-in, não do diário -----------
DROP FUNCTION IF EXISTS public.get_patient_load_alerts(uuid, uuid);
CREATE FUNCTION public.get_patient_load_alerts(
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
             SELECT 'Pico de dor no check-in (' || m.latest_pain || ' vs média ' || m.avg_pain || ')'
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

-- 3) PREVISÃO DE ALTA: dor + fase STEPS + progresso de carga + prontidão -----
DROP FUNCTION IF EXISTS public.get_discharge_predictions(uuid, uuid);
CREATE FUNCTION public.get_discharge_predictions(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(
   patient_email text,
   patient_name text,
   professional_id uuid,
   sessions_done integer,
   current_pain numeric,
   initial_pain numeric,
   sessions_remaining integer,
   weeks_estimate integer,
   confidence text,
   progress_pct integer,
   factors jsonb
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
    WHERE pt.email IS NOT NULL AND pt.email <> ''
      AND ((_clinic_id IS NOT NULL AND pt.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pt.professional_id = _professional_id AND pt.clinic_id IS NULL))
  ),
  realized_days AS (
    SELECT LOWER(pa.patient_email) AS email_key, pa.appointment_date AS d
    FROM public.professional_appointments pa
    WHERE pa.status = 'completed'
      AND pa.appointment_date <= CURRENT_DATE
      AND pa.appointment_date >= CURRENT_DATE - 180
      AND pa.patient_email IS NOT NULL AND pa.patient_email <> ''
      AND ((_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id AND pa.clinic_id IS NULL))
    UNION
    SELECT LOWER(sn.patient_email), sn.session_date
    FROM public.session_notes sn
    WHERE sn.patient_email IS NOT NULL AND sn.patient_email <> ''
      AND sn.session_date <= CURRENT_DATE
      AND sn.session_date >= CURRENT_DATE - 180
      AND ((_clinic_id IS NOT NULL AND sn.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND sn.professional_id = _professional_id AND sn.clinic_id IS NULL))
  ),
  realized AS (
    SELECT rd.email_key,
           COUNT(*)::int AS n_sessions,
           COUNT(*) FILTER (WHERE rd.d >= CURRENT_DATE - 28)::int AS last28
    FROM realized_days rd
    GROUP BY rd.email_key
  ),
  pain_points AS (
    SELECT rc.patient_id AS pid, rc.pain, rc.checkin_date,
           ROW_NUMBER() OVER (PARTITION BY rc.patient_id ORDER BY rc.checkin_date ASC) AS rn_asc,
           ROW_NUMBER() OVER (PARTITION BY rc.patient_id ORDER BY rc.checkin_date DESC) AS rn_desc
    FROM public.readiness_checkins rc
    JOIN pset ON pset.pid = rc.patient_id
    WHERE rc.pain IS NOT NULL
      AND rc.checkin_date >= CURRENT_DATE - 120
  ),
  pain AS (
    SELECT pp.pid,
           AVG(CASE WHEN pp.rn_asc <= 2 THEN pp.pain END) AS initial_pain,
           AVG(CASE WHEN pp.rn_desc <= 2 THEN pp.pain END) AS current_pain,
           COUNT(*) AS entries
    FROM pain_points pp
    GROUP BY pp.pid
  ),
  steps AS (
    SELECT pl.patient_id AS pid,
           (SELECT pc.sort_order FROM public.periodization_cycles pc
             WHERE pc.plan_id = pl.id AND pc.level = 'macro' AND pc.is_current = true LIMIT 1) AS cur_order,
           (SELECT COUNT(*) FROM public.periodization_cycles pc
             WHERE pc.plan_id = pl.id AND pc.level = 'macro')::int AS total_phases
    FROM public.periodization_plans pl
    JOIN pset ON pset.pid = pl.patient_id
    WHERE pl.status = 'active'
  ),
  loads AS (
    SELECT s.patient_id AS pid,
           SUM(CASE WHEN s.session_date > CURRENT_DATE - 28 THEN s.training_load ELSE 0 END) AS recent28,
           SUM(CASE WHEN s.session_date <= CURRENT_DATE - 28
                     AND s.session_date > CURRENT_DATE - 56 THEN s.training_load ELSE 0 END) AS prev28
    FROM public.srpe_entries s
    JOIN pset ON pset.pid = s.patient_id
    WHERE s.session_date > CURRENT_DATE - 56
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
  latest_ready AS (
    SELECT t.pid, t.score
    FROM (SELECT sc.pid, sc.score,
                 ROW_NUMBER() OVER (PARTITION BY sc.pid ORDER BY sc.cdate DESC) AS rn
          FROM scored sc WHERE sc.score IS NOT NULL) t
    WHERE t.rn = 1
  ),
  comp AS (
    SELECT pset.email_key,
           pset.pname,
           COALESCE(r.n_sessions, 0) AS n_sessions,
           COALESCE(r.last28, 0) AS last28,
           p.initial_pain,
           p.current_pain,
           CASE WHEN p.initial_pain IS NOT NULL AND p.initial_pain > 0
                 AND p.current_pain IS NOT NULL AND p.entries >= 2
                THEN GREATEST(0, LEAST(1, (p.initial_pain - p.current_pain) / p.initial_pain)) END AS pain_c,
           CASE WHEN st.total_phases > 0 AND st.cur_order IS NOT NULL
                THEN LEAST(1, st.cur_order::numeric / st.total_phases) END AS steps_c,
           CASE WHEN l.prev28 > 0 THEN LEAST(1.5, l.recent28 / l.prev28) / 1.5 END AS load_c,
           CASE WHEN lr.score IS NOT NULL THEN lr.score / 100.0 END AS ready_c
    FROM pset
    LEFT JOIN realized r ON r.email_key = pset.email_key
    LEFT JOIN pain p ON p.pid = pset.pid
    LEFT JOIN steps st ON st.pid = pset.pid
    LEFT JOIN loads l ON l.pid = pset.pid
    LEFT JOIN latest_ready lr ON lr.pid = pset.pid
    WHERE COALESCE(r.n_sessions, 0) >= 2 OR st.pid IS NOT NULL
  ),
  calc AS (
    SELECT c.*,
           ((c.pain_c IS NOT NULL)::int * 40 + (c.steps_c IS NOT NULL)::int * 30
            + (c.load_c IS NOT NULL)::int * 15 + (c.ready_c IS NOT NULL)::int * 15) AS wsum,
           (COALESCE(c.pain_c, 0) * 40 + COALESCE(c.steps_c, 0) * 30
            + COALESCE(c.load_c, 0) * 15 + COALESCE(c.ready_c, 0) * 15) AS wval,
           ((c.pain_c IS NOT NULL)::int + (c.steps_c IS NOT NULL)::int
            + (c.load_c IS NOT NULL)::int + (c.ready_c IS NOT NULL)::int) AS ncomp
    FROM comp c
  )
  SELECT
    x.email_key,
    x.pname,
    NULL::uuid,
    x.n_sessions,
    ROUND(x.current_pain, 1),
    ROUND(x.initial_pain, 1),
    GREATEST(0, CEIL((1 - COALESCE(x.wval / NULLIF(x.wsum, 0), 0)) * GREATEST(4, x.n_sessions)))::int AS sessions_remaining,
    CEIL(GREATEST(0, CEIL((1 - COALESCE(x.wval / NULLIF(x.wsum, 0), 0)) * GREATEST(4, x.n_sessions)))
         / GREATEST(x.last28 / 4.0, 1))::int AS weeks_estimate,
    CASE WHEN x.ncomp >= 3 AND x.n_sessions >= 6 THEN 'high'
         WHEN x.ncomp >= 2 THEN 'medium'
         ELSE 'low' END,
    ROUND(100 * COALESCE(x.wval / NULLIF(x.wsum, 0), 0))::int AS progress_pct,
    jsonb_build_object(
      'pain', CASE WHEN x.pain_c IS NULL THEN NULL ELSE ROUND(x.pain_c * 100)::int END,
      'steps', CASE WHEN x.steps_c IS NULL THEN NULL ELSE ROUND(x.steps_c * 100)::int END,
      'load', CASE WHEN x.load_c IS NULL THEN NULL ELSE ROUND(x.load_c * 100)::int END,
      'readiness', CASE WHEN x.ready_c IS NULL THEN NULL ELSE ROUND(x.ready_c * 100)::int END
    )
  FROM calc x
  ORDER BY progress_pct DESC, x.n_sessions DESC
  LIMIT 30;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_discharge_predictions(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_discharge_predictions(uuid, uuid) TO authenticated;

-- 4) ADESÃO: sem diário nem mensagens; entra consistência de check-ins -------
DROP FUNCTION IF EXISTS public.get_patient_adherence_scores(uuid, uuid);
CREATE FUNCTION public.get_patient_adherence_scores(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  patient_email text,
  patient_name text,
  score int,
  exercises_pct int,
  checkin_pct int,
  attendance_pct int
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _clinic_id IS NOT NULL THEN
    IF NOT public.is_clinic_member(auth.uid(), _clinic_id) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSIF _professional_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = _professional_id AND p.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Not authorized';
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
      AND pa.appointment_date >= CURRENT_DATE - 60
      AND ((_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id AND pa.clinic_id IS NULL))
    GROUP BY 1
    UNION
    SELECT LOWER(sn.patient_email), MAX(NULL::text)
    FROM public.session_notes sn
    WHERE sn.patient_email IS NOT NULL AND sn.patient_email <> ''
      AND sn.session_date >= CURRENT_DATE - 60
      AND ((_clinic_id IS NOT NULL AND sn.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND sn.professional_id = _professional_id AND sn.clinic_id IS NULL))
    GROUP BY 1
  ),
  attendance AS (
    SELECT LOWER(pa.patient_email) AS email_key,
           CASE WHEN COUNT(*) FILTER (WHERE pa.status IN ('completed','no_show','no_show_justified','cancelled')) > 0
                THEN ROUND(100.0 * COUNT(*) FILTER (WHERE pa.status = 'completed')
                           / COUNT(*) FILTER (WHERE pa.status IN ('completed','no_show','no_show_justified','cancelled')))::int
                ELSE NULL END AS attendance_pct
    FROM public.professional_appointments pa
    WHERE pa.patient_email IS NOT NULL
      AND pa.appointment_date >= CURRENT_DATE - 60
      AND ((_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id AND pa.clinic_id IS NULL))
    GROUP BY LOWER(pa.patient_email)
  ),
  checkins AS (
    SELECT LOWER(pt.email) AS email_key,
           LEAST(100, ROUND(100.0 * COUNT(DISTINCT rc.checkin_date) / 14.0)::int) AS checkin_pct
    FROM public.readiness_checkins rc
    JOIN public.patients pt ON pt.id = rc.patient_id
    WHERE rc.checkin_date >= CURRENT_DATE - 14
      AND pt.email IS NOT NULL
    GROUP BY LOWER(pt.email)
  ),
  exercises AS (
    SELECT LOWER(au.email) AS email_key,
           LEAST(100, ROUND(100.0 * COUNT(DISTINCT ec.completed_at::date) / 14.0)::int) AS exercises_pct
    FROM public.exercise_completions ec
    JOIN auth.users au ON au.id = ec.user_id
    WHERE ec.completed_at >= now() - INTERVAL '14 days'
    GROUP BY LOWER(au.email)
  )
  SELECT
    k.email_key,
    MAX(k.pname),
    ROUND(
      (COALESCE(e.exercises_pct, 0) * 45 + COALESCE(ch.checkin_pct, 0) * 25 + COALESCE(a.attendance_pct, 0) * 30)
      / NULLIF((e.exercises_pct IS NOT NULL)::int * 45 + (ch.checkin_pct IS NOT NULL)::int * 25 + (a.attendance_pct IS NOT NULL)::int * 30, 0)
    )::int AS score,
    COALESCE(e.exercises_pct, 0),
    COALESCE(ch.checkin_pct, 0),
    COALESCE(a.attendance_pct, 0)
  FROM keys k
  LEFT JOIN attendance a ON a.email_key = k.email_key
  LEFT JOIN checkins ch ON ch.email_key = k.email_key
  LEFT JOIN exercises e ON e.email_key = k.email_key
  WHERE a.attendance_pct IS NOT NULL OR ch.checkin_pct IS NOT NULL OR e.exercises_pct IS NOT NULL
  GROUP BY k.email_key, e.exercises_pct, ch.checkin_pct, a.attendance_pct
  ORDER BY score DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_patient_adherence_scores(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_patient_adherence_scores(uuid, uuid) TO authenticated;

-- 5) REATIVAÇÃO: evolução registrada também conta como última sessão ---------
CREATE OR REPLACE FUNCTION public.get_reactivation_candidates(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(patient_email text, patient_name text, last_session_date date, days_inactive integer)
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
  WITH appts AS (
    SELECT LOWER(pa.patient_email) AS email_key,
           MAX(pa.patient_name) AS pname,
           MAX(CASE WHEN pa.status = 'completed' AND pa.appointment_date <= CURRENT_DATE
                    THEN pa.appointment_date END) AS last_done,
           MIN(CASE WHEN pa.status = 'scheduled' AND pa.appointment_date >= CURRENT_DATE
                    THEN pa.appointment_date END) AS next_scheduled,
           COUNT(*) FILTER (WHERE pa.status = 'completed') AS done_appts
    FROM public.professional_appointments pa
    WHERE pa.patient_email IS NOT NULL AND pa.patient_email <> ''
      AND ((_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id AND pa.clinic_id IS NULL))
    GROUP BY LOWER(pa.patient_email)
  ),
  notes AS (
    SELECT LOWER(sn.patient_email) AS email_key,
           MAX(sn.session_date) AS last_note,
           COUNT(DISTINCT sn.session_date) AS note_days
    FROM public.session_notes sn
    WHERE sn.patient_email IS NOT NULL AND sn.patient_email <> ''
      AND sn.session_date <= CURRENT_DATE
      AND ((_clinic_id IS NOT NULL AND sn.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND sn.professional_id = _professional_id AND sn.clinic_id IS NULL))
    GROUP BY LOWER(sn.patient_email)
  ),
  merged AS (
    SELECT COALESCE(a.email_key, n.email_key) AS email_key,
           a.pname,
           GREATEST(a.last_done, n.last_note) AS last_done,
           a.next_scheduled,
           (COALESCE(a.done_appts, 0) + COALESCE(n.note_days, 0))::int AS total_done
    FROM appts a
    FULL JOIN notes n ON n.email_key = a.email_key
  )
  SELECT m.email_key,
         m.pname,
         m.last_done,
         (CURRENT_DATE - m.last_done)::int AS days_inactive
  FROM merged m
  WHERE m.last_done IS NOT NULL
    AND m.total_done >= 2
    AND m.next_scheduled IS NULL
    AND m.last_done BETWEEN CURRENT_DATE - 180 AND CURRENT_DATE - 30
  ORDER BY m.last_done DESC
  LIMIT 20;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_reactivation_candidates(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_reactivation_candidates(uuid, uuid) TO authenticated;