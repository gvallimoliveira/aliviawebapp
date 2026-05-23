DROP FUNCTION IF EXISTS public.get_clinic_benchmarks(uuid);

CREATE OR REPLACE FUNCTION public.get_clinic_benchmarks(_clinic_id uuid)
RETURNS TABLE(
  metric text,
  clinic_value numeric,
  peer_avg numeric,
  peer_count integer,
  size_bucket text,
  better_when_lower boolean,
  small_avg numeric,
  small_count integer,
  medium_avg numeric,
  medium_count integer,
  large_avg numeric,
  large_count integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    SELECT id,
      CASE WHEN th <= 3 THEN 'small' WHEN th <= 10 THEN 'medium' ELSE 'large' END AS bkt
    FROM all_clinics
  ),
  per_clinic AS (
    SELECT b.id AS clinic_id,
      b.bkt,
      (SELECT CASE WHEN COUNT(*) FILTER (WHERE status IN ('completed','no_show','cancelled')) > 0
                   THEN 100.0 * COUNT(*) FILTER (WHERE status = 'no_show')
                        / COUNT(*) FILTER (WHERE status IN ('completed','no_show','cancelled'))
                   ELSE NULL END
       FROM public.professional_appointments pa
       WHERE pa.clinic_id = b.id
         AND pa.appointment_date >= CURRENT_DATE - INTERVAL '60 days') AS no_show_rate,
      (SELECT CASE WHEN ((SELECT count(*) FROM public.clinic_members cm
                          WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist'))) > 0
                   THEN LEAST(100, 100.0 * COUNT(*) FILTER (WHERE status='completed')
                       / NULLIF(((SELECT count(*) FROM public.clinic_members cm
                                  WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist'))) * 8 * 22, 0))
                   ELSE NULL END
       FROM public.professional_appointments pa
       WHERE pa.clinic_id = b.id
         AND pa.appointment_date >= date_trunc('month', now())::date) AS occupancy,
      (SELECT CASE WHEN ((SELECT count(*) FROM public.clinic_members cm
                          WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist'))) > 0
                   THEN COUNT(*)::numeric
                        / NULLIF((SELECT count(*) FROM public.clinic_members cm
                                  WHERE cm.clinic_id = b.id AND cm.status='active' AND cm.role IN ('owner','therapist')), 0)
                   ELSE NULL END
       FROM public.assessments a
       WHERE a.clinic_id = b.id
         AND a.created_at >= date_trunc('month', now())) AS assessments_per_th
    FROM bucketed b
  ),
  metrics AS (
    SELECT 'no_show_rate'::text AS metric, no_show_rate AS val, bkt, clinic_id FROM per_clinic
    UNION ALL
    SELECT 'occupancy'::text, occupancy, bkt, clinic_id FROM per_clinic
    UNION ALL
    SELECT 'assessments_per_therapist'::text, assessments_per_th, bkt, clinic_id FROM per_clinic
  ),
  bucket_stats AS (
    SELECT metric AS m, bkt,
      AVG(val) FILTER (WHERE val IS NOT NULL) AS avg_val,
      COUNT(*) FILTER (WHERE val IS NOT NULL)::int AS cnt
    FROM metrics
    GROUP BY metric, bkt
  ),
  pivoted AS (
    SELECT m AS metric,
      MAX(CASE WHEN bkt='small' THEN avg_val END) AS small_a,
      MAX(CASE WHEN bkt='small' THEN cnt END) AS small_c,
      MAX(CASE WHEN bkt='medium' THEN avg_val END) AS medium_a,
      MAX(CASE WHEN bkt='medium' THEN cnt END) AS medium_c,
      MAX(CASE WHEN bkt='large' THEN avg_val END) AS large_a,
      MAX(CASE WHEN bkt='large' THEN cnt END) AS large_c
    FROM bucket_stats
    GROUP BY m
  )
  SELECT
    p.metric,
    (SELECT val FROM metrics WHERE metrics.metric = p.metric AND metrics.clinic_id = _clinic_id LIMIT 1) AS clinic_value,
    (CASE _bucket
      WHEN 'small' THEN p.small_a
      WHEN 'medium' THEN p.medium_a
      ELSE p.large_a
    END)::numeric AS peer_avg,
    (CASE _bucket
      WHEN 'small' THEN COALESCE(p.small_c, 0)
      WHEN 'medium' THEN COALESCE(p.medium_c, 0)
      ELSE COALESCE(p.large_c, 0)
    END)::int AS peer_count,
    _bucket AS size_bucket,
    (CASE p.metric WHEN 'no_show_rate' THEN true ELSE false END) AS better_when_lower,
    p.small_a::numeric AS small_avg,
    COALESCE(p.small_c, 0)::int AS small_count,
    p.medium_a::numeric AS medium_avg,
    COALESCE(p.medium_c, 0)::int AS medium_count,
    p.large_a::numeric AS large_avg,
    COALESCE(p.large_c, 0)::int AS large_count
  FROM pivoted p;
END;
$function$;