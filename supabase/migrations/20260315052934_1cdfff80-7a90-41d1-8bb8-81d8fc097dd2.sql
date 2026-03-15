
-- Use a validation trigger instead of CHECK constraint for CREFITO format
ALTER TABLE public.professionals 
  ALTER COLUMN crefito SET NOT NULL;

ALTER TABLE public.professionals 
  ADD CONSTRAINT professionals_crefito_unique UNIQUE (crefito);

-- Create validation trigger for CREFITO format
CREATE OR REPLACE FUNCTION public.validate_crefito_format()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.crefito !~ '^\d{1,6}-[A-Z]$' THEN
    RAISE EXCEPTION 'Invalid CREFITO format. Expected pattern: 123456-F';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_crefito
  BEFORE INSERT OR UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_crefito_format();
