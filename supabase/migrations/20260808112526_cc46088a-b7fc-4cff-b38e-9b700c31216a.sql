ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS care_plan boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS my_assessment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payments boolean NOT NULL DEFAULT true;