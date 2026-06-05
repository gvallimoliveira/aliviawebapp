ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS red_flags_dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS red_flags_dismissed_by uuid,
  ADD COLUMN IF NOT EXISTS red_flags_dismissed_by_name text,
  ADD COLUMN IF NOT EXISTS red_flags_dismissed_reason text;

CREATE OR REPLACE FUNCTION public.dismiss_assessment_red_flags(_assessment_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _allowed boolean := false;
  _name text;
  _role clinic_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 10 THEN
    RAISE EXCEPTION 'Reason must be at least 10 characters';
  END IF;

  SELECT a.id, a.professional_id, a.clinic_id, p.user_id AS pro_user_id
    INTO _row
  FROM public.assessments a
  LEFT JOIN public.professionals p ON p.id = a.professional_id
  WHERE a.id = _assessment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found';
  END IF;

  -- Professional owner of the assessment
  IF _row.pro_user_id IS NOT NULL AND _row.pro_user_id = auth.uid() THEN
    _allowed := true;
  END IF;

  -- Clinic owner/admin/therapist (not secretary)
  IF NOT _allowed AND _row.clinic_id IS NOT NULL THEN
    SELECT role INTO _role
    FROM public.clinic_members
    WHERE clinic_id = _row.clinic_id
      AND user_id = auth.uid()
      AND status = 'active'
    LIMIT 1;
    IF _role IN ('owner', 'admin', 'therapist') THEN
      _allowed := true;
    END IF;
  END IF;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'Not authorized to dismiss red flags for this assessment';
  END IF;

  SELECT COALESCE(pr.full_name, u.email) INTO _name
  FROM auth.users u
  LEFT JOIN public.profiles pr ON pr.user_id = u.id
  WHERE u.id = auth.uid();

  UPDATE public.assessments
  SET red_flags_dismissed_at = now(),
      red_flags_dismissed_by = auth.uid(),
      red_flags_dismissed_by_name = _name,
      red_flags_dismissed_reason = trim(_reason)
  WHERE id = _assessment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revert_assessment_red_flags_dismissal(_assessment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _allowed boolean := false;
  _role clinic_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT a.id, a.professional_id, a.clinic_id, p.user_id AS pro_user_id
    INTO _row
  FROM public.assessments a
  LEFT JOIN public.professionals p ON p.id = a.professional_id
  WHERE a.id = _assessment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found';
  END IF;

  IF _row.pro_user_id IS NOT NULL AND _row.pro_user_id = auth.uid() THEN
    _allowed := true;
  END IF;

  IF NOT _allowed AND _row.clinic_id IS NOT NULL THEN
    SELECT role INTO _role
    FROM public.clinic_members
    WHERE clinic_id = _row.clinic_id
      AND user_id = auth.uid()
      AND status = 'active'
    LIMIT 1;
    IF _role IN ('owner', 'admin', 'therapist') THEN
      _allowed := true;
    END IF;
  END IF;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.assessments
  SET red_flags_dismissed_at = NULL,
      red_flags_dismissed_by = NULL,
      red_flags_dismissed_by_name = NULL,
      red_flags_dismissed_reason = NULL
  WHERE id = _assessment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_assessment_red_flags(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_assessment_red_flags_dismissal(uuid) TO authenticated;