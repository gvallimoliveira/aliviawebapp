
-- Revenue goal + session price columns
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS monthly_revenue_goal numeric;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS default_session_price numeric;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS monthly_revenue_goal numeric;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS default_session_price numeric;

-- ============================================================
-- 1) CHURN RISK
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_patient_churn_risk(
  _clinic_id uuid DEFAULT NULL,
  _professional_id uuid DEFAULT NULL
)
RETURNS TABLE(
  patient_email text,
  patient_name text,
  professional_id uuid,
  score int,
  reasons jsonb,
  last_session_date date,
  next_session_date date
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization
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
    SELECT pa.patient_email, pa.patient_name, pa.professional_id,
           pa.appointment_date, pa.status
    FROM public.professional_appointments pa
    WHERE pa.patient_email IS NOT NULL
      AND (
        (_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id)
      )
  ),
  patients_set AS (
    SELECT DISTINCT LOWER(patient_email) AS email_key,
           MAX(patient_name) AS patient_name,
           MAX(professional_id) AS professional_id
    FROM base_appts
    GROUP BY LOWER(patient_email)
  ),
  last_sessions AS (
    SELECT LOWER(b.patient_email) AS email_key,
           MAX(CASE WHEN b.status IN ('completed','no_show') AND b.appointment_date <= CURRENT_DATE
                    THEN b.appointment_date END) AS last_done,
           MIN(CASE WHEN b.status = 'scheduled' AND b.appointment_date >= CURRENT_DATE
                    THEN b.appointment_date END) AS next_scheduled,
           SUM(CASE WHEN b.status = 'no_show'
                     AND b.appointment_date >= CURRENT_DATE - INTERVAL '60 days' THEN 1 ELSE 0 END) AS recent_no_shows
    FROM base_appts b
    GROUP BY LOWER(b.patient_email)
  ),
  pain_trend AS (
    SELECT LOWER(au.email) AS email_key,
           AVG(CASE WHEN pde.logged_at >= CURRENT_DATE - INTERVAL '7 days' THEN pde.pain_score END) AS recent_pain,
           AVG(CASE WHEN pde.logged_at < CURRENT_DATE - INTERVAL '7 days'
                     AND pde.logged_at >= CURRENT_DATE - INTERVAL '21 days' THEN pde.pain_score END) AS prev_pain
    FROM public.pain_diary_entries pde
    JOIN auth.users au ON au.id = pde.user_id
    GROUP BY LOWER(au.email)
  ),
  msg_activity AS (
    SELECT LOWER(au.email) AS email_key,
           MAX(m.created_at) AS last_message_at
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    JOIN auth.users au ON au.id = c.patient_user_id
    GROUP BY LOWER(au.email)
  )
  SELECT
    ps.email_key AS patient_email,
    ps.patient_name,
    ps.professional_id,
    LEAST(100, (
      CASE WHEN ls.next_scheduled IS NULL
            AND (ls.last_done IS NULL OR ls.last_done < CURRENT_DATE - INTERVAL '7 days')
           THEN 40 ELSE 0 END
      + COALESCE(ls.recent_no_shows, 0) * 15
      + CASE WHEN pt.recent_pain IS NOT NULL AND pt.prev_pain IS NOT NULL
              AND pt.recent_pain >= pt.prev_pain THEN 20 ELSE 0 END
      + CASE WHEN ma.last_message_at IS NULL
              OR ma.last_message_at < now() - INTERVAL '20 days' THEN 10 ELSE 0 END
    ))::int AS score,
    jsonb_build_array(
      CASE WHEN ls.next_scheduled IS NULL
            AND (ls.last_done IS NULL OR ls.last_done < CURRENT_DATE - INTERVAL '7 days')
           THEN 'Sem agendamento futuro' END,
      CASE WHEN COALESCE(ls.recent_no_shows, 0) > 0
           THEN ls.recent_no_shows || ' falta(s) recente(s)' END,
      CASE WHEN pt.recent_pain IS NOT NULL AND pt.prev_pain IS NOT NULL
            AND pt.recent_pain >= pt.prev_pain THEN 'Dor estagnada/aumentando' END,
      CASE WHEN ma.last_message_at IS NULL
            OR ma.last_message_at < now() - INTERVAL '20 days' THEN 'Sem mensagens há +20 dias' END
    ) - 'null'::jsonb AS reasons,
    ls.last_done AS last_session_date,
    ls.next_scheduled AS next_session_date
  FROM patients_set ps
  LEFT JOIN last_sessions ls USING (email_key)
  LEFT JOIN pain_trend pt USING (email_key)
  LEFT JOIN msg_activity ma USING (email_key)
  WHERE (
    CASE WHEN ls.next_scheduled IS NULL
          AND (ls.last_done IS NULL OR ls.last_done < CURRENT_DATE - INTERVAL '7 days')
         THEN 40 ELSE 0 END
    + COALESCE(ls.recent_no_shows, 0) * 15
    + CASE WHEN pt.recent_pain IS NOT NULL AND pt.prev_pain IS NOT NULL
            AND pt.recent_pain >= pt.prev_pain THEN 20 ELSE 0 END
    + CASE WHEN ma.last_message_at IS NULL
            OR ma.last_message_at < now() - INTERVAL '20 days' THEN 10 ELSE 0 END
  ) >= 40
  ORDER BY score DESC
  LIMIT 20;
