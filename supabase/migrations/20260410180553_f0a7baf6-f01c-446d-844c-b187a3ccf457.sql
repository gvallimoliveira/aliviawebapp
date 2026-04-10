
-- 1. Create enum for clinic roles
CREATE TYPE public.clinic_role AS ENUM ('owner', 'therapist', 'secretary');

-- 2. Create clinics table
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  subscription_status text NOT NULL DEFAULT 'inactive',
  subscription_stripe_id text,
  max_members integer NOT NULL DEFAULT 3,
  logo_url text,
  phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- 3. Create clinic_members table
CREATE TABLE public.clinic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role clinic_role NOT NULL DEFAULT 'therapist',
  invited_by uuid,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);

ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

-- 4. Create clinic_invitations table
CREATE TABLE public.clinic_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email text NOT NULL,
  role clinic_role NOT NULL DEFAULT 'therapist',
  invited_by uuid NOT NULL,
  token text NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, email)
);

ALTER TABLE public.clinic_invitations ENABLE ROW LEVEL SECURITY;

-- 5. Add clinic_id to assessments, professional_appointments, session_notes
ALTER TABLE public.assessments ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;
ALTER TABLE public.professional_appointments ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;
ALTER TABLE public.session_notes ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;

-- 6. Create get_clinic_role function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_clinic_role(_user_id uuid, _clinic_id uuid)
RETURNS clinic_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.clinic_members
  WHERE user_id = _user_id AND clinic_id = _clinic_id AND status = 'active'
  LIMIT 1
$$;

-- 7. Helper: check if user is member of a clinic
CREATE OR REPLACE FUNCTION public.is_clinic_member(_user_id uuid, _clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE user_id = _user_id AND clinic_id = _clinic_id AND status = 'active'
  )
$$;

-- 8. Helper: check if user can manage clinic (owner or secretary)
CREATE OR REPLACE FUNCTION public.can_manage_clinic(_user_id uuid, _clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE user_id = _user_id AND clinic_id = _clinic_id AND status = 'active'
    AND role IN ('owner', 'secretary')
  )
$$;

-- 9. RLS policies for clinics
CREATE POLICY "Clinic members can view their clinic"
ON public.clinics FOR SELECT
USING (public.is_clinic_member(auth.uid(), id));

CREATE POLICY "Owners can create clinics"
ON public.clinics FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update their clinic"
ON public.clinics FOR UPDATE
USING (public.get_clinic_role(auth.uid(), id) = 'owner');

-- 10. RLS policies for clinic_members
CREATE POLICY "Members can view their clinic members"
ON public.clinic_members FOR SELECT
USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Managers can insert members"
ON public.clinic_members FOR INSERT
WITH CHECK (public.can_manage_clinic(auth.uid(), clinic_id));

CREATE POLICY "Managers can update members"
ON public.clinic_members FOR UPDATE
USING (public.can_manage_clinic(auth.uid(), clinic_id));

CREATE POLICY "Managers can delete members"
ON public.clinic_members FOR DELETE
USING (public.can_manage_clinic(auth.uid(), clinic_id));

-- 11. RLS policies for clinic_invitations
CREATE POLICY "Managers can manage invitations"
ON public.clinic_invitations FOR ALL
USING (public.can_manage_clinic(auth.uid(), clinic_id))
WITH CHECK (public.can_manage_clinic(auth.uid(), clinic_id));

CREATE POLICY "Anyone can view invitation by token"
ON public.clinic_invitations FOR SELECT
USING (true);

-- 12. Additional RLS for assessments with clinic_id
CREATE POLICY "Clinic members can view clinic assessments"
ON public.assessments FOR SELECT
TO authenticated
USING (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic therapists and owners can update clinic assessments"
ON public.assessments FOR UPDATE
TO authenticated
USING (
  clinic_id IS NOT NULL
  AND public.get_clinic_role(auth.uid(), clinic_id) IN ('owner', 'therapist')
);

-- 13. Additional RLS for professional_appointments with clinic_id
CREATE POLICY "Clinic members can view clinic appointments"
ON public.professional_appointments FOR SELECT
TO authenticated
USING (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic managers can manage clinic appointments"
ON public.professional_appointments FOR ALL
TO authenticated
USING (
  clinic_id IS NOT NULL
  AND public.can_manage_clinic(auth.uid(), clinic_id)
)
WITH CHECK (
  clinic_id IS NOT NULL
  AND public.can_manage_clinic(auth.uid(), clinic_id)
);

-- 14. Additional RLS for session_notes with clinic_id
CREATE POLICY "Clinic members can view clinic session notes"
ON public.session_notes FOR SELECT
TO authenticated
USING (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic therapists and owners can manage clinic session notes"
ON public.session_notes FOR ALL
TO authenticated
USING (
  clinic_id IS NOT NULL
  AND public.get_clinic_role(auth.uid(), clinic_id) IN ('owner', 'therapist')
)
WITH CHECK (
  clinic_id IS NOT NULL
  AND public.get_clinic_role(auth.uid(), clinic_id) IN ('owner', 'therapist')
);

-- 15. Indexes for performance
CREATE INDEX idx_clinic_members_user_id ON public.clinic_members(user_id);
CREATE INDEX idx_clinic_members_clinic_id ON public.clinic_members(clinic_id);
CREATE INDEX idx_clinic_invitations_token ON public.clinic_invitations(token);
CREATE INDEX idx_clinic_invitations_email ON public.clinic_invitations(email);
CREATE INDEX idx_assessments_clinic_id ON public.assessments(clinic_id);
CREATE INDEX idx_appointments_clinic_id ON public.professional_appointments(clinic_id);
CREATE INDEX idx_session_notes_clinic_id ON public.session_notes(clinic_id);

-- 16. Trigger for updated_at on clinics
CREATE TRIGGER update_clinics_updated_at
BEFORE UPDATE ON public.clinics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
