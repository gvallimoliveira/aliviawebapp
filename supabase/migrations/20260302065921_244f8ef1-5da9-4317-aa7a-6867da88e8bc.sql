
-- Add approved column
ALTER TABLE public.professionals ADD COLUMN approved boolean NOT NULL DEFAULT false;

-- Create is_admin function (checks vip_users table)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vip_users
    WHERE email = (SELECT email FROM auth.users WHERE id = _user_id)
  )
$$;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view active professionals" ON public.professionals;

-- New SELECT policy: normal users see only approved+active professionals OR their own profile
CREATE POLICY "Users can view approved professionals or own profile"
ON public.professionals
FOR SELECT
TO authenticated
USING (
  (active = true AND approved = true)
  OR (user_id = auth.uid())
  OR public.is_admin(auth.uid())
);
