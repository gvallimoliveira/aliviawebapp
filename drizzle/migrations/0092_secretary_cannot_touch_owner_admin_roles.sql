CREATE OR REPLACE FUNCTION public.guard_clinic_member_privileged_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _clinic uuid; _caller text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN _clinic := NEW.clinic_id; ELSE _clinic := OLD.clinic_id; END IF;
    _caller := public.get_clinic_role(auth.uid(), _clinic)::text;
    IF _caller = 'secretary' THEN
      IF TG_OP = 'INSERT' THEN
        IF NEW.role IN ('owner','admin') THEN
          RAISE EXCEPTION 'Somente proprietário ou administrador pode conceder papel de gestão.' USING ERRCODE = '42501';
        END IF;
      ELSIF TG_OP = 'DELETE' THEN
        IF OLD.role IN ('owner','admin') THEN
          RAISE EXCEPTION 'Somente proprietário ou administrador pode remover um gestor da clínica.' USING ERRCODE = '42501';
        END IF;
      ELSE
        IF OLD.role IN ('owner','admin')
           AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status
                OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id) THEN
          RAISE EXCEPTION 'Somente proprietário ou administrador pode alterar um gestor da clínica.' USING ERRCODE = '42501';
        END IF;
        IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role IN ('owner','admin') THEN
          RAISE EXCEPTION 'Somente proprietário ou administrador pode conceder papel de gestão.' USING ERRCODE = '42501';
        END IF;
        IF NEW.role IS DISTINCT FROM OLD.role AND OLD.user_id = auth.uid() THEN
          RAISE EXCEPTION 'A secretária não pode alterar o próprio papel.' USING ERRCODE = '42501';
        END IF;
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_clinic_member_privileged_roles ON public.clinic_members;
CREATE TRIGGER guard_clinic_member_privileged_roles
BEFORE INSERT OR UPDATE OR DELETE ON public.clinic_members
FOR EACH ROW EXECUTE FUNCTION public.guard_clinic_member_privileged_roles();

CREATE OR REPLACE FUNCTION public.guard_clinic_invitation_privileged_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _clinic uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN _clinic := NEW.clinic_id; ELSE _clinic := OLD.clinic_id; END IF;
    IF public.get_clinic_role(auth.uid(), _clinic)::text = 'secretary' THEN
      IF (TG_OP <> 'DELETE' AND NEW.role IN ('owner','admin'))
         OR (TG_OP <> 'INSERT' AND OLD.role IN ('owner','admin')) THEN
        RAISE EXCEPTION 'Somente proprietário ou administrador pode convidar ou gerenciar convites de gestão.' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_clinic_invitation_privileged_roles ON public.clinic_invitations;
CREATE TRIGGER guard_clinic_invitation_privileged_roles
BEFORE INSERT OR UPDATE OR DELETE ON public.clinic_invitations
FOR EACH ROW EXECUTE FUNCTION public.guard_clinic_invitation_privileged_roles();

CREATE OR REPLACE FUNCTION public.try_direct_clinic_add(_clinic_id uuid, _email text, _role clinic_role, _invited_by uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _target_user_id uuid; _max int; _used int;
BEGIN
  IF auth.uid() IS NOT NULL AND _invited_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to manage this clinic' USING ERRCODE = '42501';
  END IF;
  IF NOT can_manage_clinic(_invited_by, _clinic_id) THEN RAISE EXCEPTION 'Not authorized to manage this clinic' USING ERRCODE = '42501'; END IF;
  IF _role IN ('owner','admin') AND COALESCE(public.get_clinic_role(_invited_by, _clinic_id)::text, '') NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'Somente proprietário ou administrador pode conceder papel de gestão.' USING ERRCODE = '42501';
  END IF;
  SELECT max_members INTO _max FROM public.clinics WHERE id = _clinic_id;
  IF COALESCE(_max, 3) < 9999 THEN
    SELECT (SELECT count(*) FROM public.clinic_members WHERE clinic_id = _clinic_id AND status = 'active'
              AND ((_role = 'secretary') = (role = 'secretary')))
         + (SELECT count(*) FROM public.clinic_invitations WHERE clinic_id = _clinic_id
              AND ((_role = 'secretary') = (role = 'secretary')))
      INTO _used;
    IF _role = 'secretary' AND _used >= 1 THEN
      RAISE EXCEPTION 'O plano inclui 1 vaga de secretária, já ocupada.';
    ELSIF _role <> 'secretary' AND _used >= COALESCE(_max, 3) THEN
      RAISE EXCEPTION 'Limite de % vagas clínicas do plano atingido.', COALESCE(_max, 3);
    END IF;
  END IF;

  SELECT id INTO _target_user_id FROM auth.users WHERE LOWER(email) = LOWER(_email);
  IF _target_user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id = _clinic_id AND user_id = _target_user_id AND status = 'active') THEN
      RAISE EXCEPTION 'User is already a member of this clinic';
    END IF;
    INSERT INTO public.clinic_members (clinic_id, user_id, role, status, accepted_at, invited_by)
    VALUES (_clinic_id, _target_user_id, _role, 'active', now(), _invited_by) ON CONFLICT DO NOTHING;
    RETURN 'added';
  ELSE
    INSERT INTO public.clinic_invitations (clinic_id, email, role, invited_by) VALUES (_clinic_id, LOWER(_email), _role, _invited_by);
    RETURN 'invited';
  END IF;
END;
$function$;