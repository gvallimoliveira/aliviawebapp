CREATE OR REPLACE FUNCTION public.auto_graduate_on_crefito()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- When a previously empty CREFITO becomes filled, automatically graduate:
  -- - turn off the academic flag
  -- - switch the active profile to professional
  -- - mark the record as approved so professional tools/marketplace unlock
  -- This runs no matter the entry point (registration form, CrefitoCompletionBanner, admin tools).
  IF (COALESCE(NULLIF(TRIM(OLD.crefito), ''), NULL) IS NULL)
     AND (COALESCE(NULLIF(TRIM(NEW.crefito), ''), NULL) IS NOT NULL) THEN
    NEW.is_student := false;
    NEW.active_profile_mode := 'professional';
    NEW.student_institution := NULL;
    NEW.student_period := NULL;
    IF NEW.approved IS DISTINCT FROM true THEN
      NEW.approved := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_graduate_on_crefito_trg ON public.professionals;
CREATE TRIGGER auto_graduate_on_crefito_trg
BEFORE UPDATE ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.auto_graduate_on_crefito();