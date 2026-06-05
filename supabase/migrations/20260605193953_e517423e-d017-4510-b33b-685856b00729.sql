
DROP POLICY IF EXISTS "pq_public_select_by_token" ON public.pending_questionnaires;
DROP POLICY IF EXISTS "pq_public_update_by_token" ON public.pending_questionnaires;
REVOKE SELECT, UPDATE ON public.pending_questionnaires FROM anon;
