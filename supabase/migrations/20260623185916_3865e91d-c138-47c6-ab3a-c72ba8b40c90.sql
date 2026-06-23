CREATE OR REPLACE FUNCTION public.has_active_pro_subscription(_professional_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.professionals p
    WHERE p.id = _professional_id
      AND (
        (
          p.subscription_status = 'active'
          AND (
            p.subscription_stripe_id IS NOT NULL
            OR (p.pro_access_expires_at IS NOT NULL AND p.pro_access_expires_at > now())
          )
        )
        OR COALESCE(p.is_partner, false) = true
        OR (COALESCE(p.is_partner_account, false) = true AND COALESCE(p.is_student, false) = true)
        OR lower(COALESCE(p.email, '')) IN ('gvallimoliveira@gmail.com', 'gvallim.fisio@gmail.com')
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_has_active_pro_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.professionals p
    WHERE p.user_id = _user_id
      AND (
        (
          p.subscription_status = 'active'
          AND (
            p.subscription_stripe_id IS NOT NULL
            OR (p.pro_access_expires_at IS NOT NULL AND p.pro_access_expires_at > now())
          )
        )
        OR COALESCE(p.is_partner, false) = true
        OR (COALESCE(p.is_partner_account, false) = true AND COALESCE(p.is_student, false) = true)
        OR lower(COALESCE(p.email, '')) IN ('gvallimoliveira@gmail.com', 'gvallim.fisio@gmail.com')
      )
  );
$function$;

UPDATE public.professionals
SET
  subscription_status = 'active',
  active_profile_mode = 'student',
  approved = false
WHERE COALESCE(is_partner_account, false) = true
  AND COALESCE(is_student, false) = true
  AND (
    subscription_status IS DISTINCT FROM 'active'
    OR active_profile_mode IS DISTINCT FROM 'student'
    OR approved IS DISTINCT FROM false
  );