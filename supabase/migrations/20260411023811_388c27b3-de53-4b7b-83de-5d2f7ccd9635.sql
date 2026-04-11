
-- Function: on new profile creation, check for pending clinic invitations and auto-add
CREATE OR REPLACE FUNCTION public.auto_accept_clinic_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv RECORD;
  user_email TEXT;
BEGIN
  -- Get the email of the newly created user
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  
  IF user_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find all pending (non-expired) invitations for this email
  FOR inv IN
    SELECT id, clinic_id, role
    FROM public.clinic_invitations
    WHERE LOWER(email) = LOWER(user_email)
    AND expires_at > now()
  LOOP
    -- Insert as clinic member if not already a member
    INSERT INTO public.clinic_members (clinic_id, user_id, role, status, accepted_at, invited_by)
    SELECT inv.clinic_id, NEW.user_id, inv.role, 'active', now(),
           (SELECT invited_by FROM public.clinic_invitations WHERE id = inv.id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.clinic_members
      WHERE clinic_id = inv.clinic_id AND user_id = NEW.user_id
    );
    
    -- Delete the processed invitation
    DELETE FROM public.clinic_invitations WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on profiles insert
CREATE TRIGGER on_profile_created_check_clinic_invites
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_accept_clinic_invitations();

-- Function: try to directly add a user by email (if they already have an account)
-- Returns 'added' if user found and added, 'invited' if invitation created
CREATE OR REPLACE FUNCTION public.try_direct_clinic_add(
  _clinic_id uuid,
  _email text,
  _role clinic_role,
  _invited_by uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _target_user_id uuid;
BEGIN
  -- Check caller can manage this clinic
  IF NOT can_manage_clinic(_invited_by, _clinic_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this clinic';
  END IF;

  -- Check if user with this email exists
  SELECT id INTO _target_user_id FROM auth.users WHERE LOWER(email) = LOWER(_email);

  IF _target_user_id IS NOT NULL THEN
    -- User exists, check if already a member
    IF EXISTS (
      SELECT 1 FROM public.clinic_members
      WHERE clinic_id = _clinic_id AND user_id = _target_user_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'User is already a member of this clinic';
    END IF;

    -- Add directly as active member
    INSERT INTO public.clinic_members (clinic_id, user_id, role, status, accepted_at, invited_by)
    VALUES (_clinic_id, _target_user_id, _role, 'active', now(), _invited_by)
    ON CONFLICT DO NOTHING;

    RETURN 'added';
  ELSE
    -- User doesn't exist, create invitation
    INSERT INTO public.clinic_invitations (clinic_id, email, role, invited_by)
    VALUES (_clinic_id, LOWER(_email), _role, _invited_by);

    RETURN 'invited';
  END IF;
END;
$$;
