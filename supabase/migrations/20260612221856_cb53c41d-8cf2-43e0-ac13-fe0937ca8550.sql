-- =====================================================================
-- 1. New clinic role: intern (Estagiário) — equivalent to therapist
-- =====================================================================
ALTER TYPE public.clinic_role ADD VALUE IF NOT EXISTS 'intern';
COMMIT;

-- =====================================================================
-- 2. Replace policies that listed 'therapist' so they also accept 'intern'
-- =====================================================================

-- assessments
DROP POLICY IF EXISTS "Clinic managers and therapists can update clinic assessments" ON public.assessments;
CREATE POLICY "Clinic managers and therapists can update clinic assessments"
ON public.assessments FOR UPDATE
USING (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'secretary'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

DROP POLICY IF EXISTS "Clinic owners and therapists can delete clinic assessments" ON public.assessments;
CREATE POLICY "Clinic owners and therapists can delete clinic assessments"
ON public.assessments FOR DELETE
USING (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

-- patient_files
DROP POLICY IF EXISTS "Clinic owners and therapists can delete patient files" ON public.patient_files;
CREATE POLICY "Clinic owners and therapists can delete patient files"
ON public.patient_files FOR DELETE
USING (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

DROP POLICY IF EXISTS "Clinic owners and therapists can update patient files" ON public.patient_files;
CREATE POLICY "Clinic owners and therapists can update patient files"
ON public.patient_files FOR UPDATE
USING (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]))
WITH CHECK (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

-- patient_photos
DROP POLICY IF EXISTS "Clinic owners and therapists can delete patient photos" ON public.patient_photos;
CREATE POLICY "Clinic owners and therapists can delete patient photos"
ON public.patient_photos FOR DELETE
USING (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

DROP POLICY IF EXISTS "Clinic owners and therapists can update patient photos" ON public.patient_photos;
CREATE POLICY "Clinic owners and therapists can update patient photos"
ON public.patient_photos FOR UPDATE
USING (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]))
WITH CHECK (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

-- patients
DROP POLICY IF EXISTS "Clinic owners and therapists can delete clinic patients" ON public.patients;
CREATE POLICY "Clinic owners and therapists can delete clinic patients"
ON public.patients FOR DELETE
USING (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

DROP POLICY IF EXISTS "Clinic owners and therapists can update clinic patients" ON public.patients;
CREATE POLICY "Clinic owners and therapists can update clinic patients"
ON public.patients FOR UPDATE
USING (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

-- session_notes
DROP POLICY IF EXISTS "Clinic therapists and owners can manage clinic session notes" ON public.session_notes;
CREATE POLICY "Clinic therapists and owners can manage clinic session notes"
ON public.session_notes FOR ALL
USING (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]))
WITH CHECK (clinic_id IS NOT NULL AND public.get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

-- =====================================================================
-- 3. Storage policies (patient files/photos + clinic logos)
-- =====================================================================
DROP POLICY IF EXISTS "Clinic managers delete patient-files" ON storage.objects;
CREATE POLICY "Clinic managers delete patient-files"
ON storage.objects FOR DELETE
USING (bucket_id = 'patient-files' AND (storage.foldername(name))[1] = 'clinic'
  AND public.get_clinic_role(auth.uid(), ((storage.foldername(name))[2])::uuid) = ANY (ARRAY['owner'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

DROP POLICY IF EXISTS "Clinic managers delete patient-photos" ON storage.objects;
CREATE POLICY "Clinic managers delete patient-photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'patient-photos' AND (storage.foldername(name))[1] = 'clinic'
  AND public.get_clinic_role(auth.uid(), ((storage.foldername(name))[2])::uuid) = ANY (ARRAY['owner'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

DROP POLICY IF EXISTS "Clinic managers upload clinic logos" ON storage.objects;
CREATE POLICY "Clinic managers upload clinic logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'professional-photos' AND (storage.foldername(name))[1] = 'clinic-logos'
  AND public.get_clinic_role(auth.uid(), (split_part(split_part(name,'/',2),'.',1))::uuid) = ANY (ARRAY['owner'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

DROP POLICY IF EXISTS "Clinic managers update clinic logos" ON storage.objects;
CREATE POLICY "Clinic managers update clinic logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'professional-photos' AND (storage.foldername(name))[1] = 'clinic-logos'
  AND public.get_clinic_role(auth.uid(), (split_part(split_part(name,'/',2),'.',1))::uuid) = ANY (ARRAY['owner'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

DROP POLICY IF EXISTS "Clinic managers delete clinic logos" ON storage.objects;
CREATE POLICY "Clinic managers delete clinic logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'professional-photos' AND (storage.foldername(name))[1] = 'clinic-logos'
  AND public.get_clinic_role(auth.uid(), (split_part(split_part(name,'/',2),'.',1))::uuid) = ANY (ARRAY['owner'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

-- =====================================================================
-- 4. Functions that listed 'therapist' — include 'intern' too
-- =====================================================================

CREATE OR REPLACE FUNCTION public.dismiss_assessment_red_flags(_assessment_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _row record; _allowed boolean := false; _name text; _role clinic_role;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 10 THEN RAISE EXCEPTION 'Reason must be at least 10 characters'; END IF;
  SELECT a.id, a.professional_id, a.clinic_id, p.user_id AS pro_user_id INTO _row
    FROM public.assessments a LEFT JOIN public.professionals p ON p.id = a.professional_id
    WHERE a.id = _assessment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assessment not found'; END IF;
  IF _row.pro_user_id IS NOT NULL AND _row.pro_user_id = auth.uid() THEN _allowed := true; END IF;
  IF NOT _allowed AND _row.clinic_id IS NOT NULL THEN
    SELECT role INTO _role FROM public.clinic_members
      WHERE clinic_id = _row.clinic_id AND user_id = auth.uid() AND status='active' LIMIT 1;
    IF _role IN ('owner','admin','therapist','intern') THEN _allowed := true; END IF;
  END IF;
  IF NOT _allowed THEN RAISE EXCEPTION 'Not authorized to dismiss red flags for this assessment'; END IF;
  SELECT COALESCE(pr.full_name, u.email) INTO _name FROM auth.users u
    LEFT JOIN public.profiles pr ON pr.user_id = u.id WHERE u.id = auth.uid();
  UPDATE public.assessments
    SET red_flags_dismissed_at = now(), red_flags_dismissed_by = auth.uid(),
        red_flags_dismissed_by_name = _name, red_flags_dismissed_reason = trim(_reason)
    WHERE id = _assessment_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revert_assessment_red_flags_dismissal(_assessment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _row record; _allowed boolean := false; _role clinic_role;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT a.id, a.professional_id, a.clinic_id, p.user_id AS pro_user_id INTO _row
    FROM public.assessments a LEFT JOIN public.professionals p ON p.id = a.professional_id
    WHERE a.id = _assessment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assessment not found'; END IF;
  IF _row.pro_user_id IS NOT NULL AND _row.pro_user_id = auth.uid() THEN _allowed := true; END IF;
  IF NOT _allowed AND _row.clinic_id IS NOT NULL THEN
    SELECT role INTO _role FROM public.clinic_members
      WHERE clinic_id = _row.clinic_id AND user_id = auth.uid() AND status='active' LIMIT 1;
    IF _role IN ('owner','admin','therapist','intern') THEN _allowed := true; END IF;
  END IF;
  IF NOT _allowed THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.assessments
    SET red_flags_dismissed_at = NULL, red_flags_dismissed_by = NULL,
        red_flags_dismissed_by_name = NULL, red_flags_dismissed_reason = NULL
    WHERE id = _assessment_id;
END;
$function$;

-- get_clinic_kpis / benchmarks: include intern in therapist count
CREATE OR REPLACE FUNCTION public.get_clinic_kpis(_clinic_id uuid)
RETURNS TABLE(today_count integer, total_this_month integer, completed_this_month integer, occupancy integer, assessments_this_month integer, therapists integer, monthly_data jsonb, status_data jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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

-- =====================================================================
-- 5. VIP-only override for student-mode toggle when CREFITO already set
-- =====================================================================
CREATE OR REPLACE FUNCTION public.validate_crefito_format()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
  _is_vip boolean := false;
  _was_student boolean := false;
  _had_crefito boolean := false;
BEGIN
  -- Detect transition: enabling student mode on an existing professional with CREFITO
  IF TG_OP = 'UPDATE' THEN
    _was_student := COALESCE(OLD.is_student, false);
    _had_crefito := OLD.crefito IS NOT NULL AND length(trim(OLD.crefito)) > 0;
  END IF;

  -- If user is trying to activate student mode while already having CREFITO → VIP only
  IF COALESCE(NEW.is_student, false) = true
     AND NEW.crefito IS NOT NULL AND length(trim(NEW.crefito)) > 0
     AND (TG_OP = 'INSERT' OR (NOT _was_student AND _had_crefito)) THEN
    SELECT u.email INTO _email FROM auth.users u WHERE u.id = NEW.user_id;
    SELECT EXISTS (SELECT 1 FROM public.vip_users v WHERE lower(v.email) = lower(_email)) INTO _is_vip;
    IF NOT _is_vip THEN
      RAISE EXCEPTION 'Professional accounts with CREFITO cannot enable Student mode.';
    END IF;
  END IF;

  -- Student rows skip CREFITO checks below
  IF COALESCE(NEW.is_student, false) = true THEN
    RETURN NEW;
  END IF;

  IF NEW.crefito IS NULL OR length(trim(NEW.crefito)) = 0 THEN
    RAISE EXCEPTION 'CREFITO is required for professional accounts. Enable Student Access if you are still studying.';
  END IF;
  IF NEW.crefito !~ '^\d{1,6}-[A-Z]$' THEN
    RAISE EXCEPTION 'Invalid CREFITO format. Expected pattern: 123456-F';
  END IF;
  RETURN NEW;
END;
$function$;