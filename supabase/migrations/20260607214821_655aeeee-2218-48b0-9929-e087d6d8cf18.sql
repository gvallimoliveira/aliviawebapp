ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_origin TEXT;

-- Backfill the specific user who already signed up via the professional landing
UPDATE public.profiles p
SET signup_origin = 'professional'
WHERE signup_origin IS NULL
  AND user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'gvo.gvv@hotmail.com');