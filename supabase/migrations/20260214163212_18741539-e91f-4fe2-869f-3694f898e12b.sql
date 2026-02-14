
-- VIP users table (managed only by service role / admin)
CREATE TABLE public.vip_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vip_users ENABLE ROW LEVEL SECURITY;

-- No public policies - only service_role can manage this table
-- Authenticated users can check if their own email is VIP
CREATE POLICY "Users can check own VIP status"
ON public.vip_users
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
