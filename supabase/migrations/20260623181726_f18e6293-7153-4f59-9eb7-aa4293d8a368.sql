CREATE OR REPLACE FUNCTION public.has_active_pro_subscription(_professional_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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
        OR (COALESCE(p.is_partner, false) = true AND COALESCE(p.is_student, false) = true)
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_has_active_pro_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.professionals p
    WHERE p.user_id = _user_id
      AND public.has_active_pro_subscription(p.id)
  );
$function$;