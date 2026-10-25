CREATE OR REPLACE FUNCTION public.get_patient_adherence_scores(_clinic_id uuid DEFAULT NULL::uuid, _professional_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(patient_email text, patient_name text, score int, exercises_pct int, checkin_pct int, attendance_pct int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_patient_adherence_scores(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_patient_adherence_scores(uuid,uuid) TO authenticated, service_role;