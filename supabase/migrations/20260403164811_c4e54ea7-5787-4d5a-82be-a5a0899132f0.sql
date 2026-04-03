ALTER TABLE public.conversations
ADD COLUMN hidden_by_patient boolean NOT NULL DEFAULT false,
ADD COLUMN hidden_by_professional boolean NOT NULL DEFAULT false;