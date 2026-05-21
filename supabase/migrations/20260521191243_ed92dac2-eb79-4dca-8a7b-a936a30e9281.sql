
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'administrativo@fullcarefisio.com.br';

WITH new_clinic AS (
  INSERT INTO public.clinics (name, owner_user_id, subscription_status, max_members)
  VALUES ('Full Care Fisio', 'e5b4b0ee-4165-4001-a51d-d99c7555f6a4', 'active', 9999)
  RETURNING id
)
INSERT INTO public.clinic_members (clinic_id, user_id, role, status, accepted_at)
SELECT id, 'e5b4b0ee-4165-4001-a51d-d99c7555f6a4', 'owner', 'active', now()
FROM new_clinic;
