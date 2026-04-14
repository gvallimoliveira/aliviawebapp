
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS operating_hours_start time DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS operating_hours_end time DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS working_days integer[] DEFAULT '{1,2,3,4,5}',
  ADD COLUMN IF NOT EXISTS brand_color text DEFAULT NULL;
