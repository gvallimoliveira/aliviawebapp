-- Allow the anonymous link flow to finish an assessment (status -> completed)
-- and still read back the row it just wrote, inside the same 48h window.
DROP POLICY IF EXISTS "Anon flow can update professional assessments (active window)" ON public.assessments;
CREATE POLICY "Anon flow can update professional assessments (active window)"
ON public.assessments FOR UPDATE TO anon, authenticated
USING (
  type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL
  AND status = ANY (ARRAY['in_progress','red_flagged','completed'])
  AND created_at > (now() - interval '48 hours')
  AND has_active_pro_subscription(professional_id)
)
WITH CHECK (type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL);

DROP POLICY IF EXISTS "Anon flow can view professional assessments (active window)" ON public.assessments;
CREATE POLICY "Anon flow can view professional assessments (active window)"
ON public.assessments FOR SELECT TO anon, authenticated
USING (
  type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL
  AND status = ANY (ARRAY['in_progress','red_flagged','completed'])
  AND created_at > (now() - interval '48 hours')
  AND has_active_pro_subscription(professional_id)
);

DROP POLICY IF EXISTS "Anon flow can update clinic assessments (active window)" ON public.assessments;
CREATE POLICY "Anon flow can update clinic assessments (active window)"
ON public.assessments FOR UPDATE TO anon, authenticated
USING (
  type = 'professional' AND user_id IS NULL AND clinic_id IS NOT NULL
  AND status = ANY (ARRAY['in_progress','red_flagged','completed'])
  AND created_at > (now() - interval '48 hours')
)
WITH CHECK (type = 'professional' AND user_id IS NULL AND clinic_id IS NOT NULL);

DROP POLICY IF EXISTS "Anon flow can view clinic assessments (active window)" ON public.assessments;
CREATE POLICY "Anon flow can view clinic assessments (active window)"
ON public.assessments FOR SELECT TO anon, authenticated
USING (
  type = 'professional' AND user_id IS NULL AND clinic_id IS NOT NULL
  AND status = ANY (ARRAY['in_progress','red_flagged','completed'])
  AND created_at > (now() - interval '48 hours')
);
