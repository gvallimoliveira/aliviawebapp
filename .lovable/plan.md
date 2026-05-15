## Inteligência Preditiva — Clínica + Pro

5 funções no modo Clínica (owner + secretária), 3 no Pro autônomo (#2 churn, #3 alta, #6 meta/what-if).

---

### Princípio de UX (anti-poluição)

Tudo dentro de **uma única aba nova "Insights"** no dashboard, em vez de espalhar cards. Dentro dela, sub-seções colapsáveis com ordem de prioridade:

```text
[ Visão Geral | Pacientes | Insights ← NOVA | Equipe | Configurações ]

Insights
 ├─ 🔴 Alertas ativos (churn + previsão de alta)         ← sempre aberto
 ├─ 📊 Adesão dos pacientes (top 10 / piores)            ← clínica
 ├─ 🏆 Benchmarking anônimo (vs clínicas similares)      ← clínica
 └─ 💰 Meta & Simulador what-if                          ← clínica + pro
```

No Pro autônomo a aba se chama igual mas só mostra: Alertas (churn + alta) e Meta/What-if. Sem Adesão lista, sem Benchmarking.

Fora da aba: apenas **um badge discreto** no header do dashboard mostrando contagem de alertas críticos (`3 pacientes em risco`), clicável → leva à aba Insights.

---

### Feature 2 — Predição de churn (clínica + pro)

**Heurística no banco** (sem ML pesado, transparente e explicável):

Score 0-100 baseado em:

- Sem agendamento futuro + última sessão > 7 dias → +40
- Faltas (`no_show`) nas últimas 4 sessões → +15 por falta
- Dor estagnada (média últimos 7 dias do diary igual à média anterior, ou em alta) → +20
- Sem mensagem trocada há > 20 dias → +10
- Adesão a exercícios < 40% últimos 14 dias → +15

≥60 = "Em risco". Componente `ChurnRiskCard` lista até 10 pacientes com:

- Nome + score + 2 motivos principais
- Botão "Reagendar" (abre modal agenda) + "Enviar mensagem" (abre chat)

**Backend**: RPC `get_patient_churn_risk(_clinic_id, _professional_id)` retorna lista ordenada. Roda on-demand quando a aba abre (cache 10 min via `useQuery` simples com `staleTime`).

### Feature 3 — Predição de alta (clínica + pro)

**Heurística**:

- Calcular Δ dor por sessão (regressão linear simples nos últimos 6 pontos do diary)
- Estimar sessões restantes até dor ≤ 2 (ou meta definida)
- Combinar com adesão (se < 50%, multiplicar estimativa por 1.5)
- Mostrar "Alta estimada em X sessões (~Y semanas)" + barra de progresso

Componente `DischargePredictionCard` — lista pacientes ativos com estimativa, ordenado por proximidade da alta. Permite filtrar "próximos da alta (≤3 sessões)" — útil para conversa antecipada com paciente.

**Backend**: RPC `get_discharge_predictions` retorna `{ patient, sessions_done, sessions_remaining, weeks_estimate, confidence }`.

### Feature 4 — Score de adesão (só clínica)

Score 0-100 por paciente:

- Exercícios concluídos vs prescritos (40%)
- Diário preenchido (% dias últimos 14) (25%)
- Comparecimento (1 - no_show_rate) (25%)
- Mensagens lidas (10%)

Componente `PatientAdherenceCard` mostra:

- Top 5 (verde) e Bottom 5 (âmbar/vermelho)
- Nome + score + barra colorida + mini-breakdown ao expandir

Para o paciente (gamificação) — **fora desta entrega**, só registrar como TODO. Foco agora é visibilidade pro profissional/clínica.

**Backend**: RPC `get_patient_adherence_scores(_clinic_id)`.

### Feature 5 — Benchmarking anônimo (só clínica)

Compara KPIs da clínica com média de clínicas em mesma faixa de porte (`small` 1-3 terapeutas, `medium` 4-10, `large` 11+). Métricas:

- Taxa de no-show
- Taxa de ocupação
- Avaliações concluídas/mês por terapeuta
- Tempo médio até alta

Componente `BenchmarkCard` — frases viciantes:

> "Sua taxa de no-show (18%) está **8pp acima** da média de clínicas com porte semelhante (10%)."

Cor: verde (melhor), neutro, âmbar (pior).

**Backend**: RPC `get_clinic_benchmarks(_clinic_id)` que calcula no servidor agregando todas as clínicas da mesma faixa, retornando só médias (sem dados individuais — anonimato preservado). Mínimo 5 clínicas por faixa para liberar comparação (senão mostra "dados insuficientes").

### Feature 6 — Meta de receita + What-if (clínica + pro)

Componente `RevenueGoalCard`:

1. **Meta mensal** — input editável (salvo em nova coluna `clinics.monthly_revenue_goal` ou `professionals.monthly_revenue_goal`)
2. **Receita atual estimada** — `sessões concluídas no mês × valor_sessão` (campo novo `default_session_price`)
3. **Simulador** — 2 sliders:
  - "Reduzir no-show em" (0-15 pp)
  - "Aumentar ocupação em" (0-25 pp)
  - Output ao vivo: "+R$ X,XX/mês" + barra mostrando como ficaria vs meta

Cálculo 100% client-side com base nos KPIs atuais. Sem RPC nova — usa dados de `get_clinic_kpis` / Pro analytics existentes.

---

### Mudanças técnicas

**Banco** (1 migração):

```sql
ALTER TABLE clinics ADD COLUMN monthly_revenue_goal numeric;
ALTER TABLE clinics ADD COLUMN default_session_price numeric;
ALTER TABLE professionals ADD COLUMN monthly_revenue_goal numeric;
ALTER TABLE professionals ADD COLUMN default_session_price numeric;
ALTER TABLE clinics ADD COLUMN size_bucket text GENERATED ALWAYS AS (...) STORED; -- ou view
```

Mais 4 RPCs `SECURITY DEFINER`:

- `get_patient_churn_risk(_clinic_id uuid, _professional_id uuid)` — um dos dois pode ser null
- `get_discharge_predictions(_clinic_id, _professional_id)`
- `get_patient_adherence_scores(_clinic_id)`
- `get_clinic_benchmarks(_clinic_id)` — agrega cross-clínica, retorna só médias

Cada RPC valida acesso via `is_clinic_member` / `professional ownership`.

**Frontend**:

- `src/components/dashboard/insights/InsightsTab.tsx` (novo) — orquestra sub-cards
- `src/components/dashboard/insights/ChurnRiskCard.tsx`
- `src/components/dashboard/insights/DischargePredictionCard.tsx`
- `src/components/dashboard/insights/PatientAdherenceCard.tsx` (clínica only)
- `src/components/dashboard/insights/BenchmarkCard.tsx` (clínica only)
- `src/components/dashboard/insights/RevenueGoalCard.tsx`
- Integração:
  - `ClinicOwnerDashboard.tsx` + `ClinicSecretaryDashboard.tsx` → adiciona aba/seção "Insights" (5 cards)
  - `ProDashboard.tsx` → adiciona aba "Insights" com 3 cards (churn, alta, meta)
- Badge de alertas no header (`AlertCount` no topo)
- i18n pt/en/es para todas as strings novas

**Manutenção obrigatória** (memória do projeto):

- Atualizar `Support.tsx` + `ClinicSupport.tsx` (pt/en/es) com a nova feature
- Atualizar `mem://index.md` adicionando referência `[Predictive Insights](mem://features/predictive-insights)`

---

### Estimativa

~2 dias. Feature 5 (Benchmarking) é a mais sensível — exige threshold de privacidade. Posso começar quando você aprovar.

### Pontos para você confirmar antes de eu começar

1. **Valor da sessão** — coletar via campo único `default_session_price` por clínica/pro, ou permitir override por terapeuta dentro da clínica?
2. **Adesão para o paciente (gamificação)** — fica fora desta entrega (só painel pro/clínica), ok?
3. **Benchmarking** — mínimo de 5 clínicas por faixa para liberar comparação serve, ou prefere outro número?