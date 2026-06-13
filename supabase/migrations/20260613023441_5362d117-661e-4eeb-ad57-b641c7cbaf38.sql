insert into public.app_config (key, value)
values ('clinical_agent_enabled', 'true'::jsonb)
on conflict (key) do update set value = excluded.value;