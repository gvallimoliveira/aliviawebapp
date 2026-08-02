-- 1. Delivery log ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_delivery_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  category text,
  kind text,
  title text,
  status text NOT NULL DEFAULT 'queued',
  devices integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  detail text,
  ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.push_delivery_log TO authenticated;
GRANT ALL ON public.push_delivery_log TO service_role;

ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own push delivery log"
  ON public.push_delivery_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS push_delivery_log_user_created_idx
  ON public.push_delivery_log (user_id, created_at DESC);

-- 2. Chat message push: use the internal-secret path (anon JWT returned 401) --
CREATE OR REPLACE FUNCTION public.push_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  conv record;
  recip uuid;
  sname text;
BEGIN
  IF COALESCE(NEW.content, '') LIKE '📹 %' THEN
    RETURN NEW;
  END IF;

  SELECT id, patient_user_id, professional_id, recipient_user_id
    INTO conv
    FROM public.conversations
   WHERE id = NEW.conversation_id;

  IF conv.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF conv.patient_user_id = NEW.sender_user_id THEN
    IF conv.professional_id IS NOT NULL THEN
      SELECT user_id INTO recip FROM public.professionals WHERE id = conv.professional_id;
    ELSE
      recip := conv.recipient_user_id;
    END IF;
  ELSE
    recip := conv.patient_user_id;
  END IF;

  IF recip IS NULL OR recip = NEW.sender_user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'Alguém') INTO sname
    FROM public.profiles WHERE user_id = NEW.sender_user_id;

  PERFORM net.http_post(
    url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/notify-user',
    headers := '{"Content-Type":"application/json","x-internal-secret":"942c090a315e1c4a1c79b558fd601e4721f1857065b259b9"}'::jsonb,
    body := jsonb_build_object(
      'user_id', recip::text,
      'title', 'Nova mensagem — Aliv.iA',
      'body', COALESCE(sname, 'Alguém') || ': ' || left(COALESCE(NEW.content, ''), 80),
      'url', '/dashboard?tab=messages&conv=' || NEW.conversation_id::text,
      'tag', 'msg-' || NEW.conversation_id::text,
      'category', 'messages',
      'ref', NEW.id::text
    )
  );
  RETURN NEW;
END;
$function$;

-- 3. Video call push at session creation ------------------------------------
CREATE OR REPLACE FUNCTION public.push_video_call_ringing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.recipient_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/notify-user',
    headers := '{"Content-Type":"application/json","x-internal-secret":"942c090a315e1c4a1c79b558fd601e4721f1857065b259b9"}'::jsonb,
    body := jsonb_build_object(
      'user_id', NEW.recipient_user_id::text,
      'title', 'Chamada de vídeo — Aliv.iA',
      'body', COALESCE(NEW.caller_name, 'Alguém') || ' está te chamando. Toque para atender.',
      'url', '/dashboard?tab=messages&conv=' || NEW.conversation_id::text || '&call=' || NEW.id::text,
      'kind', 'video-call',
      'tag', 'video-call-' || NEW.id::text,
      'call_id', NEW.id::text,
      'category', 'messages',
      'ref', NEW.id::text
    )
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_push_video_call_ringing ON public.video_call_sessions;
CREATE TRIGGER trg_push_video_call_ringing
AFTER INSERT ON public.video_call_sessions
FOR EACH ROW EXECUTE FUNCTION public.push_video_call_ringing();