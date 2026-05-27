
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS professionals_cpf_unique
  ON public.professionals (cpf)
  WHERE cpf IS NOT NULL;

ALTER TABLE public.professionals
  ALTER COLUMN approved SET DEFAULT true;

ALTER TABLE public.professionals DISABLE TRIGGER USER;
UPDATE public.professionals SET approved = true WHERE approved IS DISTINCT FROM true;
ALTER TABLE public.professionals ENABLE TRIGGER USER;
