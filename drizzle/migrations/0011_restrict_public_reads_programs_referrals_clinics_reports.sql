-- Exercise programs: no more open listing
CREATE OR REPLACE FUNCTION public.can_read_exercise_program(_program_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM exercise_programs ep
    JOIN professionals p ON p.id = ep.professional_id
    WHERE ep.id = _program_id AND (
      p.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM clinic_members m1 JOIN clinic_members m2 ON m1.clinic_id = m2.clinic_id
                 WHERE m1.user_id = p.user_id AND m2.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.get_my_active_exercise_programs() g WHERE g.program_id = ep.id)
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_read_exercise_program(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_read_exercise_program(uuid) TO authenticated;

DROP POLICY IF EXISTS "Anyone can read programs by token" ON public.exercise_programs;
CREATE POLICY "Related users read programs" ON public.exercise_programs
  FOR SELECT TO authenticated USING (public.can_read_exercise_program(id));

DROP POLICY IF EXISTS "Anyone can read program items" ON public.exercise_program_items;
CREATE POLICY "Related users read program items" ON public.exercise_program_items
  FOR SELECT TO authenticated USING (public.can_read_exercise_program(program_id));

CREATE OR REPLACE FUNCTION public.get_exercise_program_by_token(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', ep.id, 'patient_name', ep.patient_name, 'notes', ep.notes,
    'created_at', ep.created_at, 'expires_at', ep.expires_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'sets', i.sets, 'reps', i.reps, 'frequency', i.frequency,
        'observations', i.observations, 'sort_order', i.sort_order,
        'custom_name', i.custom_name, 'custom_video_url', i.custom_video_url,
        'exercise', CASE WHEN el.id IS NULL THEN NULL ELSE jsonb_build_object(
          'name_pt', el.name_pt, 'name_en', el.name_en, 'name_es', el.name_es,
          'description_pt', el.description_pt, 'description_en', el.description_en, 'description_es', el.description_es,
          'body_region', el.body_region, 'category', el.category, 'video_url', el.video_url, 'difficulty', el.difficulty) END
      ) ORDER BY i.sort_order)
      FROM exercise_program_items i LEFT JOIN exercise_library el ON el.id = i.exercise_id
      WHERE i.program_id = ep.id), '[]'::jsonb)
  )
  FROM exercise_programs ep WHERE ep.token = _token AND length(_token) >= 16
$$;
GRANT EXECUTE ON FUNCTION public.get_exercise_program_by_token(text) TO anon, authenticated;

-- Referral codes: own row only + validation function
DROP POLICY IF EXISTS "Anyone can validate referral codes" ON public.referral_codes;
CREATE POLICY "Users read own referral code" ON public.referral_codes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.referral_code_exists(_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM referral_codes WHERE upper(code) = upper(_code))
$$;
GRANT EXECUTE ON FUNCTION public.referral_code_exists(text) TO anon, authenticated;

-- Clinics: storefront fields only via function
DROP POLICY IF EXISTS "Anyone can read clinic basic info" ON public.clinics;
CREATE OR REPLACE FUNCTION public.get_clinics_public(_ids uuid[])
RETURNS TABLE(id uuid, name text, logo_url text, brand_color text, owner_user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.logo_url, c.brand_color, c.owner_user_id FROM clinics c WHERE c.id = ANY(_ids)
$$;
GRANT EXECUTE ON FUNCTION public.get_clinics_public(uuid[]) TO anon, authenticated;

-- Assessment reports: files open by direct link only (public bucket), no listing
DROP POLICY IF EXISTS "Anyone can read assessment reports" ON storage.objects;
CREATE POLICY "Owners read own assessment reports" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'assessment-reports' AND (storage.foldername(name))[1] = auth.uid()::text);