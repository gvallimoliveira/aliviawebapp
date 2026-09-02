ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS load_alerts boolean NOT NULL DEFAULT true;