-- Allow anyone (including not logged-in patients filling clinic assessment links)
-- to read back the clinic assessment they are currently creating/updating.
-- Without this, .select().single() after .insert() returns null because RLS blocks
-- the row, and the rest of the flow has no assessmentId to update with diagnosis.
CREATE POLICY "Anyone can view clinic assessments for flow"
ON public.assessments
FOR SELECT
TO anon, authenticated
USING (
  type = 'professional'
  AND user_id IS NULL
  AND clinic_id IS NOT NULL
);