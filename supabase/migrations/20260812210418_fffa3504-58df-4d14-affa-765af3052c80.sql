SELECT cron.unschedule('dsr-scheduled-purge') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dsr-scheduled-purge');

SELECT cron.schedule(
  'dsr-scheduled-purge',
  '15 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/admin-dsr-account',
    headers := '{"Content-Type":"application/json","x-internal-secret":"942c090a315e1c4a1c79b558fd601e4721f1857065b259b9"}'::jsonb,
    body := '{"action":"run_scheduled"}'::jsonb
  );
  $$
);