-- 1) Premium payment status can only be granted by the server (payment verification).
CREATE OR REPLACE FUNCTION public.guard_assessment_paid_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR current_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status = 'paid' THEN
      RAISE EXCEPTION 'payment_status paid can only be set by payment verification' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.payment_status IS DISTINCT FROM OLD.payment_status AND NEW.payment_status = 'paid' THEN
    RAISE EXCEPTION 'payment_status paid can only be set by payment verification' USING ERRCODE = '42501';
  ELSIF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
    NEW.paid_at := OLD.paid_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_assessment_paid_status ON public.assessments;
CREATE TRIGGER trg_guard_assessment_paid_status
BEFORE INSERT OR UPDATE ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.guard_assessment_paid_status();

-- 2) Agent messages written by clients may only be user/assistant turns.
CREATE OR REPLACE FUNCTION public.guard_agent_message_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR current_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.role NOT IN ('user','assistant') THEN
    RAISE EXCEPTION 'invalid message role' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_agent_message_role ON public.agent_messages;
CREATE TRIGGER trg_guard_agent_message_role
BEFORE INSERT OR UPDATE ON public.agent_messages
FOR EACH ROW EXECUTE FUNCTION public.guard_agent_message_role();

-- 3) Academic module progress: real module, fixed XP, once per module, no edits.
CREATE OR REPLACE FUNCTION public.guard_academic_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR current_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'progress rows are immutable' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.academic_track_modules m WHERE m.id = NEW.module_id AND m.track_id = NEW.track_id) THEN
    RAISE EXCEPTION 'unknown module' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.academic_user_progress p WHERE p.user_id = NEW.user_id AND p.module_id = NEW.module_id) THEN
    RAISE EXCEPTION 'module already completed' USING ERRCODE = '23505';
  END IF;
  NEW.xp_earned := 30;
  NEW.completed_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_academic_progress ON public.academic_user_progress;
CREATE TRIGGER trg_guard_academic_progress
BEFORE INSERT OR UPDATE ON public.academic_user_progress
FOR EACH ROW EXECUTE FUNCTION public.guard_academic_progress();

-- 4) XP log: amounts must be backed by a module completion or a recent quiz result.
CREATE OR REPLACE FUNCTION public.guard_academic_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q record;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR current_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;
  NEW.created_at := now();
  IF NEW.source = 'track_module' THEN
    IF NEW.xp <> 30 THEN
      RAISE EXCEPTION 'invalid xp amount' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.academic_user_progress p
      JOIN public.academic_track_modules m ON m.id = p.module_id
      JOIN public.academic_tracks t ON t.id = m.track_id
      WHERE p.user_id = NEW.user_id
        AND (t.slug || ':' || m.order_index) = NEW.source_ref
        AND t.niche IS NOT DISTINCT FROM NEW.niche
    ) THEN
      RAISE EXCEPTION 'module not completed' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.academic_xp_log x WHERE x.user_id = NEW.user_id AND x.source = 'track_module' AND x.source_ref = NEW.source_ref) THEN
      RAISE EXCEPTION 'xp already granted' USING ERRCODE = '23505';
    END IF;
  ELSIF NEW.source = 'quiz' THEN
    SELECT r.* INTO q FROM public.academic_quiz_results r
    WHERE r.user_id = NEW.user_id AND r.topic = NEW.source_ref
      AND r.created_at > now() - interval '15 minutes'
    ORDER BY r.created_at DESC LIMIT 1;
    IF q IS NULL OR NEW.xp < 0 OR NEW.xp > least(q.correct, q.total_questions, 20) * 10 THEN
      RAISE EXCEPTION 'xp not backed by a quiz result' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.academic_xp_log x WHERE x.user_id = NEW.user_id AND x.source = 'quiz' AND x.source_ref = NEW.source_ref AND x.created_at >= q.created_at) THEN
      RAISE EXCEPTION 'xp already granted' USING ERRCODE = '23505';
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid xp source' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_academic_xp ON public.academic_xp_log;
CREATE TRIGGER trg_guard_academic_xp
BEFORE INSERT ON public.academic_xp_log
FOR EACH ROW EXECUTE FUNCTION public.guard_academic_xp();

-- 5) Badges only when the user's niche XP reaches the level threshold.
CREATE OR REPLACE FUNCTION public.guard_academic_badge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total int;
  needed int;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR current_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;
  needed := CASE NEW.level
    WHEN 'aprendiz' THEN 0
    WHEN 'praticante' THEN 101
    WHEN 'especialista' THEN 301
    WHEN 'mestre' THEN 701
    ELSE NULL END;
  IF needed IS NULL THEN
    RAISE EXCEPTION 'invalid badge level' USING ERRCODE = '22023';
  END IF;
  SELECT coalesce(sum(xp), 0) INTO total FROM public.academic_xp_log
  WHERE user_id = NEW.user_id AND niche = NEW.niche;
  IF total < needed OR (needed = 0 AND total <= 0) THEN
    RAISE EXCEPTION 'badge not earned' USING ERRCODE = '42501';
  END IF;
  NEW.awarded_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_academic_badge ON public.academic_badges;
CREATE TRIGGER trg_guard_academic_badge
BEFORE INSERT ON public.academic_badges
FOR EACH ROW EXECUTE FUNCTION public.guard_academic_badge();

REVOKE EXECUTE ON FUNCTION public.guard_academic_progress() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_academic_xp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_academic_badge() FROM PUBLIC, anon, authenticated;