END;
$$;

-- ============================================================
-- 2) DISCHARGE PREDICTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_discharge_predictions(
  _clinic_id uuid DEFAULT NULL,
  _professional_id uuid DEFAULT NULL
)
RETURNS TABLE(
  patient_email text,
  patient_name text,
  professional_id uuid,
  sessions_done int,
  current_pain numeric,
  initial_pain numeric,
  sessions_remaining int,
  weeks_estimate numeric,
  confidence text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT pa.patient_email, pa.patient_name, pa.professional_id, pa.status
    FROM public.professional_appointments pa
    WHERE pa.patient_email IS NOT NULL
      AND (
        (_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id)
      )
  ),
  patient_sessions AS (
    SELECT LOWER(patient_email) AS email_key,
           MAX(patient_name) AS patient_name,
           MAX(professional_id) AS professional_id,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int AS done,
           SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END)::int AS scheduled
    FROM base_appts
    GROUP BY LOWER(patient_email)
  ),
  pain_data AS (
    SELECT LOWER(au.email) AS email_key,
           AVG(CASE WHEN pde.logged_at >= CURRENT_DATE - INTERVAL '7 days' THEN pde.pain_score END) AS current_pain,
           MIN(pde.pain_score) FILTER (WHERE pde.logged_at <= (
              SELECT MIN(logged_at) + INTERVAL '7 days' FROM public.pain_diary_entries pde2 WHERE pde2.user_id = pde.user_id
           )) AS initial_pain
    FROM public.pain_diary_entries pde
    JOIN auth.users au ON au.id = pde.user_id
    GROUP BY LOWER(au.email)
  )
  SELECT
    ps.email_key,
    ps.patient_name,
    ps.professional_id,
    ps.done,
    ROUND(pd.current_pain::numeric, 1),
    ROUND(pd.initial_pain::numeric, 1),
    GREATEST(1, CEIL(
      CASE
        WHEN pd.current_pain IS NULL OR pd.initial_pain IS NULL OR ps.done = 0 THEN 8
        WHEN pd.current_pain <= 2 THEN 1
        WHEN (pd.initial_pain - pd.current_pain) / NULLIF(ps.done, 0) <= 0 THEN 12
        ELSE (pd.current_pain - 2) / ((pd.initial_pain - pd.current_pain) / ps.done)
      END
    ))::int AS sessions_remaining,
    ROUND(GREATEST(1, CEIL(
      CASE
        WHEN pd.current_pain IS NULL OR pd.initial_pain IS NULL OR ps.done = 0 THEN 8
        WHEN pd.current_pain <= 2 THEN 1
        WHEN (pd.initial_pain - pd.current_pain) / NULLIF(ps.done, 0) <= 0 THEN 12
        ELSE (pd.current_pain - 2) / ((pd.initial_pain - pd.current_pain) / ps.done)
      END
    )) / 2.0, 1) AS weeks_estimate,
    CASE
      WHEN ps.done < 3 OR pd.current_pain IS NULL THEN 'low'
      WHEN ps.done >= 6 AND pd.current_pain IS NOT NULL THEN 'high'
      ELSE 'medium'
    END AS confidence
  FROM patient_sessions ps
  LEFT JOIN pain_data pd USING (email_key)
  WHERE ps.done > 0
  ORDER BY GREATEST(1, CEIL(
    CASE
      WHEN pd.current_pain IS NULL OR pd.initial_pain IS NULL OR ps.done = 0 THEN 8
      WHEN pd.current_pain <= 2 THEN 1
      WHEN (pd.initial_pain - pd.current_pain) / NULLIF(ps.done, 0) <= 0 THEN 12
      ELSE (pd.current_pain - 2) / ((pd.initial_pain - pd.current_pain) / ps.done)
    END
  ))::int ASC
  LIMIT 30;
