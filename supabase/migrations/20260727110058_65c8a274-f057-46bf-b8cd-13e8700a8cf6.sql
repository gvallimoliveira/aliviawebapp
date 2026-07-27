CREATE TABLE public.subscription_admin_actions (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid,
  target_user_id uuid,
  target_email text,
  action text not null,
  reason text,
  stripe_subscription_id text,
  stripe_result jsonb,
  previous_status text,
  new_status text,
  performed_by uuid,
  performed_by_email text,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.subscription_admin_actions TO authenticated;
GRANT ALL ON public.subscription_admin_actions TO service_role;

ALTER TABLE public.subscription_admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read subscription admin actions"
ON public.subscription_admin_actions
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_subscription_admin_actions_prof ON public.subscription_admin_actions (professional_id, created_at DESC);