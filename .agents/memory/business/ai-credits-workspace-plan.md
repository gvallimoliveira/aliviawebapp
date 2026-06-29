---
name: AI Credits Workspace Plan
description: Plano de 7 fases para sistema de créditos de IA do workspace — status atual, próximos passos, IDs Stripe, comandos de validação.
type: feature
---

# Plano de Créditos do Workspace (IA)

Objetivo: limitar/cobrar o consumo de IA do workspace Lovable por usuário, baixar custo da Aliv.iA, e abrir nova receita via pacotes avulsos + cobrança do chat do agente.

Detalhes financeiros e premissas estratégicas: ver `.agents/memory/business/ai-credits-plan-ideas.md`.

## Status por fase

### ✅ Fase 1 — Foundation (concluída)
- Tabelas: `ai_credit_usage`, `ai_credit_packages`, `ai_credit_transactions`, `ai_credit_quotas`.
- Flags: `professionals.is_partner`, `professionals.academic_period`.
- Função: `public.get_user_ai_tier()` → Pro / Academic / Clinic / VIP.
- Flag global `app_config.ai_credits_enforced` (default `false`).

### ✅ Fase 2 — Shadow Tracking (concluída)
- Helper `supabase/functions/_shared/ai-credits.ts` com mapa função→custo, JWT→user_id, log fire-and-forget.
- 15 edge functions instrumentadas (clinical generations, analysis & search, transcription).
- Validação SQL:
  ```sql
  SELECT function_name, sum(credits_used)
  FROM ai_credit_usage
  WHERE created_at > now() - interval '7 days'
  GROUP BY 1 ORDER BY 2 DESC;
  ```

### ✅ Fase 3 — Dashboards (concluída)
- Edge function admin `admin-ai-usage-stats` (VIP-gated) — agrega 7/30/90 dias.
- `src/components/admin/AdminAiUsage.tsx` — 4 KPIs + gráficos Recharts + rankings.
- `src/components/dashboard/AiCreditsWidget.tsx` — widget pessoal do profissional.
- Integração em `Admin.tsx` (`?tab=ai-usage`) e `ProMetricsSection.tsx`.

### ✅ Fase 4 — Pacotes & Checkout (concluída)
- Stripe products (BRL, one-off):
  - Mini 100cr / R$29 → `price_1TmPeN2HgVhVBE8UEtFep6pP` (prod `prod_UlxZoOjS4UjkOT`)
  - Plus 300cr / R$69 → `price_1TmPew2HgVhVBE8UXx7J7IPy` (prod `prod_Ulxa8zRS8Oyd3T`)
  - Pro 1000cr / R$199 → `price_1TmPff2HgVhVBE8Ux0QWlJq7` (prod `prod_UlxajKyKLj4Lnd`)
- Edge function `create-ai-credits-checkout` (catálogo server-side, JWT-gated, metadata `type: "ai_credits"`).
- `stripe-webhook` → novo case `ai_credits` em `fulfillOrder`: insere `ai_credit_packages` (12 meses validade) + `ai_credit_transactions`, idempotente por `stripe_session_id`, push notification.
- `src/components/dashboard/AiCreditsStore.tsx` — modal 3 cards, abre Checkout em nova aba, trata `?ai_credits=success|canceled`.
- Widget atualizado: mostra saldo comprado + botão "Comprar pacote de créditos".

### ⏸ Fase 5 — Enforcement gradual (AGUARDANDO)
- **Pré-requisito:** 5-7 dias de dados reais via shadow tracking após publish da Fase 4.
- **Quotas-alvo por tier** (decisão 26/06: reduzir Pro, manter Clínica generosa pois nada foi anunciado externamente):
  - `pro_monthly`: **100 créditos/mês** (antes considerado 150; reduzido — uso moderado real ≈33 cr)
  - `pro_annual`: **120 créditos/mês** (leve premium pela fidelidade anual)
  - `academic_monthly` / `academic_annual`: 40 / 50 cr (quizzes fixos já cortaram demanda)
  - `clinic_small`: **200 cr/mês por terapeuta** (mantida generosa — diferencial competitivo)
  - `clinic_medium` / `clinic_large`: 250 / 300 cr/mês por terapeuta
  - `premium_b2c`: 15 cr/mês
  - `unlimited` (VIP/admin): sem trava
