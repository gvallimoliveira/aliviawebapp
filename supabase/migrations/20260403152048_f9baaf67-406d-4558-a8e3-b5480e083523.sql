
ALTER TABLE public.support_tickets ADD COLUMN archived_at timestamptz DEFAULT NULL;

CREATE TABLE public.support_tickets_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL,
  admin_reply text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid NOT NULL
);

ALTER TABLE public.support_tickets_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage archive"
  ON public.support_tickets_archive FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
