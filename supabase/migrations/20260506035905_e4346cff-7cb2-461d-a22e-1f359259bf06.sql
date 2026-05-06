CREATE OR REPLACE FUNCTION public.get_clinic_kpis(_clinic_id uuid)
RETURNS TABLE (
  today_count integer,
  total_this_month integer,
  completed_this_month integer,
  occupancy integer,
  assessments_this_month integer,
  therapists integer,
  monthly_data jsonb,
  status_data jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT status
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
    SELECT date_trunc('month', pa.appointment_date::timestamp)::date AS month_start, count(*)::int AS count
    FROM public.professional_appointments pa
    CROSS JOIN params p
    WHERE pa.clinic_id = _clinic_id
      AND pa.appointment_date >= p.start_month_start
    GROUP BY 1
  ),
  assessment_months AS (
    SELECT date_trunc('month', a.created_at)::date AS month_start, count(*)::int AS count
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
        'atendimentos', COALESCE(am.count, 0),
        'avaliacoes', COALESCE(asm.count, 0)
      )
      ORDER BY m.month_start
    ) AS data
    FROM months m
    LEFT JOIN appointment_months am USING (month_start)
    LEFT JOIN assessment_months asm USING (month_start)
  ),
  status_counts AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', CASE pa.status
          WHEN 'scheduled' THEN 'Agendado'
          WHEN 'completed' THEN 'Concluído'
          WHEN 'cancelled' THEN 'Cancelado'
          WHEN 'no_show' THEN 'Não compareceu'
          ELSE COALESCE(pa.status, 'Agendado')
        END,
        'value', count(*)::int
      )
      ORDER BY CASE pa.status
        WHEN 'scheduled' THEN 1
        WHEN 'completed' THEN 2
        WHEN 'cancelled' THEN 3
        WHEN 'no_show' THEN 4
        ELSE 5
      END
    ) AS data
    FROM public.professional_appointments pa
    CROSS JOIN params p
    WHERE pa.clinic_id = _clinic_id
      AND pa.appointment_date >= p.start_month_start
    GROUP BY true
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
    COALESCE((SELECT data FROM status_counts LIMIT 1), '[]'::jsonb);
END;
$$;