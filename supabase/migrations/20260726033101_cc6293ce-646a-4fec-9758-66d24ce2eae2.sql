
-- ============================================================
-- 1) patient-files bucket: remove broad policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view patient files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload patient files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete patient files" ON storage.objects;

-- ============================================================
-- 2) professionals: prevent self-update of sensitive fields
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_professional_sensitive_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role boolean := (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role';
  is_admin_user boolean := public.is_admin(auth.uid());
BEGIN
  -- Service role and admins can change anything
  IF is_service_role OR is_admin_user THEN
    RETURN NEW;
  END IF;

  -- For regular users editing their own row, block sensitive fields
  IF NEW.user_id = auth.uid() THEN
    IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.premium_granted IS DISTINCT FROM OLD.premium_granted
       OR NEW.is_partner IS DISTINCT FROM OLD.is_partner
       OR NEW.pro_access_expires_at IS DISTINCT FROM OLD.pro_access_expires_at
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    THEN
      RAISE EXCEPTION 'Not allowed to modify subscription/billing fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_professional_sensitive_self_update ON public.professionals;
CREATE TRIGGER trg_prevent_professional_sensitive_self_update
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_professional_sensitive_self_update();

-- ============================================================
-- 3) assessments: restrict anon flow policies to active + recent rows
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view clinic assessments for flow" ON public.assessments;
DROP POLICY IF EXISTS "Anyone can update clinic assessments during flow" ON public.assessments;
DROP POLICY IF EXISTS "Anyone can view professional assessments for flow" ON public.assessments;
DROP POLICY IF EXISTS "Anyone can update professional assessments" ON public.assessments;

CREATE POLICY "Anon flow can view clinic assessments (active window)"
ON public.assessments FOR SELECT TO anon, authenticated
USING (
  type = 'professional'
  AND user_id IS NULL
  AND clinic_id IS NOT NULL
  AND status IN ('in_progress', 'red_flagged')
  AND created_at > (now() - interval '48 hours')
);

CREATE POLICY "Anon flow can update clinic assessments (active window)"
ON public.assessments FOR UPDATE TO anon, authenticated
USING (
  type = 'professional'
  AND user_id IS NULL
  AND clinic_id IS NOT NULL
  AND status IN ('in_progress', 'red_flagged')
  AND created_at > (now() - interval '48 hours')
)
WITH CHECK (
  type = 'professional'
  AND user_id IS NULL
  AND clinic_id IS NOT NULL
);

CREATE POLICY "Anon flow can view professional assessments (active window)"
ON public.assessments FOR SELECT TO anon, authenticated
USING (
  type = 'professional'
  AND user_id IS NULL
  AND professional_id IS NOT NULL
  AND status IN ('in_progress', 'red_flagged')
  AND created_at > (now() - interval '48 hours')
  AND public.has_active_pro_subscription(professional_id)
);

CREATE POLICY "Anon flow can update professional assessments (active window)"
ON public.assessments FOR UPDATE TO anon, authenticated
USING (
  type = 'professional'
  AND user_id IS NULL
  AND professional_id IS NOT NULL
  AND status IN ('in_progress', 'red_flagged')
  AND created_at > (now() - interval '48 hours')
  AND public.has_active_pro_subscription(professional_id)
)
WITH CHECK (
  type = 'professional'
  AND user_id IS NULL
  AND professional_id IS NOT NULL
);
