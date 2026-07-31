CREATE TYPE public.video_call_status AS ENUM ('ringing', 'accepted', 'connecting', 'connected', 'rejected', 'missed', 'ended', 'failed');

CREATE TABLE public.video_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_user_id uuid NOT NULL,
  recipient_user_id uuid NOT NULL,
  status public.video_call_status NOT NULL DEFAULT 'ringing',
  caller_name text NOT NULL DEFAULT 'Usuário',
  recipient_name text,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  connected_at timestamptz,
  ended_at timestamptz,
  push_devices_found integer NOT NULL DEFAULT 0,
  push_sent integer NOT NULL DEFAULT 0,
  push_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.video_call_sessions TO authenticated;
GRANT ALL ON public.video_call_sessions TO service_role;

ALTER TABLE public.video_call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Call participants can view sessions"
ON public.video_call_sessions FOR SELECT TO authenticated
USING (auth.uid() = caller_user_id OR auth.uid() = recipient_user_id);

CREATE POLICY "Callers can create their sessions"
ON public.video_call_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = caller_user_id AND caller_user_id <> recipient_user_id);

CREATE POLICY "Call participants can update sessions"
ON public.video_call_sessions FOR UPDATE TO authenticated
USING (auth.uid() = caller_user_id OR auth.uid() = recipient_user_id)
WITH CHECK (auth.uid() = caller_user_id OR auth.uid() = recipient_user_id);

CREATE INDEX video_call_sessions_recipient_pending_idx
ON public.video_call_sessions (recipient_user_id, status, expires_at DESC);
CREATE INDEX video_call_sessions_caller_recent_idx
ON public.video_call_sessions (caller_user_id, created_at DESC);
CREATE INDEX video_call_sessions_conversation_idx
ON public.video_call_sessions (conversation_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_video_call_session_times()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at <= NEW.created_at THEN
    RAISE EXCEPTION 'Video call expiry must be after creation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_video_call_session_times_trigger
BEFORE INSERT OR UPDATE ON public.video_call_sessions
FOR EACH ROW EXECUTE FUNCTION public.validate_video_call_session_times();

ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
ADD COLUMN IF NOT EXISTS last_failure_at timestamptz;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.video_call_sessions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;