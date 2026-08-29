UPDATE public.studio_credits
   SET last_effective_plan = lower(coalesce(plan, 'free'))
 WHERE last_effective_plan IS NULL;