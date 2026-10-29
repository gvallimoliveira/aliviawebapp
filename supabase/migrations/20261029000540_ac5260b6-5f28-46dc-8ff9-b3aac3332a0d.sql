CREATE OR REPLACE FUNCTION public.get_clinic_invite_preview(_token text)
RETURNS TABLE(clinic_name text, role clinic_role, email text, expired boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT c.name::text, i.role, i.email, (i.expires_at < now())
  FROM public.clinic_invitations i
  JOIN public.clinics c ON c.id = i.clinic_id
  WHERE i.token = _token AND length(_token) >= 30
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_clinic_invite_preview(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_clinic_invite_preview(text) TO anon, authenticated;

-- Renova o prazo ao reenviar o link (só gestores da clínica)
CREATE OR REPLACE FUNCTION public.renew_clinic_invitation(_invitation_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _tok text;
BEGIN
  UPDATE public.clinic_invitations i SET expires_at = now() + interval '7 days'
  WHERE i.id = _invitation_id AND can_manage_clinic(auth.uid(), i.clinic_id)
  RETURNING token INTO _tok;
  IF _tok IS NULL THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
  RETURN _tok;
END; $$;
REVOKE ALL ON FUNCTION public.renew_clinic_invitation(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.renew_clinic_invitation(uuid) TO authenticated;