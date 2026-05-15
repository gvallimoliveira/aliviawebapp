
-- Fix 1: get_clinic_kpis — nested aggregate in status_counts
CREATE OR REPLACE FUNCTION public.get_clinic_kpis(_clinic_id uuid)
 RETURNS TABLE(today_count integer, total_this_month integer, completed_this_month integer, occupancy integer, assessments_this_month integer, therapists integer, monthly_data jsonb, status_data jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_clinic(auth.uid(), _clinic_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH params AS (
    SELECT
      date_trunc('month', now())::date AS current_month_start,
      (date_trunc('month', now()) - interval '5 months')::date AS start_month_start,
      current_date AS today,
      (date_trunc('month', now()) + interval '1 month')::date AS next_month_start
  ),
  therapists_cte AS (
    SELECT count(*)::int AS count
    FROM public.clinic_members
    WHERE clinic_id = _clinic_id
      AND status = 'active'
      AND role IN ('owner', 'therapist')
  ),
  current_month_appts AS (
    SELECT pa.status
    FROM public.professional_appointments pa
    CROSS JOIN params p
    WHERE pa.clinic_id = _clinic_id
      AND pa.appointment_date >= p.current_month_start
      AND pa.appointment_date < p.next_month_start
  ),
  current_month_assessments AS (
    SELECT count(*)::int AS count
    FROM public.assessments a
    CROSS JOIN params p
    WHERE a.clinic_id = _clinic_id
      AND a.created_at >= p.current_month_start
      AND a.created_at < p.next_month_start
  ),
  today_appts AS (
    SELECT count(*)::int AS count
    FROM public.professional_appointments pa
    CROSS JOIN params p
    WHERE pa.clinic_id = _clinic_id
      AND pa.appointment_date = p.today
  ),
  months AS (
    SELECT generate_series(
      (SELECT start_month_start::timestamp FROM params),
      (SELECT current_month_start::timestamp FROM params),
      interval '1 month'
    )::date AS month_start
  ),
  appointment_months AS (
    SELECT date_trunc('month', pa.appointment_date::timestamp)::date AS month_start, count(*)::int AS cnt
    FROM public.professional_appointments pa
    CROSS JOIN params p
    WHERE pa.clinic_id = _clinic_id
      AND pa.appointment_date >= p.start_month_start
    GROUP BY 1
  ),
  assessment_months AS (
    SELECT date_trunc('month', a.created_at)::date AS month_start, count(*)::int AS cnt
    FROM public.assessments a
    CROSS JOIN params p
    WHERE a.clinic_id = _clinic_id
      AND a.created_at >= p.start_month_start
    GROUP BY 1
  ),
  monthly AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'month_start', m.month_start,
        'atendimentos', COALESCE(am.cnt, 0),
        'avaliacoes', COALESCE(asm.cnt, 0)
      )
      ORDER BY m.month_start
    ) AS data
    FROM months m
    LEFT JOIN appointment_months am USING (month_start)
    LEFT JOIN assessment_months asm USING (month_start)
  ),
  status_grouped AS (
    SELECT pa.status, count(*)::int AS value
    FROM public.professional_appointments pa
    CROSS JOIN params p
    WHERE pa.clinic_id = _clinic_id
      AND pa.appointment_date >= p.start_month_start
    GROUP BY pa.status
  ),
  status_counts AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', CASE sg.status
          WHEN 'scheduled' THEN 'Agendado'
          WHEN 'completed' THEN 'Concluído'
          WHEN 'cancelled' THEN 'Cancelado'
          WHEN 'no_show' THEN 'Não compareceu'
          ELSE COALESCE(sg.status, 'Agendado')
        END,
        'value', sg.value
      )
      ORDER BY CASE sg.status
        WHEN 'scheduled' THEN 1
        WHEN 'completed' THEN 2
        WHEN 'cancelled' THEN 3
        WHEN 'no_show' THEN 4
        ELSE 5
      END
    ) AS data
    FROM status_grouped sg
  )
  SELECT
    COALESCE((SELECT count FROM today_appts), 0),
    COALESCE((SELECT count(*)::int FROM current_month_appts), 0),
    COALESCE((SELECT count(*)::int FROM current_month_appts WHERE status = 'completed'), 0),
    LEAST(
      CASE
        WHEN COALESCE((SELECT count FROM therapists_cte), 0) > 0
          THEN ROUND(((SELECT count(*)::numeric FROM current_month_appts) / (((SELECT count FROM therapists_cte) * 8 * 22)::numeric)) * 100)::int
        ELSE 0
      END,
      100
    ),
    COALESCE((SELECT count FROM current_month_assessments), 0),
    COALESCE((SELECT count FROM therapists_cte), 0),
    COALESCE((SELECT data FROM monthly), '[]'::jsonb),
    COALESCE((SELECT data FROM status_counts), '[]'::jsonb);
