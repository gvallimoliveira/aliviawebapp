UPDATE auth.users
SET encrypted_password = crypt('parceiroalivia', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE LOWER(email) = 'eletrocampbell@gmail.com';