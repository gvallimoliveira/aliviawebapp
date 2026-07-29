ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS notified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.admin_alert_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL,
  title text NOT NULL,
  ref text,
  detail text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.admin_alert_log TO authenticated;
GRANT ALL ON public.admin_alert_log TO service_role;

ALTER TABLE public.admin_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read alert log"
  ON public.admin_alert_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_admin_alert_log_created_at ON public.admin_alert_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_notified ON public.support_tickets (notified_at) WHERE notified_at IS NULL;