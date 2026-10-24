-- 3) REAVALIAÇÃO PROGRAMADA
CREATE OR REPLACE FUNCTION public.get_reassessment_due(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(patient_id uuid, patient_name text, last_assessment_date date, days_since integer, sessions_since integer)
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
  last_assess AS (
    SELECT pset.pid,
           MAX(a.created_at)::date AS last_date
    FROM pset
    JOIN public.assessments a ON LOWER(a.patient_email) = pset.email_key
    WHERE a.status = 'completed'
      AND (
        (_clinic_id IS NOT NULL AND a.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND a.professional_id = _professional_id AND a.clinic_id IS NULL)
      )
    GROUP BY pset.pid
  ),
  evolutions AS (
    SELECT pset.pid,
           COUNT(*)::int AS sessions_since
    FROM pset
    JOIN last_assess la ON la.pid = pset.pid
    JOIN public.session_notes sn ON LOWER(sn.patient_email) = pset.email_key
    WHERE sn.session_date > la.last_date
      AND (
        (_clinic_id IS NOT NULL AND sn.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND sn.professional_id = _professional_id AND sn.clinic_id IS NULL)
      )
    GROUP BY pset.pid
  )
  SELECT pset.pid,
         pset.pname,
         la.last_date,
         (CURRENT_DATE - la.last_date)::int AS days_since,
         COALESCE(ev.sessions_since, 0)
  FROM pset
  JOIN last_assess la ON la.pid = pset.pid
  LEFT JOIN evolutions ev ON ev.pid = pset.pid
  WHERE (CURRENT_DATE - la.last_date) >= 28
     OR COALESCE(ev.sessions_since, 0) >= 8
  ORDER BY (CURRENT_DATE - la.last_date) DESC
  LIMIT 20;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_reassessment_due(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_reassessment_due(uuid, uuid) TO authenticated;

-- 4) FASE DO STEPS
CREATE OR REPLACE FUNCTION public.get_steps_phase_overview(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(patient_id uuid, patient_name text, plan_title text, phase_name text, phase_goal text, weeks_in_phase integer, sort_order integer, total_phases integer)
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
  WITH plans AS (
    SELECT pp.id AS plan_id, pp.patient_id AS pid, pp.title
    FROM public.periodization_plans pp
    WHERE pp.status = 'active'
      AND (
        (_clinic_id IS NOT NULL AND pp.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pp.professional_id = _professional_id AND pp.clinic_id IS NULL)
      )
  ),
  current_phase AS (
    SELECT pc.plan_id, pc.name, pc.goal, pc.sort_order, pc.marked_current_at, pc.created_at
    FROM public.periodization_cycles pc
    JOIN plans ON plans.plan_id = pc.plan_id
    WHERE pc.level = 'macro' AND pc.is_current = true
  ),
  totals AS (
    SELECT pc.plan_id, COUNT(*)::int AS total
    FROM public.periodization_cycles pc
    JOIN plans ON plans.plan_id = pc.plan_id
    WHERE pc.level = 'macro'
    GROUP BY pc.plan_id
  )
  SELECT plans.pid,
         pt.full_name,
         plans.title,
         cp.name,
         cp.goal,
         GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(cp.marked_current_at, cp.created_at))) / 604800))::int AS weeks_in_phase,
         cp.sort_order,
         t.total
  FROM plans
  JOIN current_phase cp ON cp.plan_id = plans.plan_id
  JOIN totals t ON t.plan_id = plans.plan_id
  JOIN public.patients pt ON pt.id = plans.pid
  ORDER BY weeks_in_phase DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_steps_phase_overview(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_steps_phase_overview(uuid, uuid) TO authenticated;

-- 5) REATIVAÇÃO DE INATIVOS
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
  WITH base AS (
    SELECT LOWER(pa.patient_email) AS email_key,
           MAX(pa.patient_name) AS pname,
           MAX(CASE WHEN pa.status = 'completed' AND pa.appointment_date <= CURRENT_DATE
                    THEN pa.appointment_date END) AS last_done,
           MIN(CASE WHEN pa.status = 'scheduled' AND pa.appointment_date >= CURRENT_DATE
                    THEN pa.appointment_date END) AS next_scheduled,
           COUNT(*) FILTER (WHERE pa.status = 'completed') AS total_done
    FROM public.professional_appointments pa
    WHERE pa.patient_email IS NOT NULL
      AND (
        (_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id AND pa.clinic_id IS NULL)
      )
    GROUP BY LOWER(pa.patient_email)
  )
  SELECT b.email_key,
         b.pname,
         b.last_done,
         (CURRENT_DATE - b.last_done)::int AS days_inactive
  FROM base b
  WHERE b.last_done IS NOT NULL
    AND b.total_done >= 2
    AND b.next_scheduled IS NULL
    AND b.last_done BETWEEN CURRENT_DATE - INTERVAL '180 days' AND CURRENT_DATE - INTERVAL '30 days'
  ORDER BY b.last_done DESC
  LIMIT 20;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_reactivation_candidates(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_reactivation_candidates(uuid, uuid) TO authenticated;

-- 6) RETENÇÃO POR PROFISSIONAL (clínica)
CREATE OR REPLACE FUNCTION public.get_clinic_therapist_stats(_clinic_id uuid)
 RETURNS TABLE(professional_id uuid, professional_name text, active_patients integer, completed_30d integer, noshow_rate_30d integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_clinic_member(auth.uid(), _clinic_id) THEN
    RAISE EXCEPTION 'Not authorized for this clinic';
  END IF;

  RETURN QUERY
  WITH team AS (
    SELECT p.id AS pid, p.full_name AS pname
    FROM public.clinic_members cm
    JOIN public.professionals p ON p.user_id = cm.user_id
    WHERE cm.clinic_id = _clinic_id
      AND cm.status = 'active'
      AND cm.role IN ('owner', 'therapist')
  ),
  appts AS (
    SELECT pa.professional_id AS pid,
           COUNT(*) FILTER (WHERE pa.status = 'completed'
                             AND pa.appointment_date >= CURRENT_DATE - INTERVAL '30 days')::int AS done_30d,
           COUNT(*) FILTER (WHERE pa.status IN ('completed','no_show','cancelled')
                             AND pa.appointment_date >= CURRENT_DATE - INTERVAL '30 days')::int AS closed_30d,
           COUNT(*) FILTER (WHERE pa.status = 'no_show'
                             AND pa.appointment_date >= CURRENT_DATE - INTERVAL '30 days')::int AS noshow_30d,
           COUNT(DISTINCT LOWER(pa.patient_email)) FILTER (
             WHERE pa.appointment_date >= CURRENT_DATE - INTERVAL '30 days'
               AND pa.patient_email IS NOT NULL
           )::int AS active_patients
    FROM public.professional_appointments pa
    JOIN team ON team.pid = pa.professional_id
    WHERE pa.clinic_id = _clinic_id
    GROUP BY pa.professional_id
  )
  SELECT team.pid,
         team.pname,
         COALESCE(a.active_patients, 0),
         COALESCE(a.done_30d, 0),
         CASE WHEN COALESCE(a.closed_30d, 0) > 0
              THEN ROUND(100.0 * a.noshow_30d / a.closed_30d)::int
              ELSE 0 END
  FROM team
  LEFT JOIN appts a ON a.pid = team.pid
  ORDER BY COALESCE(a.done_30d, 0) DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_clinic_therapist_stats(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_clinic_therapist_stats(uuid) TO authenticated;

-- 7) FUNIL AVALIAÇÃO → TRATAMENTO (clínica, 90 dias)
CREATE OR REPLACE FUNCTION public.get_clinic_funnel(_clinic_id uuid)
 RETURNS TABLE(assessments_count integer, started_count integer, engaged_count integer, inactive_after_treatment integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_clinic_member(auth.uid(), _clinic_id) THEN
    RAISE EXCEPTION 'Not authorized for this clinic';
  END IF;

  RETURN QUERY
  WITH assessed AS (
    SELECT DISTINCT LOWER(a.patient_email) AS email_key
    FROM public.assessments a
    WHERE a.clinic_id = _clinic_id
      AND a.status = 'completed'
      AND a.patient_email IS NOT NULL
      AND a.created_at >= now() - INTERVAL '90 days'
  ),
  sessions AS (
    SELECT LOWER(sn.patient_email) AS email_key,
           COUNT(*) AS n,
           MAX(sn.session_date) AS last_session
    FROM public.session_notes sn
    JOIN assessed USING (email_key)
    WHERE sn.clinic_id = _clinic_id
    GROUP BY LOWER(sn.patient_email)
  )
  SELECT
    (SELECT COUNT(*)::int FROM assessed),
    (SELECT COUNT(*)::int FROM sessions),
    (SELECT COUNT(*)::int FROM sessions WHERE n >= 4),
    (SELECT COUNT(*)::int FROM sessions
      WHERE n >= 4 AND last_session < CURRENT_DATE - INTERVAL '30 days');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_clinic_funnel(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_clinic_funnel(uuid) TO authenticated;

-- 8) CONCENTRAÇÃO DE ATENDIMENTOS (clínica, 90 dias)
CREATE OR REPLACE FUNCTION public.get_clinic_patient_concentration(_clinic_id uuid)
 RETURNS TABLE(total_patients integer, total_sessions integer, top5_sessions integer, top5_share_pct integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_clinic_member(auth.uid(), _clinic_id) THEN
    RAISE EXCEPTION 'Not authorized for this clinic';
  END IF;

  RETURN QUERY
  WITH per_patient AS (
    SELECT LOWER(pa.patient_email) AS email_key,
           COUNT(*) AS n
    FROM public.professional_appointments pa
    WHERE pa.clinic_id = _clinic_id
      AND pa.status = 'completed'
      AND pa.patient_email IS NOT NULL
      AND pa.appointment_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY LOWER(pa.patient_email)
  ),
  agg AS (
    SELECT COUNT(*)::int AS patients,
           COALESCE(SUM(n), 0)::int AS sessions
    FROM per_patient
  ),
  top5 AS (
    SELECT COALESCE(SUM(n), 0)::int AS top5_sessions
    FROM (SELECT n FROM per_patient ORDER BY n DESC LIMIT 5) t
  )
  SELECT agg.patients,
         agg.sessions,
         top5.top5_sessions,
         CASE WHEN agg.sessions > 0
              THEN ROUND(100.0 * top5.top5_sessions / agg.sessions)::int
              ELSE 0 END
  FROM agg, top5;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_clinic_patient_concentration(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_clinic_patient_concentration(uuid) TO authenticated;

-- 9) ADESÃO TAMBÉM NO PRO AUTÔNOMO
DROP FUNCTION IF EXISTS public.get_patient_adherence_scores(uuid);

CREATE FUNCTION public.get_patient_adherence_scores(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
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
  WITH base_appts AS (
    SELECT pa.patient_email, pa.patient_name, pa.status, pa.appointment_date
    FROM public.professional_appointments pa
    WHERE pa.patient_email IS NOT NULL
      AND pa.appointment_date >= CURRENT_DATE - INTERVAL '60 days'
      AND (
        (_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id AND pa.clinic_id IS NULL)
      )
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
    WHERE ec.completed_at >= now() - INTERVAL '14 days'
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

REVOKE EXECUTE ON FUNCTION public.get_patient_adherence_scores(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_patient_adherence_scores(uuid, uuid) TO authenticated;