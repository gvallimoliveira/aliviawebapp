---
name: Periodização e carga subjetiva
description: Módulo de periodização (macro/meso/micro), sRPE, ACWR e check-in de prontidão no prontuário PRO, com link público /carga/:token.
type: feature
---
- Disponível para TODOS os pacientes PRO/clínica, não só atletas. Escalas de check-in em 1–10, todos os itens opcionais, 1 check-in por dia (paciente ou treinador sobrescreve o do dia).
- Seção `sec-periodizacao` no prontuário, logo após "Programas de exercícios"; flag `ENABLE_PERIODIZATION` em `src/lib/featureFlags.ts`.
- Cálculos 100% locais e determinísticos em `src/lib/periodization.ts` (training load = duração × RPE, aguda 7d, crônica 28d/4, ACWR, zonas, salto semanal >10%, score de prontidão 0–100) — nunca consome créditos de IA.
- Fases padrão do macrociclo espelham o STEPS: Cicatrização tecidual (3s) → Hipertrofia e força (8s) → Potência e transição (6s) → Retorno ao esporte (4s).
- Proibido superfície instável (Bosu) nas recomendações; preferir solo firme, perturbação por carga/elástico e redução da base de apoio.
- Link público por token via Edge Function `periodization-checkin` (rota `/carga/:token`), audiências `patient` e `coach`; independe de HEP — paciente presencial usa link simples ou registro manual pelo profissional.
- Alertas push (sem e-mail) quando ACWR > 1,3/1,5, prontidão baixa (<40) ou queda ≥20 pts: disparados por `periodization-checkin` via `notify-user` com `x-internal-secret`, categoria `load_alerts`, kind `load_alert`, 1 alerta por paciente/dia por destinatário (dedupe em `push_delivery_log`); destinatários = profissional responsável + membros ativos da clínica; toggle "Alertas de carga e prontidão" em Minha Conta (`notification_preferences.load_alerts`).
- Insights: card "Carga e prontidão" (`LoadReadinessCard.tsx`) na aba Insights (PRO e clínica), alimentado pela RPC `get_patient_load_alerts(_clinic_id,_professional_id)` — cálculo no banco, sem IA.
- Se o paciente ainda não tem registro em `patients`, a seção resolve por e-mail/nome e cria sob demanda ("Ativar para este paciente").
- ACWR só é calculado com linha de base mínima: ≥4 sessões de sRPE e ≥14 dias de histórico (`chronicBaselineReady`), espelhado na Edge Function e na RPC `get_patient_load_alerts`. Antes disso a UI mostra "—"/"Histórico insuficiente" e nenhum alerta de risco é disparado.
- Recarregar a seção após registrar dado usa `load({ silent: true })` — nunca colapsar em spinner de página inteira (causa scroll-up).
- Links públicos `/carga/:token` só funcionam em produção após publicar o frontend (a rota é client-side).
