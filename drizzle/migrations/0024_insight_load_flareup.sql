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
  diary AS (
    SELECT pset.pid,
           pde.pain_score,
           pde.logged_at,
           ROW_NUMBER() OVER (PARTITION BY pset.pid ORDER BY pde.logged_at DESC) AS rn,
           AVG(pde.pain_score) OVER (PARTITION BY pset.pid) AS avg_all,
           COUNT(*) OVER (PARTITION BY pset.pid) AS entries
    FROM public.pain_diary_entries pde
    JOIN auth.users au ON au.id = pde.user_id
    JOIN pset ON pset.email_key = LOWER(au.email)
    WHERE pde.logged_at >= CURRENT_DATE - INTERVAL '30 days'
  ),
  spikes AS (
    SELECT d.pid,
           d.pain_score AS latest_pain,
           ROUND(d.avg_all, 1) AS avg_pain
    FROM diary d
    WHERE d.rn = 1
      AND d.entries >= 3
      AND d.logged_at >= CURRENT_DATE - INTERVAL '3 days'
      AND d.pain_score >= d.avg_all + 2
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
             SELECT 'Pico de dor no diário (' || m.latest_pain || ' vs média ' || m.avg_pain || ')'
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