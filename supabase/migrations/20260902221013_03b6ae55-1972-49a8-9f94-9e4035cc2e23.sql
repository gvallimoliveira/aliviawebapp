select cron.unschedule('exercise-video-audit-monthly')
where exists (select 1 from cron.job where jobname = 'exercise-video-audit-monthly');

select cron.schedule(
  'exercise-video-audit-monthly',
  '0 6 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/exercise-video-audit',
    headers := '{"Content-Type":"application/json","x-internal-secret":"942c090a315e1c4a1c79b558fd601e4721f1857065b259b9"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);