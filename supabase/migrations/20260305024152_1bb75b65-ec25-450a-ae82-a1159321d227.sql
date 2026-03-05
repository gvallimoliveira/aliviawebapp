
-- Add subscription columns to professionals
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS subscription_stripe_id text;

-- Add professional_id to assessments
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES public.professionals(id);

-- RLS: Allow anyone to insert assessments with professional_id (patient doesn't need login)
CREATE POLICY "Anyone can create professional assessments"
ON public.assessments FOR INSERT
WITH CHECK (
  (type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL)
);

-- RLS: Professionals can view assessments linked to them
CREATE POLICY "Professionals can view their linked assessments"
ON public.assessments FOR SELECT
USING (
  professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- RLS: Allow anonymous update of professional assessments (for saving diagnosis during flow)
CREATE POLICY "Anyone can update professional assessments"
ON public.assessments FOR UPDATE
USING (
  type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL
);

-- Allow anyone to read approved professionals with active subscription (for link validation)
CREATE POLICY "Anyone can check professional subscription status"
ON public.professionals FOR SELECT
USING (approved = true AND active = true AND subscription_status = 'active');
