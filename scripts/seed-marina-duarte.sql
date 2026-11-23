-- One-off authorized simulation; every write is gated to the existing solo fixture.
-- No links, messages, patients, appointments, safety decisions or payments are created.
WITH target AS (
  SELECT p.id AS patient_id,p.professional_id,a.id AS assessment_id,pl.id AS plan_id,p.email
  FROM public.patients p
  JOIN public.assessments a ON a.id='f7a22ae3-52cd-4c0d-9f4d-4d76729ec239' AND a.professional_id=p.professional_id AND a.clinic_id IS NULL AND a.patient_email=p.email
  JOIN public.periodization_plans pl ON pl.id='ea161f8d-350e-41c0-996c-1e0254cb6e6b' AND pl.patient_id=p.id AND pl.clinic_id IS NULL
  WHERE p.id='a0f8170b-77d6-48aa-a650-b121bf34fcef' AND p.professional_id='f67ae246-40d0-4339-ada5-5d718a422224' AND p.clinic_id IS NULL AND p.full_name='Marina Duarte' AND p.occupation='Dentista'
), marked AS (
 UPDATE public.patients p SET is_study_case=true,notes=concat_ws(E'\n',nullif(p.notes,''),'[SIMULAÇÃO MARINA 2026-11] Paciente fictícia: dentista, CrossFit e corrida recreativa. Histórico, medições e evolução simulados; não são prescrição nem atendimento real.'),load_monitoring_enabled=true
 FROM target t WHERE p.id=t.patient_id AND coalesce(p.notes,'') NOT LIKE '%[SIMULAÇÃO MARINA 2026-11]%'
 RETURNING p.id
), plan_update AS (
 UPDATE public.periodization_plans pl SET sport='CrossFit adaptado e corrida recreativa',title='Marina — retorno gradual ao trabalho e esporte (SIMULADO)',start_date='2026-10-26',notes='[SIMULAÇÃO MARINA 2026-11] Dor lombar 7/10 e ombro direito 6/10 na avaliação atual, após semana de maior demanda odontológica. Manter modulação da dor e controle motor; sem alta ou liberação automática. Histórico fictício de quatro semanas com melhora parcial e recrudescência. Sem FC, idade ou teto cardíaco inventados.'
 FROM target t WHERE pl.id=t.plan_id RETURNING pl.id
), phase_data(id,name,goal,start_day,end_day,position) AS (
 VALUES
 ('8950413c-7da2-4693-8d68-7e0d6e66bf67'::uuid,'Controle de dor e inflamação','[SIMULADO] Reduzir irritabilidade; pactuar pausas e atividades toleráveis. Sem lesão estrutural confirmada.','2026-10-26'::date,'2026-12-12'::date,0),
 ('317bbefa-32cc-4d8f-9fe1-20097c8c8f17'::uuid,'Reparo tecidual','[SIMULADO] Fase condicional: respeitar recuperação e restrições, sem inferir lesão ou avançar por data.','2026-12-13'::date,'2026-12-19'::date,1),
 ('d6a9163a-d9ec-4ef9-b2b1-50dc395acd16'::uuid,'Mobilidade','[SIMULADO] Recuperar movimento e controle nas tarefas da odontologia e do treino.','2026-12-20'::date,'2027-01-02'::date,2),
 ('5262bd14-077c-4a3d-8503-774a68d3046b'::uuid,'Força geral','[SIMULADO] Reconstruir capacidade de ombro e quadril, com doses toleráveis.','2027-01-03'::date,'2027-02-27'::date,3)
), phases_updated AS (
 UPDATE public.periodization_cycles c SET name=d.name,goal=d.goal,start_date=d.start_day,end_date=d.end_day,sort_order=d.position
 FROM target t CROSS JOIN phase_data d WHERE c.plan_id=t.plan_id AND c.id=d.id AND c.level='macro' RETURNING c.id
), specific_phase AS (
 INSERT INTO public.periodization_cycles(id,plan_id,level,name,goal,start_date,end_date,sort_order,is_current)
 SELECT md5('marina-simulation-specific-phase')::uuid,t.plan_id,'macro','Força específica','[SIMULADO] Retomar demandas graduais do CrossFit, corrida e odontologia conforme avaliação; Alta é terminal, nunca automática.','2027-02-28','2027-03-27',4,false FROM target t
 ON CONFLICT(id) DO NOTHING RETURNING id
), snapshots(day,back,shoulder,flex,rext,abduction,rotation,hip,grip,overview) AS (
 VALUES
 ('2026-10-26'::date,6,5,150,65,6.8,5.3,12.8,23.5,'[SIMULADO · 26/10] Dentista com dor lombar 6/10 e ombro direito 5/10 após jornadas prolongadas e início no CrossFit. Limitação de flexão e rotação externa do ombro, menor força à direita. D.I.F.I.: dor e possível inibição limitam trabalho sustentado e treino; não concluir lesão estrutural. STEPS: modulação da dor e controle motor. Corrida recreativa com alternância caminhada/trote, sem gestos acima da cabeça dolorosos.'),
 ('2026-11-08'::date,5,4,155,70,7.1,5.8,13.1,24.0,'[SIMULADO · 08/11] Melhora parcial com pausas na odontologia e redução dos WODs. Dor lombar 5/10 e ombro direito 4/10, ganho discreto de ADM e força. Persistem limitações para trabalho prolongado e carga acima da cabeça. Manter modulação e controle motor; não avançar para potência ou retorno pleno pelo calendário.'),
 ('2026-11-15'::date,4,3,165,78,7.7,6.2,13.8,24.8,'[SIMULADO · 15/11] Dor lombar 4/10 e ombro direito 3/10 em semana mais leve. Melhor tolerância a corrida fácil e CrossFit adaptado, mas ainda há déficit de força e sintomas com posturas prolongadas. Ganho de capacidade não equivale a alta; progressão depende da reavaliação presencial e resposta nas 24 horas seguintes.')
), history AS (
 INSERT INTO public.assessments(id,user_id,type,status,professional_id,clinic_id,patient_name,patient_email,pain_regions,pain_score,anamnesis_data,test_results,diagnosis,red_flags,created_at,reviewed_at)
 SELECT md5('marina-simulation-202611:'||s.day)::uuid,a.user_id,a.type,'completed',t.professional_id,NULL,'Marina Duarte',t.email,a.pain_regions,s.back,
 a.anamnesis_data || jsonb_build_object('simulation',true,'simulationLabel','SIMULAÇÃO MARINA 2026-11','painScore',s.back,'painScoresPerRegion',jsonb_build_object('anamnesis.complaint.back_pain',s.back,'anamnesis.complaint.shoulder_pain',s.shoulder),
 'strengthTable',jsonb_build_array(jsonb_build_object('movement','Abdução de ombro','leftValue','9.2','rightValue',s.abduction::text,'unit','kgf'),jsonb_build_object('movement','Rotação externa de ombro','leftValue','7.4','rightValue',s.rotation::text,'unit','kgf'),jsonb_build_object('movement','Abdução de quadril','leftValue','14.5','rightValue',s.hip::text,'unit','kgf'),jsonb_build_object('movement','Preensão manual','leftValue','26.0','rightValue',s.grip::text,'unit','kgf')),
 'romTable',jsonb_build_array(jsonb_build_object('joint','Flexão de ombro','leftValue','180°','rightValue',s.flex||'°'),jsonb_build_object('joint','Rotação externa de ombro','leftValue','90°','rightValue',s.rext||'°'),jsonb_build_object('joint','Dorsiflexão em carga – lunge','leftValue','38°','rightValue','35°'))),
 '[]'::jsonb,jsonb_build_object('hypothesis','Hipótese clínica preliminar simulada: dor lombar e do ombro direito associadas à demanda laboral e esportiva; confirmação presencial necessária.','manual',true,'clinicalImpression',jsonb_build_object('overview',s.overview,'therapeuticObjectives',jsonb_build_array('Modular sintomas no trabalho','Recuperar controle motor e tolerância à carga','Retomar CrossFit e corrida gradualmente'))),a.red_flags,(s.day::text||'T15:00:00Z')::timestamptz,now()
 FROM target t JOIN public.assessments a ON a.id=t.assessment_id CROSS JOIN snapshots s
 ON CONFLICT (id) DO NOTHING RETURNING id
), measurements AS (
 UPDATE public.assessments a SET anamnesis_data=a.anamnesis_data || jsonb_build_object('simulation',true,'simulationLabel','SIMULAÇÃO MARINA 2026-11',
 'strengthTable','[{"movement":"Abdução de ombro","leftValue":"9.4","rightValue":"7.2","unit":"kgf","leftTrials":[{"value":"9.0"},{"value":"9.4"},{"value":"9.2"}],"rightTrials":[{"value":"6.9"},{"value":"7.2"},{"value":"7.0"}]},{"movement":"Rotação externa de ombro","leftValue":"7.6","rightValue":"5.7","unit":"kgf","leftTrials":[{"value":"7.3"},{"value":"7.6"},{"value":"7.5"}],"rightTrials":[{"value":"5.5"},{"value":"5.7"},{"value":"5.6"}]},{"movement":"Abdução de quadril","leftValue":"14.8","rightValue":"13.2","unit":"kgf"},{"movement":"Preensão manual","leftValue":"26.2","rightValue":"24.0","unit":"kgf"}]'::jsonb,
 'romTable','[{"joint":"Flexão de ombro","leftValue":"180°","rightValue":"160°"},{"joint":"Rotação externa de ombro","leftValue":"90°","rightValue":"75°"},{"joint":"Dorsiflexão em carga – lunge","leftValue":"38°","rightValue":"35°"}]'::jsonb),
 diagnosis=jsonb_set(a.diagnosis,'{clinicalImpression,overview}',to_jsonb(coalesce(a.diagnosis#>>'{clinicalImpression,overview}','')||E'\n\n[SIMULAÇÃO MARINA 2026-11 · complemento de 22/11] O texto acima foi salvo antes das medições complementares. Os valores agora incluídos são fictícios: flexão do ombro D 160°, rotação externa D 75°, abdução D 7,2 kgf e rotação externa D 5,7 kgf. Melhora parcial nas semanas anteriores e recrudescência após jornada odontológica extensa; lombar 7/10 e ombro 6/10 mantidos. Reduzir a exposição provocativa e revisar tolerância antes de progredir. Não representa medição ou atendimento real.')),needs_reimpression=false
 FROM target t WHERE a.id=t.assessment_id AND coalesce(a.diagnosis#>>'{clinicalImpression,overview}','') NOT LIKE '%[SIMULAÇÃO MARINA 2026-11 · complemento%' RETURNING a.id
), activity(day,track,duration,rpe,title) AS (
 SELECT d::date,'physio',45,3,'Fisioterapia: modulação, controle escapular e lombo-pélvico' FROM generate_series('2026-10-26'::date,'2026-11-29'::date,'1 day') d WHERE extract(isodow from d) IN (2,5)
 UNION ALL
 SELECT d::date,'sport',CASE WHEN d::date>='2026-11-16' THEN 25 ELSE 35 END,CASE WHEN d::date>='2026-11-16' THEN 3 ELSE 4 END,'CrossFit adaptado: técnica, sem overhead doloroso ou kipping' FROM generate_series('2026-10-26'::date,'2026-11-29'::date,'1 day') d WHERE extract(isodow from d) IN (1,4)
 UNION ALL
 SELECT d::date,'cardio',CASE WHEN d::date>='2026-11-16' THEN 20 ELSE 30 END,3,CASE WHEN d::date>='2026-11-16' THEN 'Caminhada leve; corrida suspensa no recrudescimento' ELSE 'Corrida fácil alternada com caminhada, sem treino de velocidade' END FROM generate_series('2026-10-26'::date,'2026-11-29'::date,'1 day') d WHERE extract(isodow from d)=6
), planned AS (
 INSERT INTO public.periodization_sessions(id,patient_id,plan_id,session_date,track,planned_load,title,planned_duration_min,planned_rpe,notes,created_source)
 SELECT md5('marina-simulation-session:'||ac.day||':'||ac.track)::uuid,t.patient_id,t.plan_id,ac.day,ac.track,'light','[SIMULADO] '||ac.title,ac.duration,ac.rpe,'[SIMULAÇÃO MARINA 2026-11] Ajustar ou interromper se piora dos sintomas; progressão depende da avaliação presencial. Descanso nos demais dias não é inferido pelo sistema.','professional'
 FROM target t CROSS JOIN activity ac ON CONFLICT(id) DO NOTHING RETURNING id
), loads AS (
 INSERT INTO public.srpe_entries(id,patient_id,plan_id,session_id,session_date,track,duration_min,rpe,source,notes)
 SELECT md5('marina-simulation-load:'||ac.day||':'||ac.track)::uuid,t.patient_id,t.plan_id,md5('marina-simulation-session:'||ac.day||':'||ac.track)::uuid,ac.day,ac.track,ac.duration-CASE WHEN extract(day from ac.day)::int%3=0 THEN 5 ELSE 0 END,ac.rpe+CASE WHEN ac.day IN ('2026-11-16','2026-11-19') AND ac.track='sport' THEN 1 ELSE 0 END,'professional','[SIMULAÇÃO MARINA 2026-11] Esforço e duração fictícios; sessão vinculada ao planejamento, sem duplicar carga. Jornada odontológica prolongada é contexto, não carga sRPE de treino.'
 FROM target t CROSS JOIN activity ac WHERE ac.day<='2026-11-22' AND NOT EXISTS(SELECT 1 FROM public.srpe_entries e WHERE e.patient_id=t.patient_id AND e.session_date=ac.day AND e.track=ac.track)
 ON CONFLICT(id) DO NOTHING RETURNING id
), checkins AS (
 INSERT INTO public.readiness_checkins(patient_id,plan_id,checkin_date,soreness,sleep,stress,fatigue,readiness,pain,note,source)
 SELECT t.patient_id,t.plan_id,d::date,CASE WHEN d::date>='2026-11-16' THEN 6 ELSE 4 END,CASE WHEN extract(isodow from d) IN (1,2,4) THEN 5 ELSE 7 END,CASE WHEN extract(isodow from d) IN (1,2,4) THEN 7 ELSE 4 END,CASE WHEN d::date>='2026-11-16' THEN 6 ELSE 4 END,CASE WHEN d::date>='2026-11-16' THEN 4 ELSE 7 END,CASE WHEN d::date='2026-11-22' THEN 7 WHEN d::date>='2026-11-16' THEN 6 WHEN d::date>='2026-11-08' THEN 4 ELSE 5 END,
 '[SIMULAÇÃO MARINA 2026-11] '||CASE WHEN extract(isodow from d) IN (1,2,4) THEN 'Mais de seis horas na odontologia; pausas irregulares e recuperação reduzida.' ELSE 'Dia com pausas e menor demanda laboral. Nota fictícia de recuperação; não prova causalidade com o treino.' END,'professional'
 FROM target t CROSS JOIN generate_series('2026-10-26'::date,'2026-11-22'::date,'1 day') d
 ON CONFLICT(patient_id,checkin_date) DO NOTHING RETURNING id
), notes(day,content) AS (
 VALUES
 ('2026-10-27'::date,'Avaliação funcional simulada: dor lombar 6/10 e ombro D 5/10. Trabalho odontológico com flexão sustentada do tronco e alcance repetido. Educação sobre pausas e ajuste da bancada; exercícios leves de controle lombo-pélvico e escapular. CrossFit adaptado, sem kipping e sem overhead doloroso. D.I.F.I.: distinguir dor/inibição de fraqueza mensurada.'),
 ('2026-11-03'::date,'Sessão simulada: relata pausas curtas entre pacientes, mas mantém dois dias de jornada extensa. Exercícios de controle motor e isométricos submáximos tolerados. Dor lombar 5/10, ombro 4/10. Corrida fácil alternada com caminhada; sem treino de velocidade. Manter dose antes de progredir.'),
 ('2026-11-10'::date,'Sessão simulada: melhora parcial de tolerância ao trabalho com pausas e apoio dos antebraços. Revisão da técnica de agachamento e hinge sem aumentar carga externa. Dor lombar 4/10, ombro 3/10; treino adaptado sem overhead doloroso. Objetivo: melhorar capacidade, não cumprir calendário de alta.'),
 ('2026-11-17'::date,'Sessão simulada: semana de agenda odontológica mais cheia, menor sono e PSR 4/10. Recrudescência da lombar 6/10 e ombro 5/10; causalidade com treino não demonstrada. Reduzido CrossFit a técnica leve e corrida substituída por caminhada. Mantida modulação e controle motor; sem avanço automático de fase.'),
 ('2026-11-22'::date,'Revisão simulada: lombar 7/10 e ombro D 6/10, coerentes com a avaliação atual. Complementadas ADM e dinamometria fictícias com pequeno recuo após piora dos sintomas. Plano para a próxima semana: duas sessões de fisioterapia, duas técnicas leves de CrossFit adaptado e caminhada no lugar da corrida. Reavaliar resposta em 24 horas antes de qualquer progressão; sem liberação esportiva ou alta.')
), evolutions AS (
 INSERT INTO public.session_notes(id,professional_id,clinic_id,patient_email,session_date,content,observation)
 SELECT md5('marina-simulation-note:'||n.day)::uuid,t.professional_id,NULL,t.email,n.day,'[SIMULAÇÃO MARINA 2026-11] '||n.content,'Dados fictícios para demonstração autorizada; sem agendamento ou avaliação criada pela Agenda.'
 FROM target t CROSS JOIN notes n ON CONFLICT(id) DO NOTHING RETURNING id
)
SELECT (SELECT count(*) FROM target) AS scoped_patient,(SELECT count(*) FROM history) AS simulated_assessments,(SELECT count(*) FROM measurements) AS complemented_assessments,(SELECT count(*) FROM planned) AS planned_sessions,(SELECT count(*) FROM loads) AS completed_sessions,(SELECT count(*) FROM checkins) AS daily_checkins,(SELECT count(*) FROM evolutions) AS evolution_notes;