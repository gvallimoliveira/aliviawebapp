
-- Add SELECT policy for anon/authenticated on professional assessments (needed for .insert().select())
CREATE POLICY "Anyone can view professional assessments for flow"
  ON public.assessments FOR SELECT TO anon, authenticated
  USING (type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL);

-- Add red_flags column
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS red_flags jsonb DEFAULT NULL;
