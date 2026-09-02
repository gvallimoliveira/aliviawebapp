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
- Alertas push quando ACWR > 1,5, prontidão baixa ou queda abrupta de prontidão.
- Se o paciente ainda não tem registro em `patients`, a seção resolve por e-mail/nome e cria sob demanda ("Ativar para este paciente").
