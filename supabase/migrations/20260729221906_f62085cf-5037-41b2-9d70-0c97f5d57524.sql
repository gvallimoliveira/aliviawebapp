CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL PRIMARY KEY,
  assessments boolean NOT NULL DEFAULT true,
  messages boolean NOT NULL DEFAULT true,
  red_flags boolean NOT NULL DEFAULT true,
  questionnaires boolean NOT NULL DEFAULT true,
  billing boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notification preferences"
ON public.notification_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();