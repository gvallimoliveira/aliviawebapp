-- Pre-hardening metric definitions and schema-only fixtures; no production patient data.
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid, email text);
CREATE TYPE clinic_role AS ENUM ('owner','therapist','secretary','osteopath','pilates_instructor','doctor','rpg_specialist','massage_therapist','admin','intern');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT current_setting('test.user_id',true)::uuid $$;
CREATE TABLE public.assessments(id uuid, user_id uuid, type text, status text, pain_regions text[], pain_score integer, anamnesis_data jsonb, test_results jsonb, diagnosis jsonb, treatment_plan jsonb, payment_status text, paid_at timestamp with time zone, redo_used boolean, original_assessment_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, professional_id uuid, patient_name text, red_flags jsonb, patient_email text, pending_upgrade_data jsonb, clinic_id uuid, reviewed_at timestamp with time zone, archived_at timestamp with time zone, final_hypothesis text, final_hypothesis_by uuid, final_hypothesis_at timestamp with time zone, needs_reimpression boolean, red_flags_dismissed_at timestamp with time zone, red_flags_dismissed_by uuid, red_flags_dismissed_by_name text, red_flags_dismissed_reason text, external_import_data jsonb, import_batch_id uuid, pain_mechanism jsonb, pain_extent numeric);
CREATE TABLE public.clinic_members(id uuid, clinic_id uuid, user_id uuid, role clinic_role, invited_by uuid, invited_at timestamp with time zone, accepted_at timestamp with time zone, status text, created_at timestamp with time zone);
CREATE TABLE public.clinics(id uuid, name text, owner_user_id uuid, subscription_status text, subscription_stripe_id text, max_members integer, logo_url text, phone text, address text, created_at timestamp with time zone, updated_at timestamp with time zone, operating_hours_start time without time zone, operating_hours_end time without time zone, working_days integer[], brand_color text, monthly_revenue_goal numeric, default_session_price numeric, saturday_hours_start time without time zone, saturday_hours_end time without time zone, cnpj text, trial_credits_cap integer, rooms_count integer);
CREATE TABLE public.exercise_completions(id uuid, user_id uuid, program_id uuid, exercise_item_id uuid, completed_at date, created_at timestamp with time zone);
CREATE TABLE public.exercise_programs(id uuid, professional_id uuid, assessment_id uuid, patient_name text, token text, notes text, created_at timestamp with time zone, expires_at timestamp with time zone, domain text, clinic_id uuid);
CREATE TABLE public.patients(id uuid, professional_id uuid, clinic_id uuid, full_name text, email text, cpf text, birth_date date, phone text, address text, created_at timestamp with time zone, updated_at timestamp with time zone, assessment_token text, sex text, occupation text, is_study_case boolean, notes text, external_import_data jsonb, import_batch_id uuid, prescribed_weekly_frequency integer, referral_source text);
CREATE TABLE public.periodization_cycles(id uuid, plan_id uuid, parent_id uuid, level text, name text, goal text, exit_criteria text, start_date date, end_date date, sort_order integer, created_at timestamp with time zone, updated_at timestamp with time zone, is_current boolean, marked_current_at timestamp with time zone);
CREATE TABLE public.periodization_plans(id uuid, patient_id uuid, professional_id uuid, clinic_id uuid, assessment_id uuid, created_by uuid, title text, sport text, injured_limb text, start_date date, end_date date, status text, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, cardio_profile text, hr_ceiling_override smallint, beta_blocker boolean);
CREATE TABLE public.periodization_sessions(id uuid, plan_id uuid, cycle_id uuid, session_date date, track text, planned_load text, title text, exercise_program_id uuid, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, patient_id uuid, planned_duration_min integer, planned_rpe numeric, created_source text, planned_target_load numeric);
CREATE TABLE public.professional_appointments(id uuid, professional_id uuid, patient_email text, patient_name text, appointment_date date, appointment_time time without time zone, duration_minutes integer, notes text, type text, status text, assessment_id uuid, created_at timestamp with time zone, clinic_id uuid, service_type text, external_import_data jsonb, import_batch_id uuid, series_id uuid, recurrence_rule jsonb, status_changed_at timestamp with time zone, service_id uuid);
CREATE TABLE public.professionals(id uuid, user_id uuid, full_name text, crefito text, specialties text[], city text, state text, bio text, phone text, email text, clinic_name text, clinic_address text, active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, approved boolean, social_media text, subscription_status text, subscription_stripe_id text, is_partner boolean, profile_photo_url text, lifetime_treatment boolean, pro_access_expires_at timestamp with time zone, logo_url text, premium_granted boolean, is_partner_account boolean, signature_image_url text, monthly_revenue_goal numeric, default_session_price numeric, cpf text, terms_accepted_at timestamp with time zone, subscription_grace_until timestamp with time zone, is_student boolean, student_institution text, student_period text, active_profile_mode text, student_name_locked boolean, academic_period integer);
CREATE TABLE public.readiness_checkins(id uuid, patient_id uuid, plan_id uuid, checkin_date date, soreness integer, sleep integer, stress integer, fatigue integer, readiness integer, pain integer, note text, source text, created_at timestamp with time zone, updated_at timestamp with time zone, resting_hr smallint, peak_hr smallint, spo2 smallint);
CREATE TABLE public.session_notes(id uuid, professional_id uuid, patient_email text, appointment_id uuid, session_date date, content text, created_at timestamp with time zone, updated_at timestamp with time zone, clinic_id uuid, external_import_data jsonb, import_batch_id uuid, observation text);
CREATE TABLE public.srpe_entries(id uuid, patient_id uuid, plan_id uuid, session_date date, track text, duration_min integer, rpe numeric, training_load numeric, source text, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, session_id uuid, hr_avg integer, hr_max integer, zone_minutes jsonb, spo2_min integer, trimp numeric, patient_rpe numeric, monitor_source text, hr_recovery_1min integer, distance_km numeric, avg_power_w integer);
CREATE FUNCTION public.is_clinic_member(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS (SELECT 1 FROM public.clinic_members WHERE user_id=$1 AND clinic_id=$2 AND status='active') $$;
CREATE FUNCTION public.can_manage_clinic(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS (SELECT 1 FROM public.clinic_members WHERE user_id=$1 AND clinic_id=$2 AND status='active' AND role IN ('owner','admin')) $$;
CREATE OR REPLACE FUNCTION public.get_clinic_kpis(_clinic_id uuid)
 RETURNS TABLE(today_count integer, total_this_month integer, completed_this_month integer, occupancy integer, assessments_this_month integer, therapists integer, monthly_data jsonb, status_data jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_clinic(auth.uid(), _clinic_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  WITH params AS (
    SELECT date_trunc('month', now())::date AS current_month_start,
      (date_trunc('month', now()) - interval '5 months')::date AS start_month_start,
      current_date AS today,
      (date_trunc('month', now()) + interval '1 month')::date AS next_month_start
  ),
  therapists_cte AS (
    SELECT count(*)::int AS count FROM public.clinic_members
      WHERE clinic_id = _clinic_id AND status='active' AND role IN ('owner','therapist','intern')
  ),
  current_month_appts AS (
    SELECT pa.status FROM public.professional_appointments pa CROSS JOIN params p
      WHERE pa.clinic_id = _clinic_id AND pa.appointment_date >= p.current_month_start AND pa.appointment_date < p.next_month_start
  ),
  current_month_assessments AS (
    SELECT count(*)::int AS count FROM public.assessments a CROSS JOIN params p
      WHERE a.clinic_id = _clinic_id AND a.created_at >= p.current_month_start AND a.created_at < p.next_month_start
  ),
  today_appts AS (
    SELECT count(*)::int AS count FROM public.professional_appointments pa CROSS JOIN params p
      WHERE pa.clinic_id = _clinic_id AND pa.appointment_date = p.today
  ),
  months AS (
    SELECT generate_series((SELECT start_month_start::timestamp FROM params),
      (SELECT current_month_start::timestamp FROM params), interval '1 month')::date AS month_start
  ),
  appointment_months AS (
    SELECT date_trunc('month', pa.appointment_date::timestamp)::date AS month_start, count(*)::int AS cnt
      FROM public.professional_appointments pa CROSS JOIN params p
      WHERE pa.clinic_id = _clinic_id AND pa.appointment_date >= p.start_month_start GROUP BY 1
  ),
  assessment_months AS (
    SELECT date_trunc('month', a.created_at)::date AS month_start, count(*)::int AS cnt
      FROM public.assessments a CROSS JOIN params p
      WHERE a.clinic_id = _clinic_id AND a.created_at >= p.start_month_start GROUP BY 1
  ),
  monthly AS (
    SELECT jsonb_agg(jsonb_build_object('month_start', m.month_start,
      'atendimentos', COALESCE(am.cnt,0), 'avaliacoes', COALESCE(asm.cnt,0)) ORDER BY m.month_start) AS data
    FROM months m LEFT JOIN appointment_months am USING (month_start) LEFT JOIN assessment_months asm USING (month_start)
  ),
  status_grouped AS (
    SELECT pa.status, count(*)::int AS value FROM public.professional_appointments pa CROSS JOIN params p
      WHERE pa.clinic_id = _clinic_id AND pa.appointment_date >= p.start_month_start GROUP BY pa.status
  ),
  status_counts AS (
    SELECT jsonb_agg(jsonb_build_object('name',
      CASE sg.status WHEN 'scheduled' THEN 'Agendado' WHEN 'completed' THEN 'Concluído'
        WHEN 'cancelled' THEN 'Cancelado' WHEN 'no_show' THEN 'Não compareceu'
        ELSE COALESCE(sg.status,'Agendado') END, 'value', sg.value)
      ORDER BY CASE sg.status WHEN 'scheduled' THEN 1 WHEN 'completed' THEN 2 WHEN 'cancelled' THEN 3 WHEN 'no_show' THEN 4 ELSE 5 END) AS data
    FROM status_grouped sg
  )
  SELECT COALESCE((SELECT count FROM today_appts),0),
    COALESCE((SELECT count(*)::int FROM current_month_appts),0),
    COALESCE((SELECT count(*)::int FROM current_month_appts WHERE status='completed'),0),
    LEAST(CASE WHEN COALESCE((SELECT count FROM therapists_cte),0) > 0
      THEN ROUND(((SELECT count(*)::numeric FROM current_month_appts) / (((SELECT count FROM therapists_cte) * 8 * 22)::numeric)) * 100)::int
      ELSE 0 END, 100),
    COALESCE((SELECT count FROM current_month_assessments),0),
    COALESCE((SELECT count FROM therapists_cte),0),
    COALESCE((SELECT data FROM monthly),'[]'::jsonb),
    COALESCE((SELECT data FROM status_counts),'[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_clinic_benchmarks(_clinic_id uuid)
 RETURNS TABLE(metric text, clinic_value numeric, peer_avg numeric, peer_count integer, size_bucket text, better_when_lower boolean, small_avg numeric, small_count integer, medium_avg numeric, medium_count integer, large_avg numeric, large_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _bucket text; _therapist_count int;
BEGIN
  IF NOT public.can_manage_clinic(auth.uid(), _clinic_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT count(*)::int INTO _therapist_count FROM public.clinic_members
    WHERE clinic_id = _clinic_id AND status='active' AND role IN ('owner','therapist','intern');
  _bucket := CASE WHEN _therapist_count <= 3 THEN 'small' WHEN _therapist_count <= 10 THEN 'medium' ELSE 'large' END;
  RETURN QUERY
  WITH all_clinics AS (
    SELECT c.id, (SELECT count(*) FROM public.clinic_members cm
      WHERE cm.clinic_id = c.id AND cm.status='active' AND cm.role IN ('owner','therapist','intern'))::int AS th
    FROM public.clinics c WHERE c.subscription_status IN ('active','trialing')
  ),
  bucketed AS (
    SELECT id, CASE WHEN th <= 3 THEN 'small' WHEN th <= 10 THEN 'medium' ELSE 'large' END AS bkt FROM all_clinics
  ),
  per_clinic AS (
    SELECT b.id AS clinic_id, b.bkt,
      (SELECT CASE WHEN COUNT(*) FILTER (WHERE status IN ('completed','no_show','cancelled')) > 0
        THEN 100.0 * COUNT(*) FILTER (WHERE status='no_show')
          / COUNT(*) FILTER (WHERE status IN ('completed','no_show','cancelled')) ELSE NULL END
       FROM public.professional_appointments pa
       WHERE pa.clinic_id = b.id AND pa.appointment_date >= CURRENT_DATE - INTERVAL '60 days') AS no_show_rate,
      (SELECT CASE WHEN ((SELECT count(*) FROM public.clinic_members cm
        WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist','intern'))) > 0
        THEN LEAST(100, 100.0 * COUNT(*) FILTER (WHERE status='completed')
          / NULLIF(((SELECT count(*) FROM public.clinic_members cm
            WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist','intern'))) * 8 * 22, 0))
        ELSE NULL END
       FROM public.professional_appointments pa
       WHERE pa.clinic_id = b.id AND pa.appointment_date >= date_trunc('month', now())::date) AS occupancy,
      (SELECT CASE WHEN ((SELECT count(*) FROM public.clinic_members cm
        WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist','intern'))) > 0
        THEN COUNT(*)::numeric / NULLIF((SELECT count(*) FROM public.clinic_members cm
          WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist','intern')), 0)
        ELSE NULL END
       FROM public.assessments a WHERE a.clinic_id = b.id AND a.created_at >= date_trunc('month', now())) AS assessments_per_th
    FROM bucketed b
  ),
  metrics AS (
    SELECT 'no_show_rate'::text AS metric, no_show_rate AS val, bkt, clinic_id FROM per_clinic
    UNION ALL SELECT 'occupancy'::text, occupancy, bkt, clinic_id FROM per_clinic
    UNION ALL SELECT 'assessments_per_therapist'::text, assessments_per_th, bkt, clinic_id FROM per_clinic
  ),
  bucket_stats AS (
    SELECT metric AS m, bkt, AVG(val) FILTER (WHERE val IS NOT NULL) AS avg_val,
      COUNT(*) FILTER (WHERE val IS NOT NULL)::int AS cnt
    FROM metrics GROUP BY metric, bkt
  ),
  pivoted AS (
    SELECT m AS metric,
      MAX(CASE WHEN bkt='small' THEN avg_val END) AS small_a, MAX(CASE WHEN bkt='small' THEN cnt END) AS small_c,
      MAX(CASE WHEN bkt='medium' THEN avg_val END) AS medium_a, MAX(CASE WHEN bkt='medium' THEN cnt END) AS medium_c,
      MAX(CASE WHEN bkt='large' THEN avg_val END) AS large_a, MAX(CASE WHEN bkt='large' THEN cnt END) AS large_c
    FROM bucket_stats GROUP BY m
  )
  SELECT p.metric,
    (SELECT val FROM metrics WHERE metrics.metric = p.metric AND metrics.clinic_id = _clinic_id LIMIT 1) AS clinic_value,
    (CASE _bucket WHEN 'small' THEN p.small_a WHEN 'medium' THEN p.medium_a ELSE p.large_a END)::numeric AS peer_avg,
    (CASE _bucket WHEN 'small' THEN COALESCE(p.small_c,0) WHEN 'medium' THEN COALESCE(p.medium_c,0) ELSE COALESCE(p.large_c,0) END)::int AS peer_count,
    _bucket AS size_bucket,
    (CASE p.metric WHEN 'no_show_rate' THEN true ELSE false END) AS better_when_lower,
    p.small_a::numeric, COALESCE(p.small_c,0)::int,
    p.medium_a::numeric, COALESCE(p.medium_c,0)::int,
    p.large_a::numeric, COALESCE(p.large_c,0)::int
  FROM pivoted p;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.get_discharge_predictions(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(patient_email text, patient_name text, professional_id uuid, sessions_done integer, current_pain numeric, initial_pain numeric, sessions_remaining integer, weeks_estimate integer, confidence text, progress_pct integer, factors jsonb)
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

CREATE OR REPLACE FUNCTION public.get_patient_adherence_scores(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(patient_email text, patient_name text, score integer, exercises_pct integer, checkin_pct integer, attendance_pct integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF _clinic_id IS NOT NULL THEN
  IF NOT public.is_clinic_member(auth.uid(), _clinic_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 ELSIF _professional_id IS NOT NULL THEN
  IF NOT EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=_professional_id AND p.user_id=auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 ELSE RAISE EXCEPTION 'clinic_id or professional_id required'; END IF;
 RETURN QUERY
 WITH clock AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS today),
 pts AS (
  SELECT pt.id, COALESCE(NULLIF(lower(trim(pt.email)),''),'patient:'||pt.id::text) AS k, pt.full_name AS nm
  FROM public.patients pt WHERE pt.is_study_case IS NOT TRUE AND
   ((_clinic_id IS NOT NULL AND pt.clinic_id=_clinic_id) OR (_clinic_id IS NULL AND pt.clinic_id IS NULL AND pt.professional_id=_professional_id))
 ), slots AS (
  SELECT pa.* FROM public.professional_appointments pa, clock c
  WHERE pa.appointment_date BETWEEN c.today-59 AND c.today AND COALESCE(pa.service_type,'')<>'compromisso' AND
   ((_clinic_id IS NOT NULL AND pa.clinic_id=_clinic_id) OR (_clinic_id IS NULL AND pa.clinic_id IS NULL AND pa.professional_id=_professional_id))
 ), keys AS (
  SELECT p.k,p.nm FROM pts p
  UNION ALL SELECT lower(trim(s.patient_email)),s.patient_name FROM slots s WHERE NULLIF(trim(s.patient_email),'') IS NOT NULL
  UNION ALL SELECT lower(trim(n.patient_email)),NULL::text FROM public.session_notes n,clock c
   WHERE n.session_date BETWEEN c.today-59 AND c.today AND NULLIF(trim(n.patient_email),'') IS NOT NULL AND
   ((_clinic_id IS NOT NULL AND n.clinic_id=_clinic_id) OR (_clinic_id IS NULL AND n.clinic_id IS NULL AND n.professional_id=_professional_id))
 ), attendance AS (
  SELECT lower(trim(s.patient_email)) AS k,
   round(100.0*count(*) FILTER(WHERE s.status='completed')/NULLIF(count(*) FILTER(WHERE s.status IN ('completed','no_show','no_show_justified','cancelled')),0))::int AS pct
  FROM slots s WHERE NULLIF(trim(s.patient_email),'') IS NOT NULL GROUP BY 1
 ), checkins AS (
  SELECT p.k,least(100,round(100.0*count(DISTINCT rc.checkin_date) FILTER(WHERE rc.checkin_date>=c.today-13)/14))::int AS pct
  FROM pts p JOIN public.readiness_checkins rc ON rc.patient_id=p.id CROSS JOIN clock c
  WHERE rc.checkin_date BETWEEN c.today-59 AND c.today GROUP BY p.k
 ), exercises AS (
  SELECT lower(trim(au.email)) AS k,least(100,round(100.0*count(DISTINCT (ec.completed_at AT TIME ZONE 'America/Sao_Paulo')::date)/14))::int AS pct
  FROM public.exercise_completions ec JOIN auth.users au ON au.id=ec.user_id JOIN public.exercise_programs ep ON ep.id=ec.program_id CROSS JOIN clock c
  WHERE (ec.completed_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN c.today-13 AND c.today AND
   ((_clinic_id IS NOT NULL AND ep.clinic_id=_clinic_id) OR (_clinic_id IS NULL AND ep.clinic_id IS NULL AND ep.professional_id=_professional_id)) GROUP BY 1
 )
 SELECT k.k,max(k.nm),round((coalesce(e.pct,0)*45.0+coalesce(ch.pct,0)*25.0+coalesce(a.pct,0)*30.0)/NULLIF((e.pct IS NOT NULL)::int*45+(ch.pct IS NOT NULL)::int*25+(a.pct IS NOT NULL)::int*30,0))::int,
 e.pct,ch.pct,a.pct FROM keys k LEFT JOIN exercises e ON e.k=k.k LEFT JOIN checkins ch ON ch.k=k.k LEFT JOIN attendance a ON a.k=k.k
 WHERE e.pct IS NOT NULL OR ch.pct IS NOT NULL OR a.pct IS NOT NULL GROUP BY k.k,e.pct,ch.pct,a.pct ORDER BY 3 DESC;
END; $function$;
