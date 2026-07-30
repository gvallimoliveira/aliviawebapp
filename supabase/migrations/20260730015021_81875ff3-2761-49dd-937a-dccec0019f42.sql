CREATE OR REPLACE FUNCTION public.clear_placeholder_crefito_for_students()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Placeholder CREFITOs (pattern `NNNNNN-X`) are auto-generated only to open
  -- partner accounts. They are NOT a real professional registration, so an
  -- academic account must never keep one.
  IF NEW.is_student IS TRUE
     AND NEW.crefito IS NOT NULL
     AND NEW.crefito ~* '^[0-9]{1,6}-X$' THEN
    NEW.crefito := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_placeholder_crefito_for_students_trg ON public.professionals;

CREATE TRIGGER clear_placeholder_crefito_for_students_trg
BEFORE INSERT OR UPDATE OF is_student, crefito ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.clear_placeholder_crefito_for_students();