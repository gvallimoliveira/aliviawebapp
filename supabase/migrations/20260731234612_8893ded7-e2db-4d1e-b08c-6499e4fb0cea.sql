DROP POLICY IF EXISTS "Callers can create their sessions" ON public.video_call_sessions;
DROP POLICY IF EXISTS "Call participants can update sessions" ON public.video_call_sessions;
REVOKE INSERT, UPDATE, DELETE ON public.video_call_sessions FROM authenticated;
GRANT SELECT ON public.video_call_sessions TO authenticated;
GRANT ALL ON public.video_call_sessions TO service_role;