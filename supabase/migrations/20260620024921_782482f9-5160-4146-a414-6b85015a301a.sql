WITH inserted AS (
  INSERT INTO public.academic_tracks (slug, title, niche, description, total_modules) VALUES
    ('anatomia',     'Trilha de Anatomia',     'anatomia',     'Anatomia funcional aplicada às principais regiões corporais — base para qualquer raciocínio clínico.', 5),
    ('biomecanica',  'Trilha de Biomecânica',  'biomecanica',  'Forças, alavancas, eixos e planos: como o corpo se move e se sobrecarrega em cada região.', 5),
    ('cinesiologia', 'Trilha de Cinesiologia', 'cinesiologia', 'Ações musculares, padrões de movimento e controle motor por região corporal.', 5)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, slug, niche
)
INSERT INTO public.academic_track_modules (track_id, order_index, title, summary, suggested_command)
SELECT i.id, m.idx,
  m.title_template,
  m.summary_template,
  replace(m.cmd_template, '{niche}', i.niche)
FROM inserted i
CROSS JOIN (
  VALUES
    (1, 'Ombro: estruturas e função',         'Ossos, articulações, ligamentos e músculos do complexo do ombro aplicados à clínica.',                  '/professor {niche} aplicada ao ombro'),
    (2, 'Coluna lombar: estruturas e função', 'Vértebras, discos, ligamentos e musculatura paravertebral/abdominal — fundamentos para a clínica lombar.', '/professor {niche} aplicada à coluna lombar'),
    (3, 'Cervical: estruturas e função',      'Vértebras cervicais, articulações zigapofisárias e musculatura profunda/superficial do pescoço.',        '/professor {niche} aplicada à coluna cervical'),
    (4, 'Quadril: estruturas e função',       'Acetábulo, fêmur proximal, ligamentos articulares e cadeias musculares do quadril.',                     '/professor {niche} aplicada ao quadril'),
    (5, 'Joelho: estruturas e função',        'Fêmur, tíbia, patela, meniscos, ligamentos cruzados/colaterais e musculatura estabilizadora.',           '/professor {niche} aplicada ao joelho')
) AS m(idx, title_template, summary_template, cmd_template);