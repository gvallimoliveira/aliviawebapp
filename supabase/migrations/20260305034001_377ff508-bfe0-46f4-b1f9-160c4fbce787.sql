
-- Drop restrictive UPDATE policies on assessments
DROP POLICY IF EXISTS "Users can update their own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Anyone can update professional assessments" ON public.assessments;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Users can update their own assessments"
  ON public.assessments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can update professional assessments"
  ON public.assessments FOR UPDATE TO anon, authenticated
  USING (type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL);
