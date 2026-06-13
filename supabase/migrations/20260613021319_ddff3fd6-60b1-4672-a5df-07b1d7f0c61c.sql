
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_threads TO authenticated;
GRANT ALL ON public.agent_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_messages TO authenticated;
GRANT ALL ON public.agent_messages TO service_role;
GRANT SELECT ON public.agent_settings TO authenticated;
GRANT ALL ON public.agent_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.agent_usage_daily TO authenticated;
GRANT ALL ON public.agent_usage_daily TO service_role;