END;
$function$;

-- Fix 2: get_patient_churn_risk — qualify all references to avoid OUT parameter shadowing
CREATE OR REPLACE FUNCTION public.get_patient_churn_risk(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(patient_email text, patient_name text, professional_id uuid, score integer, reasons jsonb, last_session_date date, next_session_date date)
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
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id)
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
    ps.email_key,
    ps.pname,
    ps.pid,
    LEAST(100, (
      CASE WHEN ls.next_scheduled IS NULL
            AND (ls.last_done IS NULL OR ls.last_done < CURRENT_DATE - INTERVAL '7 days')
           THEN 40 ELSE 0 END
      + COALESCE(ls.recent_no_shows, 0) * 15
      + CASE WHEN pt.recent_pain IS NOT NULL AND pt.prev_pain IS NOT NULL
              AND pt.recent_pain >= pt.prev_pain THEN 20 ELSE 0 END
      + CASE WHEN ma.last_message_at IS NULL
              OR ma.last_message_at < now() - INTERVAL '20 days' THEN 10 ELSE 0 END
    ))::int,
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
    ) - 'null'::jsonb,
    ls.last_done,
    ls.next_scheduled
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
  ORDER BY 4 DESC
  LIMIT 20;
END;
$function$;

-- Fix 3: get_discharge_predictions — qualify references and avoid nested aggregate in pain_data
CREATE OR REPLACE FUNCTION public.get_discharge_predictions(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(patient_email text, patient_name text, professional_id uuid, sessions_done integer, current_pain numeric, initial_pain numeric, sessions_remaining integer, weeks_estimate numeric, confidence text)
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
    SELECT pa.patient_email AS pemail, pa.patient_name AS pname, pa.professional_id AS pid, pa.status AS astatus
    FROM public.professional_appointments pa
    WHERE pa.patient_email IS NOT NULL
      AND (
        (_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id)
        OR (_professional_id IS NOT NULL AND pa.professional_id = _professional_id)
      )
  ),
  patient_sessions AS (
    SELECT LOWER(b.pemail) AS email_key,
           MAX(b.pname) AS pname,
           MAX(b.pid) AS pid,
           SUM(CASE WHEN b.astatus = 'completed' THEN 1 ELSE 0 END)::int AS done,
           SUM(CASE WHEN b.astatus = 'scheduled' THEN 1 ELSE 0 END)::int AS scheduled
    FROM base_appts b
    GROUP BY LOWER(b.pemail)
  ),
  user_first_log AS (
    SELECT pde.user_id, MIN(pde.logged_at) AS first_log
    FROM public.pain_diary_entries pde
    GROUP BY pde.user_id
  ),
  pain_data AS (
    SELECT LOWER(au.email) AS email_key,
           AVG(CASE WHEN pde.logged_at >= CURRENT_DATE - INTERVAL '7 days' THEN pde.pain_score END) AS curp,
           MIN(CASE WHEN pde.logged_at <= ufl.first_log + INTERVAL '7 days' THEN pde.pain_score END) AS initp
    FROM public.pain_diary_entries pde
    JOIN auth.users au ON au.id = pde.user_id
    JOIN user_first_log ufl ON ufl.user_id = pde.user_id
    GROUP BY LOWER(au.email)
  ),
  computed AS (
    SELECT ps.email_key, ps.pname, ps.pid, ps.done,
           ROUND(pd.curp::numeric, 1) AS curp,
           ROUND(pd.initp::numeric, 1) AS initp,
           GREATEST(1, CEIL(
             CASE
               WHEN pd.curp IS NULL OR pd.initp IS NULL OR ps.done = 0 THEN 8
               WHEN pd.curp <= 2 THEN 1
               WHEN (pd.initp - pd.curp) / NULLIF(ps.done, 0) <= 0 THEN 12
               ELSE (pd.curp - 2) / ((pd.initp - pd.curp) / ps.done)
             END
           ))::int AS sess_remaining,
           CASE
             WHEN ps.done < 3 OR pd.curp IS NULL THEN 'low'
             WHEN ps.done >= 6 AND pd.curp IS NOT NULL THEN 'high'
             ELSE 'medium'
           END AS conf
    FROM patient_sessions ps
    LEFT JOIN pain_data pd USING (email_key)
    WHERE ps.done > 0
  )
  SELECT c.email_key, c.pname, c.pid, c.done, c.curp, c.initp,
         c.sess_remaining,
         ROUND(c.sess_remaining / 2.0, 1),
         c.conf
  FROM computed c
  ORDER BY c.sess_remaining ASC
  LIMIT 30;
END;
$function$;
