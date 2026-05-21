ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS saturday_hours_start time without time zone,
ADD COLUMN IF NOT EXISTS saturday_hours_end time without time zone;