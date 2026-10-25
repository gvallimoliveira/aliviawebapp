INSERT INTO public.ai_credit_admin_roles(user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE lower(email) IN ('gvallimoliveira@gmail.com','gvallim.fisio@gmail.com')
ON CONFLICT DO NOTHING;