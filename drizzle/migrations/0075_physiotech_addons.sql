CREATE TABLE public.physiotech_addons (
  user_id uuid PRIMARY KEY,
  tier text NOT NULL CHECK (tier IN ('essencial','pro')),
  billing text NOT NULL CHECK (billing IN ('monthly','annual')),
  status text NOT NULL DEFAULT 'active',
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.physiotech_addons TO authenticated;
GRANT ALL ON public.physiotech_addons TO service_role;
ALTER TABLE public.physiotech_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own physiotech addon" ON public.physiotech_addons FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX physiotech_reports_sender_idx ON public.physiotech_reports(sent_by, created_at);