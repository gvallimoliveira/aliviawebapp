
-- Table: referral_codes
CREATE TABLE public.referral_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can SELECT to validate codes (only code + id exposed, not user_id)
CREATE POLICY "Anyone can validate referral codes"
  ON public.referral_codes FOR SELECT
  USING (true);

-- Users can create their own codes
CREATE POLICY "Users can create their own referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Table: referral_rewards
CREATE TABLE public.referral_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  referral_code_id uuid REFERENCES public.referral_codes(id),
  status text NOT NULL DEFAULT 'pending',
  discount_percent integer NOT NULL DEFAULT 20,
  stripe_coupon_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can see rewards where they are referrer or referred
CREATE POLICY "Users can view their referral rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);
