-- Drop the old restrictive professional INSERT policy
DROP POLICY IF EXISTS "Professionals can create conversations with referred patients" ON public.conversations;

-- New policy: professionals can create conversations with any patient
CREATE POLICY "Professionals can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = conversations.professional_id AND p.user_id = auth.uid()
  )
);