END;
$$;

-- ============================================================
-- 3) PATIENT ADHERENCE SCORE (clinic only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_patient_adherence_scores(_clinic_id uuid)
RETURNS TABLE(
  patient_email text,
  patient_name text,
  score int,
  exercises_pct int,
  diary_pct int,
  attendance_pct int,
  messages_pct int
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_clinic_member(auth.uid(), _clinic_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH base_appts AS (
    SELECT pa.patient_email, pa.patient_name, pa.status, pa.appointment_date
    FROM public.professional_appointments pa
    WHERE pa.clinic_id = _clinic_id
      AND pa.patient_email IS NOT NULL
      AND pa.appointment_date >= CURRENT_DATE - INTERVAL '60 days'
  ),
  attendance AS (
    SELECT LOWER(patient_email) AS email_key,
           MAX(patient_name) AS patient_name,
           CASE WHEN COUNT(*) FILTER (WHERE status IN ('completed','no_show','cancelled')) > 0
                THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed')
                           / COUNT(*) FILTER (WHERE status IN ('completed','no_show','cancelled')))
                ELSE NULL END::int AS attendance_pct
    FROM base_appts
    GROUP BY LOWER(patient_email)
  ),
  user_emails AS (
    SELECT DISTINCT email_key FROM attendance
  ),
  diary AS (
    SELECT LOWER(au.email) AS email_key,
           ROUND(100.0 * COUNT(DISTINCT pde.logged_at) / 14.0)::int AS diary_pct
    FROM public.pain_diary_entries pde
    JOIN auth.users au ON au.id = pde.user_id
    WHERE pde.logged_at >= CURRENT_DATE - INTERVAL '14 days'
    GROUP BY LOWER(au.email)
  ),
  exercises AS (
    SELECT LOWER(au.email) AS email_key,
           ROUND(100.0 * COUNT(DISTINCT ec.completed_at) / 14.0)::int AS exercises_pct
    FROM public.exercise_completions ec
    JOIN auth.users au ON au.id = ec.user_id
    WHERE ec.completed_at >= CURRENT_DATE - INTERVAL '14 days'
    GROUP BY LOWER(au.email)
  ),
  messages_read AS (
    SELECT LOWER(au.email) AS email_key,
           CASE WHEN COUNT(*) > 0
                THEN ROUND(100.0 * COUNT(*) FILTER (WHERE m.read_at IS NOT NULL) / COUNT(*))
                ELSE NULL END::int AS messages_pct
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    JOIN auth.users au ON au.id = c.patient_user_id
    WHERE m.sender_user_id <> c.patient_user_id
      AND m.created_at >= now() - INTERVAL '30 days'
    GROUP BY LOWER(au.email)
  )
  SELECT
    a.email_key,
    a.patient_name,
    LEAST(100, (
      COALESCE(LEAST(e.exercises_pct, 100), 0) * 0.4
      + COALESCE(LEAST(d.diary_pct, 100), 0) * 0.25
      + COALESCE(a.attendance_pct, 0) * 0.25
      + COALESCE(mr.messages_pct, 0) * 0.10
    ))::int AS score,
    COALESCE(LEAST(e.exercises_pct, 100), 0),
    COALESCE(LEAST(d.diary_pct, 100), 0),
    COALESCE(a.attendance_pct, 0),
    COALESCE(mr.messages_pct, 0)
  FROM attendance a
  LEFT JOIN diary d USING (email_key)
  LEFT JOIN exercises e USING (email_key)
  LEFT JOIN messages_read mr USING (email_key)
  ORDER BY score DESC;
END;
$$;

-- ============================================================
-- 4) CLINIC BENCHMARKS (anonymous, peer comparison)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_clinic_benchmarks(_clinic_id uuid)
RETURNS TABLE(
  metric text,
  clinic_value numeric,
  peer_avg numeric,
  peer_count int,
  size_bucket text,
  better_when_lower boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bucket text;
  _therapist_count int;
BEGIN
  IF NOT public.can_manage_clinic(auth.uid(), _clinic_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT count(*)::int INTO _therapist_count
  FROM public.clinic_members
  WHERE clinic_id = _clinic_id AND status = 'active'
    AND role IN ('owner','therapist');

  _bucket := CASE
    WHEN _therapist_count <= 3 THEN 'small'
    WHEN _therapist_count <= 10 THEN 'medium'
    ELSE 'large'
  END;

  RETURN QUERY
  WITH all_clinics AS (
    SELECT c.id,
      (SELECT count(*) FROM public.clinic_members cm
       WHERE cm.clinic_id = c.id AND cm.status='active' AND cm.role IN ('owner','therapist'))::int AS th
    FROM public.clinics c
    WHERE c.subscription_status IN ('active','trialing')
  ),
  bucketed AS (
    SELECT id FROM all_clinics
    WHERE CASE WHEN th <= 3 THEN 'small' WHEN th <= 10 THEN 'medium' ELSE 'large' END = _bucket
  ),
  per_clinic AS (
    SELECT b.id AS clinic_id,
      -- no-show rate
      (SELECT CASE WHEN COUNT(*) FILTER (WHERE status IN ('completed','no_show','cancelled')) > 0
                   THEN 100.0 * COUNT(*) FILTER (WHERE status = 'no_show')
                        / COUNT(*) FILTER (WHERE status IN ('completed','no_show','cancelled'))
                   ELSE NULL END
       FROM public.professional_appointments pa
       WHERE pa.clinic_id = b.id
         AND pa.appointment_date >= CURRENT_DATE - INTERVAL '60 days') AS no_show_rate,
      -- occupancy: completed / (therapists * 8 * 22)
      (SELECT CASE WHEN ((SELECT count(*) FROM public.clinic_members cm
                          WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist'))) > 0
                   THEN LEAST(100, 100.0 * COUNT(*) FILTER (WHERE status='completed')
                       / NULLIF(((SELECT count(*) FROM public.clinic_members cm
                                  WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist'))) * 8 * 22, 0))
                   ELSE NULL END
       FROM public.professional_appointments pa
       WHERE pa.clinic_id = b.id
         AND pa.appointment_date >= date_trunc('month', now())::date) AS occupancy,
      -- assessments per therapist this month
      (SELECT CASE WHEN ((SELECT count(*) FROM public.clinic_members cm
                          WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist'))) > 0
                   THEN COUNT(*)::numeric
                        / NULLIF((SELECT count(*) FROM public.clinic_members cm
                                  WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist')), 0)
                   ELSE NULL END
       FROM public.assessments a
       WHERE a.clinic_id = b.id
         AND a.created_at >= date_trunc('month', now())) AS assess_per_th
    FROM bucketed b
  ),
  peer_avg AS (
    SELECT
      AVG(no_show_rate) AS no_show_rate,
      AVG(occupancy) AS occupancy,
      AVG(assess_per_th) AS assess_per_th,
      COUNT(*)::int AS peer_count
    FROM per_clinic
  ),
  this_clinic AS (
    SELECT no_show_rate, occupancy, assess_per_th
    FROM per_clinic WHERE clinic_id = _clinic_id
  )
  SELECT 'no_show_rate'::text, ROUND(tc.no_show_rate::numeric, 1), ROUND(pa.no_show_rate::numeric, 1), pa.peer_count, _bucket, true
  FROM this_clinic tc, peer_avg pa
  UNION ALL
  SELECT 'occupancy', ROUND(tc.occupancy::numeric, 1), ROUND(pa.occupancy::numeric, 1), pa.peer_count, _bucket, false
  FROM this_clinic tc, peer_avg pa
  UNION ALL
  SELECT 'assessments_per_therapist', ROUND(tc.assess_per_th::numeric, 1), ROUND(pa.assess_per_th::numeric, 1), pa.peer_count, _bucket, false
  FROM this_clinic tc, peer_avg pa;
END;
$$;