- Passos:
  1. Validar custos estimados vs reais no dashboard admin.
  2. Seedar `ai_credit_quotas` conforme tabela acima (job mensal via cron).
  3. Implementar warning a 80% de uso (banner + push).
  4. Soft-block a 100% (modal "compre pacote ou aguarde reset"). **Clínica nunca bloqueia** — só warning; excedente vai pra fatura do dono.
  5. Ligar `app_config.ai_credits_enforced = true` (rollout gradual: VIP → 10% usuários → todos).
- Consumir saldo: primeiro pacote comprado (FIFO por `expires_at`), depois quota mensal.

### ⏳ Fase 6 — Ajuste de margem dos planos de clínica (depois)
- Reprecificar Clinic Basic/Plus/Enterprise considerando custo real de IA (extraído dos dados da Fase 5).
- Aumentar margem 5-10pp conforme plano em memória.

### ✅ Fase 7 (parcial) — Chat do Agente como add-on (CONCLUÍDO via A5, 29/06/2026)
- Assinatura mensal R$ 14,90 / 150 msgs (`price_1Tnmik2HgVhVBE8UH8xK7t5H`).
- Instrumentado em `clinical-agent-chat` com reset mensal (`reset_chat_addon_period_if_needed`).
- **VIP + parceiros isentos** — bypass antes de contar addon ou logar crédito.
- Excedente após 150 msgs cai no fluxo normal de créditos (0,05 cr/turno).
- UI: card no `AiCreditsStore.tsx` + toast de ativação.

### ✅ A5 paralelo — Trial Clínica endurecido (CONCLUÍDO 29/06/2026)
- CNPJ obrigatório (mod 11) + bloqueio de duplicidade por CNPJ.
- `clinics.trial_credits_cap = 75` cap absoluto de IA durante trial.
- MEI aceito. Front (`ClinicLanding.tsx`) valida 14 dígitos antes de enviar.
- **Não afeta VIP/parceiros** — eles não passam pelo fluxo de trial.

### ✅ A5 paralelo — Pacote Anual de créditos (CONCLUÍDO 29/06/2026)
- R$ 299 / 1200 créditos (`price_1Tnmj52HgVhVBE8UJfS8V5lF`), válido 12 meses.
- Fulfilled via `stripe-webhook` (mesmo case `ai_credits`).


## Arquivos-chave

**Backend / DB**
- `supabase/functions/_shared/ai-credits.ts` (logging helper)
- `supabase/functions/create-ai-credits-checkout/index.ts`
- `supabase/functions/stripe-webhook/index.ts` (case `ai_credits`)
- `supabase/functions/admin-ai-usage-stats/index.ts`
- Tabelas: `ai_credit_usage`, `ai_credit_packages`, `ai_credit_transactions`, `ai_credit_quotas`
- Função SQL: `public.get_user_ai_tier()`
- Flag: `app_config.ai_credits_enforced`

**Frontend**
- `src/components/admin/AdminAiUsage.tsx`
- `src/components/dashboard/AiCreditsWidget.tsx`
- `src/components/dashboard/AiCreditsStore.tsx`
- `src/components/dashboard/ProMetricsSection.tsx` (integração)
- `src/pages/Admin.tsx` (`?tab=ai-usage`)

## Otimizações já aplicadas (paralelas ao plano)
- Switch para Gemini Flash/Flash-Lite nas tarefas pesadas.
- `generate-clinical-impression` enxuto (omite campos vazios, trim de contexto).
- Cache `public.ai_response_cache` + helper `_shared/ai-cache.ts` (functional tests 7d, knowledge enrichment 30d).

## Próxima ação ao retomar
1. Conferir `/admin?tab=ai-usage` — devem ter ≥5 dias de dados reais.
2. Calibrar quotas por tier baseado no consumo P50/P90.
3. Implementar Fase 5 (warning + soft-block + flag rollout).
