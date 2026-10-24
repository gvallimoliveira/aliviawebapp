DROP FUNCTION IF EXISTS public.get_steps_phase_overview(uuid, uuid);

CREATE FUNCTION public.get_steps_phase_overview(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(patient_id uuid, patient_name text, plan_id uuid, plan_title text, phase_name text, phase_goal text, weeks_in_phase integer, sort_order integer, total_phases integer)
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
         plans.plan_id,
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