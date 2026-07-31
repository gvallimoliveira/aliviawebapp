-- Server-side push for new chat messages
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
  -- Skip system/video-call log messages
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

  SELECT COALESCE(full_name, 'Alguém') INTO sname FROM public.profiles WHERE id = NEW.sender_user_id;

  PERFORM net.http_post(
    url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/send-push-notification',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqcnRzcWdub2VlaHZpeXBrcXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDgwNjAsImV4cCI6MjA4NjU4NDA2MH0.YgcP3THSUshBTDzBT3R1Ez_9CRuu5ok82-RCIDM9lBY","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqcnRzcWdub2VlaHZpeXBrcXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDgwNjAsImV4cCI6MjA4NjU4NDA2MH0.YgcP3THSUshBTDzBT3R1Ez_9CRuu5ok82-RCIDM9lBY"}'::jsonb,
    body := jsonb_build_object(
      'user_id', recip::text,
      'title', 'Nova mensagem — Aliv.iA',
      'body', COALESCE(sname, 'Alguém') || ': ' || left(COALESCE(NEW.content, ''), 80),
      'url', '/dashboard?tab=messages&conv=' || NEW.conversation_id::text,
      'tag', 'msg-' || NEW.conversation_id::text,
      'category', 'messages'
    )
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_push_new_message ON public.messages;
CREATE TRIGGER trg_push_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.push_new_message();

-- Server-side push when an assessment is completed
CREATE OR REPLACE FUNCTION public.push_assessment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recip uuid;
  headers jsonb := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqcnRzcWdub2VlaHZpeXBrcXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDgwNjAsImV4cCI6MjA4NjU4NDA2MH0.YgcP3THSUshBTDzBT3R1Ez_9CRuu5ok82-RCIDM9lBY","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqcnRzcWdub2VlaHZpeXBrcXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDgwNjAsImV4cCI6MjA4NjU4NDA2MH0.YgcP3THSUshBTDzBT3R1Ez_9CRuu5ok82-RCIDM9lBY"}'::jsonb;
  payload jsonb;
BEGIN
  IF COALESCE(NEW.status, '') <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') = 'completed' THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'title', 'Avaliação concluída',
    'body', COALESCE(NEW.patient_name, 'Paciente') || ' finalizou a avaliação. Toque para revisar.',
    'url', '/assessment/view/' || NEW.id::text,
    'tag', 'asm-' || NEW.id::text,
    'category', 'assessments'
  );

  IF NEW.professional_id IS NOT NULL THEN
    SELECT user_id INTO recip FROM public.professionals WHERE id = NEW.professional_id;
    IF recip IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/send-push-notification',
        headers := headers,
        body := payload || jsonb_build_object('user_id', recip::text)
      );
    END IF;
  END IF;

  IF NEW.clinic_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/send-push-notification',
      headers := headers,
      body := payload || jsonb_build_object('clinic_id', NEW.clinic_id::text)
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_push_assessment_completed ON public.assessments;
CREATE TRIGGER trg_push_assessment_completed
AFTER INSERT OR UPDATE OF status ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.push_assessment_completed();