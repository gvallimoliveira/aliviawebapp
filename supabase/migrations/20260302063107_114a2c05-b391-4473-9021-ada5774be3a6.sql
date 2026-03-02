
-- Create professionals table
CREATE TABLE public.professionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  crefito TEXT,
  specialties TEXT[],
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  bio TEXT,
  phone TEXT,
  email TEXT,
  clinic_name TEXT,
  clinic_address TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one profile per user
ALTER TABLE public.professionals ADD CONSTRAINT professionals_user_id_key UNIQUE (user_id);

-- Enable RLS
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can see active professionals
CREATE POLICY "Authenticated users can view active professionals"
  ON public.professionals FOR SELECT
  USING (auth.uid() IS NOT NULL AND active = true);

-- INSERT: only the owner
CREATE POLICY "Users can create their own professional profile"
  ON public.professionals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: only the owner
CREATE POLICY "Users can update their own professional profile"
  ON public.professionals FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create professional_referrals table
CREATE TABLE public.professional_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  professional_id UUID NOT NULL REFERENCES public.professionals(id),
  assessment_id UUID REFERENCES public.assessments(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professional_referrals ENABLE ROW LEVEL SECURITY;

-- Patient can view their own referrals
CREATE POLICY "Patients can view their own referrals"
  ON public.professional_referrals FOR SELECT
  USING (auth.uid() = patient_user_id);

-- Patient can create referrals
CREATE POLICY "Patients can create referrals"
  ON public.professional_referrals FOR INSERT
  WITH CHECK (auth.uid() = patient_user_id);

-- Professional can view referrals directed to them
CREATE POLICY "Professionals can view their referrals"
  ON public.professional_referrals FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- Professional can update referral status
CREATE POLICY "Professionals can update referral status"
  ON public.professional_referrals FOR UPDATE
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );
