CREATE OR REPLACE FUNCTION public.announcement_recipient_ids(_announcement_id uuid)
RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id FROM public.patient_announcements a
  CROSS JOIN LATERAL public.announcement_audience_emails(a.clinic_id, a.professional_id, a.audience) e
  JOIN auth.users u ON lower(u.email) = e.email
  WHERE a.id = _announcement_id AND NOT a.archived
$$;
REVOKE EXECUTE ON FUNCTION public.announcement_recipient_ids(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.announcement_recipient_ids(uuid) TO service_role;