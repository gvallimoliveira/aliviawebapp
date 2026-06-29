
-- A5: clinic trial CNPJ + chat addon subscription columns.

-- 1) Clinics: CNPJ + trial credit cap
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS trial_credits_cap integer NOT NULL DEFAULT 75;

CREATE UNIQUE INDEX IF NOT EXISTS clinics_cnpj_unique_idx
  ON public.clinics (cnpj)
  WHERE cnpj IS NOT NULL;

-- 2) Profiles: chat addon subscription state
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_addon_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS chat_addon_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS chat_addon_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS chat_addon_msgs_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chat_addon_quota integer NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS chat_addon_stripe_subscription_id text;

-- 3) Helper: reset monthly counter when the billing period advances
CREATE OR REPLACE FUNCTION public.reset_chat_addon_period_if_needed(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET chat_addon_msgs_used = 0,
         chat_addon_period_start = chat_addon_period_end,
         chat_addon_period_end = chat_addon_period_end + interval '1 month'
   WHERE user_id = _user_id
     AND chat_addon_status = 'active'
     AND chat_addon_period_end IS NOT NULL
     AND chat_addon_period_end < now();
END;
$$;

REVOKE ALL ON FUNCTION public.reset_chat_addon_period_if_needed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_chat_addon_period_if_needed(uuid) TO service_role;
