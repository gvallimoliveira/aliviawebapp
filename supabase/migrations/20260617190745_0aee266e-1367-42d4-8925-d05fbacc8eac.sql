
-- 1. Tracks (catálogo público para autenticados)
CREATE TABLE public.academic_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  niche text NOT NULL,
  description text,
  total_modules int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academic_tracks TO authenticated;
GRANT ALL ON public.academic_tracks TO service_role;
ALTER TABLE public.academic_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tracks visible to authenticated" ON public.academic_tracks
  FOR SELECT TO authenticated USING (true);

-- 2. Modules
CREATE TABLE public.academic_track_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.academic_tracks(id) ON DELETE CASCADE,
  order_index int NOT NULL,
  title text NOT NULL,
  summary text,
  suggested_command text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academic_track_modules TO authenticated;
GRANT ALL ON public.academic_track_modules TO service_role;
ALTER TABLE public.academic_track_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules visible to authenticated" ON public.academic_track_modules
  FOR SELECT TO authenticated USING (true);
CREATE INDEX academic_track_modules_track_idx ON public.academic_track_modules(track_id, order_index);

-- 3. User progress
CREATE TABLE public.academic_user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.academic_tracks(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.academic_track_modules(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  xp_earned int NOT NULL DEFAULT 30,
  UNIQUE (user_id, module_id)
);
GRANT SELECT, INSERT, DELETE ON public.academic_user_progress TO authenticated;
GRANT ALL ON public.academic_user_progress TO service_role;
ALTER TABLE public.academic_user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON public.academic_user_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. XP log
CREATE TABLE public.academic_xp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,          -- 'quiz' | 'case' | 'track_module' | 'translation'
  source_ref text,
  niche text,
  xp int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.academic_xp_log TO authenticated;
GRANT ALL ON public.academic_xp_log TO service_role;
ALTER TABLE public.academic_xp_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own xp" ON public.academic_xp_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own xp" ON public.academic_xp_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX academic_xp_log_user_idx ON public.academic_xp_log(user_id, created_at DESC);

-- 5. Badges
CREATE TABLE public.academic_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  niche text NOT NULL,
  level text NOT NULL,           -- aprendiz | praticante | especialista | mestre
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, niche, level)
);
GRANT SELECT, INSERT ON public.academic_badges TO authenticated;
GRANT ALL ON public.academic_badges TO service_role;
ALTER TABLE public.academic_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own badges" ON public.academic_badges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own badges" ON public.academic_badges
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6. Seed (5 nichos x 5 módulos)
WITH inserted AS (
  INSERT INTO public.academic_tracks (slug, title, niche, description, total_modules) VALUES
    ('ombro', 'Trilha do Ombro', 'ombro', 'Do conceito ao raciocínio clínico em disfunções do ombro.', 5),
    ('lombar', 'Trilha da Lombar', 'lombar', 'Avaliação e tratamento da dor lombar baseada em evidência.', 5),
    ('quadril', 'Trilha do Quadril', 'quadril', 'Disfunções do quadril: do impacto femoroacetabular à artrose.', 5),
    ('joelho', 'Trilha do Joelho', 'joelho', 'Lesões ligamentares, meniscais e dor patelofemoral.', 5),
    ('cervical', 'Trilha da Cervical', 'cervical', 'Cervicalgia mecânica, cefaleias cervicogênicas e raciocínio clínico.', 5)
  RETURNING id, slug, niche
)
INSERT INTO public.academic_track_modules (track_id, order_index, title, summary, suggested_command)
SELECT i.id, m.idx,
  m.title_template || ' do ' || initcap(i.niche),
  m.summary_template,
  replace(m.cmd_template, '{niche}', i.niche)
FROM inserted i
CROSS JOIN (
  VALUES
    (1, 'Conceitos fundamentais', 'Anatomia funcional, biomecânica básica e principais quadros clínicos.', '/professor anatomia e biomecânica do {niche}'),
    (2, 'Avaliação clínica', 'Anamnese direcionada, testes ortopédicos e screening de red flags.', '/professor avaliação clínica e testes especiais do {niche}'),
    (3, 'Raciocínio diagnóstico', 'Hipóteses diferenciais e quando indicar exames complementares.', '/quiz diagnóstico diferencial {niche} 5'),
    (4, 'Tratamento baseado em evidência', 'Exercícios prescritos, terapia manual e progressão de carga.', '/professor tratamento baseado em evidência para {niche}'),
    (5, 'Caso clínico aplicado', 'Aplique tudo em um paciente fictício gerado pelo agente.', '/caso {niche} caso complexo')
) AS m(idx, title_template, summary_template, cmd_template);
