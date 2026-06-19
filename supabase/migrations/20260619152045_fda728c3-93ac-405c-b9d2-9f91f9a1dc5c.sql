
-- Add active_profile_mode column to distinguish capability (is_student) from active operating mode
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS active_profile_mode TEXT NOT NULL DEFAULT 'professional';

-- Backfill: anyone currently flagged is_student=true operates as student
UPDATE public.professionals
SET active_profile_mode = 'student'
WHERE is_student = true;

-- Constrain values
ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS professionals_active_profile_mode_check;
ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_active_profile_mode_check
  CHECK (active_profile_mode IN ('professional','student'));

-- Coherence trigger: cannot be in 'student' mode if is_student=false
CREATE OR REPLACE FUNCTION public.validate_active_profile_mode()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.active_profile_mode = 'student' AND COALESCE(NEW.is_student, false) = false THEN
    RAISE EXCEPTION 'Cannot activate student profile mode without academic access enabled';
  END IF;

  -- If academic access gets revoked, auto-fallback to professional mode
  IF NEW.is_student = false AND NEW.active_profile_mode = 'student' THEN
    NEW.active_profile_mode := 'professional';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_active_profile_mode ON public.professionals;
CREATE TRIGGER trg_validate_active_profile_mode
  BEFORE INSERT OR UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_active_profile_mode();
