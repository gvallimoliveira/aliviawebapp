# Periodização e Carga Subjetiva (sRPE / prontidão) — plano para aplicação futura

Módulo novo no Aliv.iA fisioterapia, ligado à hipótese diagnóstica e ao plano STEPS: transforma o "plano de tratamento" em um **plano periodizado com monitoramento de carga**, cobrindo a ponte fisio → academia → esporte.

## Onde entra no app (visão)

1. **Prontuário do paciente (PRO/Clínica)** — nova seção `sec-periodizacao` no `PatientSectionRail`, logo depois de "Programas de exercícios". É a casa principal: planner de ciclos + painel de carga daquele paciente.
2. **Aba do plano de tratamento / hipótese** — quando a hipótese é aprovada, um CTA "Estruturar periodização" cria o macrociclo já pré-preenchido pelas fases do STEPS (Cicatrização → Hipertrofia/Força → Potência/Transição → Retorno ao Esporte).
3. **Programa de exercícios (HEP)** — cada item do microciclo pode apontar para um `exercise_program` existente; a sessão de academia/campo vira um "bloco" ao lado das sessões de fisio.
4. **Paciente/atleta (link público `/hep/:token` + área do paciente)** — check-in diário (sono, dor muscular, estresse, prontidão) e sRPE pós-sessão. Sem login extra: reaproveita o token do HEP, igual ao `PendingQuestionnaire`.
5. **Dashboard PRO — Insights** — card "Carga e prontidão" com pacientes em ACWR > 1,5 ou queda de prontidão, no mesmo padrão de `ChurnRiskCard`/alertas.
6. **Central de alertas + push** — spike de fadiga/ACWR gera alerta ao profissional pelo transporte de push já existente.
7. **PDF / WhatsApp** — anexo "Periodização e carga" no relatório: gráfico de carga semanal, ACWR e checklist de liberação.

## Blocos funcionais

### A. Planner de ciclos
- **Macrociclo**: timeline horizontal com fases, datas e meta clínica; herda a hipótese e as fases do STEPS.
- **Mesociclos**: blocos de 3–6 semanas (Acumulação, Transmutação, Realização) com objetivo, volume alvo e critérios de saída.
- **Microciclo**: grade semanal com 3 trilhas (Fisio | Força/Academia | Campo/Esporte). Cada dia recebe carga planejada (baixa/média/alta) e o sistema **bloqueia visualmente dois dias consecutivos de alto estresse no membro acometido**, além de alertar salto semanal > 10%.

### B. Hub de monitoramento subjetivo
- **sRPE**: duração (min) × RPE 0–10 = Training Load; soma semanal, carga aguda (7 d), crônica (28 d) e **ACWR**.
- **Check-in diário**: dor muscular, sono, estresse, fadiga, prontidão (escala 1–5 ou 1–10, configurável).
- **Semáforo**: verde (ACWR 0,8–1,3), âmbar (1,3–1,5 ou queda de prontidão), vermelho (> 1,5 ou spike de fadiga) com sugestão de redução de carga — sempre como **sugestão**, decisão é do fisioterapeuta.
- Reaproveita o padrão visual do `PainDiary` e gráficos `recharts` (curva de carga semanal, ACWR, fadiga × carga).

### C. Ponte interdisciplinar (fisio → academia → esporte)
- Checklist de liberação por fase: índice de simetria de membros (< 10%, alimentado pela dinamometria/ADM já existentes), prontidão psicológica (TSK, ACL-RSI), tolerância à carga mecânica.
- **Restrições compartilháveis**: lista de "pode / não pode" com link público de leitura para o preparador físico/treinador (mesmo mecanismo de `short_links`), sem expor o prontuário.
- Notas trocadas entre fisio e treinador, no padrão das notas de sessão.

## Coerência com as suas regras
- Nada de superfície instável nas sugestões de progressão; perturbação por carga/elástico, solo firme, redução de base de apoio.
- Créditos de IA: o planner é **determinístico** (cálculos e regras locais, sem custo). Só a "sugestão de ajuste de bloco" por IA consome crédito, e sob botão explícito.
- Suporte: ao lançar, atualizar `Support.tsx` + `ClinicSupport.tsx` (pt/en/es) no mesmo ciclo.

## Detalhes técnicos (para a execução)

Banco (migrations, com GRANT + RLS por profissional/clínica/paciente):
- `periodization_plans` (patient_id, professional_id, clinic_id, assessment_id, sport, injured_limb, start/end, status)
- `periodization_cycles` (plan_id, level: macro|meso|micro, parent_id, name, goal, start/end, order)
- `periodization_sessions` (cycle_id, date, track: physio|gym|sport, planned_load, exercise_program_id, notes)
- `srpe_entries` (patient_id, plan_id, session_date, duration_min, rpe, training_load gerado)
- `readiness_checkins` (patient_id, date, soreness, sleep, stress, fatigue, readiness, note) — 1 por dia
- `clearance_checklists` (plan_id, phase, item_key, status, value, evaluated_by, evaluated_at)
- `plan_restrictions` (plan_id, text, kind: allow|avoid, share_token)

Cálculos em `src/lib/periodization.ts`: `trainingLoad`, `acuteLoad(7d)`, `chronicLoad(28d)`, `acwr`, `weeklySpike`, `loadZone` — puros e cobertos por testes (`src/test/periodization.test.ts`).

Componentes: `PeriodizationSection.tsx` (seção do prontuário), `MacroTimeline.tsx`, `MesoBlocks.tsx`, `MicroWeekGrid.tsx`, `LoadMonitorCard.tsx`, `SrpeEntryDialog.tsx`, `ReadinessCheckinCard.tsx`, `ClearanceChecklistCard.tsx`, registro em `patientSections.ts` e flag `ENABLE_PERIODIZATION` em `featureFlags.ts`.

Entrada do paciente: rota `/carga/:token` (check-in + sRPE) reaproveitando o token do HEP.

## Ordem de entrega sugerida
1. Fase 1 — tabelas + `periodization.ts` + testes + flag desligada.
2. Fase 2 — sRPE e check-in diário (entrada do paciente + card no prontuário + gráficos). Já entrega valor sozinho.
3. Fase 3 — planner macro/meso/micro com regras de distribuição de carga.
4. Fase 4 — ponte interdisciplinar (checklist, restrições, link do treinador).
5. Fase 5 — alertas/push, Insights, bloco no PDF, atualização das páginas de suporte.

## Pontos a refinar com você
- Público-alvo: só pacientes esportivos/atletas ou disponível para qualquer paciente PRO?
- Escalas: prontidão 1–5 ou 1–10? Quais itens obrigatórios no check-in diário?
- O treinador deve ter link somente-leitura ou também poder registrar sessões/sRPE?
- Frequência das cobranças de check-in (push diário? só quando há sessão planejada?)
