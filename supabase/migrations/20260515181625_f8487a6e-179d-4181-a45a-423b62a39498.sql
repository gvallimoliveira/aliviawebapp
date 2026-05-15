UPDATE auth.users
SET email_confirmed_at = now()
WHERE id = '3e802635-2a1b-41ab-ae1b-18b9a8cec43b'
  AND email_confirmed_at IS NULL;