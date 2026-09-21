-- ============================================================
-- STUDIO: COMPARTILHAR UMA MARCA COM OUTRAS CONTAS
-- O criador da marca convida por e-mail; o convidado acessa tudo
-- dentro daquela marca (gerar, editar, baixar, fotos, textos).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.studio_brand_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.studio_brands(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID,
  invited_by UUID,
  note TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, email)
);

CREATE INDEX IF NOT EXISTS idx_studio_brand_members_email ON public.studio_brand_members(email);
CREATE INDEX IF NOT EXISTS idx_studio_brand_members_user ON public.studio_brand_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_brand_members TO authenticated;
GRANT ALL ON public.studio_brand_members TO service_role;
ALTER TABLE public.studio_brand_members ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Helpers SECURITY DEFINER (evitam recursão de RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.studio_brand_owner(_brand_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.user_id FROM public.studio_brands b WHERE b.id = _brand_id
$$;

CREATE OR REPLACE FUNCTION public.studio_current_email()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  v_email := lower(coalesce(nullif(auth.jwt() ->> 'email', ''), ''));
  IF v_email = '' AND auth.uid() IS NOT NULL THEN
    SELECT lower(coalesce(u.email, '')) INTO v_email FROM auth.users u WHERE u.id = auth.uid();
  END IF;
  RETURN coalesce(v_email, '');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_studio_brand(_brand_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_email text;
BEGIN
  IF _brand_id IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT b.user_id INTO v_owner FROM public.studio_brands b WHERE b.id = _brand_id;
  IF v_owner IS NULL THEN
    RETURN false;
  END IF;
  IF v_owner = auth.uid() THEN
    RETURN true;
  END IF;

  v_email := public.studio_current_email();

  RETURN EXISTS (
    SELECT 1 FROM public.studio_brand_members m
     WHERE m.brand_id = _brand_id
       AND m.revoked_at IS NULL
       AND (m.user_id = auth.uid() OR (v_email <> '' AND lower(m.email) = v_email))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.studio_brand_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_studio_brand(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.studio_current_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studio_brand_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_studio_brand(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.studio_current_email() TO authenticated, service_role;

-- ------------------------------------------------------------
-- Políticas da tabela de membros: dono gerencia, membro lê o próprio registro
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "studio_brand_members_owner_all" ON public.studio_brand_members;
CREATE POLICY "studio_brand_members_owner_all" ON public.studio_brand_members
  FOR ALL TO authenticated
  USING (public.studio_brand_owner(brand_id) = auth.uid())
  WITH CHECK (public.studio_brand_owner(brand_id) = auth.uid());

DROP POLICY IF EXISTS "studio_brand_members_self_read" ON public.studio_brand_members;
CREATE POLICY "studio_brand_members_self_read" ON public.studio_brand_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR lower(email) = public.studio_current_email());

-- ------------------------------------------------------------
-- Acesso compartilhado às tabelas da marca
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "studio_brands_member_read" ON public.studio_brands;
CREATE POLICY "studio_brands_member_read" ON public.studio_brands
  FOR SELECT TO authenticated
  USING (public.can_access_studio_brand(id));

DROP POLICY IF EXISTS "studio_brands_member_update" ON public.studio_brands;
CREATE POLICY "studio_brands_member_update" ON public.studio_brands
  FOR UPDATE TO authenticated
  USING (public.can_access_studio_brand(id))
  WITH CHECK (public.can_access_studio_brand(id));

DROP POLICY IF EXISTS "studio_creations_member_all" ON public.studio_creations;
CREATE POLICY "studio_creations_member_all" ON public.studio_creations
  FOR ALL TO authenticated
  USING (public.can_access_studio_brand(brand_id))
  WITH CHECK (public.can_access_studio_brand(brand_id));

DROP POLICY IF EXISTS "studio_photos_member_all" ON public.studio_photos;
CREATE POLICY "studio_photos_member_all" ON public.studio_photos
  FOR ALL TO authenticated
  USING (public.can_access_studio_brand(brand_id))
  WITH CHECK (public.can_access_studio_brand(brand_id));

DROP POLICY IF EXISTS "studio_texts_member_all" ON public.studio_texts;
CREATE POLICY "studio_texts_member_all" ON public.studio_texts
  FOR ALL TO authenticated
  USING (public.can_access_studio_brand(brand_id))
  WITH CHECK (public.can_access_studio_brand(brand_id));

DROP POLICY IF EXISTS "studio_phrase_memory_member_all" ON public.studio_phrase_memory;
CREATE POLICY "studio_phrase_memory_member_all" ON public.studio_phrase_memory
  FOR ALL TO authenticated
  USING (public.can_access_studio_brand(brand_id))
  WITH CHECK (public.can_access_studio_brand(brand_id));

DROP POLICY IF EXISTS "studio_copy_learning_member_all" ON public.studio_copy_learning;
CREATE POLICY "studio_copy_learning_member_all" ON public.studio_copy_learning
  FOR ALL TO authenticated
  USING (public.can_access_studio_brand(brand_id))
  WITH CHECK (public.can_access_studio_brand(brand_id));

DROP POLICY IF EXISTS "studio_brand_briefs_member_all" ON public.studio_brand_briefs;
CREATE POLICY "studio_brand_briefs_member_all" ON public.studio_brand_briefs
  FOR ALL TO authenticated
  USING (public.can_access_studio_brand(brand_id))
  WITH CHECK (public.can_access_studio_brand(brand_id));

DROP POLICY IF EXISTS "studio_director_runs_member_all" ON public.studio_director_runs;
CREATE POLICY "studio_director_runs_member_all" ON public.studio_director_runs
  FOR ALL TO authenticated
  USING (public.can_access_studio_brand(brand_id))
  WITH CHECK (public.can_access_studio_brand(brand_id));

-- Fotos no Storage: quem tem acesso à marca lê os arquivos daquela marca.
DROP POLICY IF EXISTS "Studio photos: brand members read" ON storage.objects;
CREATE POLICY "Studio photos: brand members read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'studio-photos'
  AND EXISTS (
    SELECT 1 FROM public.studio_photos p
     WHERE p.storage_path = storage.objects.name
       AND public.can_access_studio_brand(p.brand_id)
  )
);

-- ------------------------------------------------------------
-- Convite casa com a conta no primeiro acesso
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_studio_brand_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;
  v_email := public.studio_current_email();
  IF v_email = '' THEN
    RETURN 0;
  END IF;

  WITH upd AS (
    UPDATE public.studio_brand_members m
       SET user_id = auth.uid()
     WHERE lower(m.email) = v_email
       AND m.user_id IS NULL
       AND m.revoked_at IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_studio_brand_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_studio_brand_invites() TO authenticated, service_role;

-- ------------------------------------------------------------
-- Cota: geração em marca compartilhada debita a cota do criador
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.studio_credit_status_for(_user uuid)
RETURNS TABLE(plan text, unlimited boolean, batch_size integer, allowance integer, used_this_period integer, remaining integer, generations_left integer, period_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.studio_credits;
  v_plan text;
  v_granted_plan text;
  v_email text;
  v_unlimited boolean := false;
  v_allow integer;
  v_month date;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'user required';
  END IF;

  SELECT lower(coalesce(u.email, '')) INTO v_email FROM auth.users u WHERE u.id = _user;
  v_email := coalesce(v_email, '');

  INSERT INTO public.studio_credits (user_id) VALUES (_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v FROM public.studio_credits WHERE user_id = _user;

  v_month := (date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')))::date;
  IF v.period_start IS NULL OR v.period_start < v_month THEN
    UPDATE public.studio_credits
       SET used_this_period = 0, period_start = v_month, updated_at = now()
     WHERE user_id = _user
     RETURNING * INTO v;
  END IF;

  IF v_email <> '' AND EXISTS (SELECT 1 FROM public.vip_users vu WHERE lower(vu.email) = v_email) THEN
    v_unlimited := true;
  END IF;

  v_plan := CASE lower(coalesce(v.plan, 'free'))
    WHEN 'solo' THEN 'solo'
    WHEN 'marca' THEN 'marca'
    WHEN 'agencia' THEN 'agencia'
    ELSE 'free'
  END;

  IF NOT v_unlimited AND v_email <> '' THEN
    SELECT CASE lower(coalesce(g.plan, 'solo'))
      WHEN 'marca' THEN 'marca'
      WHEN 'agencia' THEN 'agencia'
      ELSE 'solo'
    END
    INTO v_granted_plan
    FROM public.studio_granted_access g
    WHERE lower(g.email) = v_email AND g.revoked_at IS NULL
    ORDER BY CASE lower(coalesce(g.plan, 'solo'))
      WHEN 'agencia' THEN 3 WHEN 'marca' THEN 2 ELSE 1 END DESC
    LIMIT 1;
    IF v_granted_plan IS NOT NULL THEN
      v_plan := v_granted_plan;
    END IF;
  END IF;

  v_allow := public.studio_plan_allowance(v_plan) + coalesce(v.extra_credits, 0);

  RETURN QUERY SELECT
    v_plan,
    v_unlimited,
    1,
    v_allow,
    coalesce(v.used_this_period, 0),
    GREATEST(v_allow - coalesce(v.used_this_period, 0), 0),
    GREATEST(v_allow - coalesce(v.used_this_period, 0), 0),
    v.period_start;
END;
$$;

REVOKE ALL ON FUNCTION public.studio_credit_status_for(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studio_credit_status_for(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_studio_generation_for_brand(p_brand_id uuid)
RETURNS TABLE(allowed boolean, plan text, unlimited boolean, allowance integer, used_this_period integer, remaining integer, generations_left integer, period_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  s record;
  v_used integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_owner := public.studio_brand_owner(p_brand_id);

  -- Sem marca (ou sem acesso a ela): cai na cota da própria conta.
  IF v_owner IS NULL OR NOT public.can_access_studio_brand(p_brand_id) THEN
    RETURN QUERY SELECT * FROM public.consume_studio_generation(1);
    RETURN;
  END IF;

  IF v_owner = auth.uid() THEN
    RETURN QUERY SELECT * FROM public.consume_studio_generation(1);
    RETURN;
  END IF;

  -- Marca compartilhada: a geração pesa na cota de quem criou a marca.
  SELECT * INTO s FROM public.studio_credit_status_for(v_owner);

  IF s.unlimited THEN
    RETURN QUERY SELECT true, s.plan, true, s.allowance, s.used_this_period, s.remaining, s.generations_left, s.period_start;
    RETURN;
  END IF;

  IF s.remaining <= 0 THEN
    RETURN QUERY SELECT false, s.plan, false, s.allowance, s.used_this_period, s.remaining, s.generations_left, s.period_start;
    RETURN;
  END IF;

  UPDATE public.studio_credits AS sc
     SET used_this_period = coalesce(sc.used_this_period, 0) + 1,
         updated_at = now()
   WHERE sc.user_id = v_owner
   RETURNING sc.used_this_period INTO v_used;

  RETURN QUERY SELECT
    true, s.plan, false, s.allowance, v_used,
    GREATEST(s.allowance - v_used, 0),
    GREATEST(s.allowance - v_used, 0),
    s.period_start;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_studio_generation_for_brand(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_studio_generation_for_brand(uuid) TO authenticated, service_role;

-- Status visível ao membro dentro da marca compartilhada.
CREATE OR REPLACE FUNCTION public.studio_brand_credit_status(p_brand_id uuid)
RETURNS TABLE(plan text, unlimited boolean, batch_size integer, allowance integer, used_this_period integer, remaining integer, generations_left integer, period_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  v_owner := public.studio_brand_owner(p_brand_id);
  IF v_owner IS NULL OR v_owner = auth.uid() OR NOT public.can_access_studio_brand(p_brand_id) THEN
    RETURN QUERY SELECT * FROM public.studio_credit_status();
    RETURN;
  END IF;
  RETURN QUERY SELECT * FROM public.studio_credit_status_for(v_owner);
END;
$$;

REVOKE ALL ON FUNCTION public.studio_brand_credit_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studio_brand_credit_status(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
