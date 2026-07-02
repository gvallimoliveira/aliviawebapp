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

### 🟡 Fase 5 — Enforcement gradual (EM ANDAMENTO — subdividida 5.0–5.5)

Ver `.lovable/plan.md` para detalhe completo. Trilhos de segurança em todas:
flag `app_config.ai_credits_enforced` false até 5.3; bypass VIP + `is_partner` sempre respeitado; clínica nunca bloqueia.

- **✅ 5.0 — Leitura consolidada (02/07/2026)**
  - Fix crítico em `get_user_ai_tier`: usava `clinics.subscription_tier` e `professionals.plan_type`, ambos inexistentes. Agora deriva porte via `clinics.max_members` e classifica PRO por `subscription_status`/`lifetime_treatment`/`premium_granted`.
  - Nova função `get_included_credits_for_tier(text)` — fonte única das quotas (pro/academic 100 mensal, 120 anual — **iguais pois pagam o mesmo preço**; clinic 200/250/300, premium_b2c 15). Ajustado 02/07/2026: academic 40/50 → 100/120.
  - Nova função `ensure_current_credit_quota(uuid)` — cria linha do mês corrente e reagrega `used_credits` de `ai_credit_usage`.
  - Nova função `get_user_credit_status(uuid)` → jsonb com `{tier, is_partner, unlimited, included, used, purchased, pct, clinic_size}`. Grants para authenticated + service_role.
  - Verificado com 6 profissionais reais: parceiros → `unlimited: true`, clínica derivada corretamente, PRO comum retorna 100 cr.
- **✅ 5.1 — Widget honesto (02/07/2026)**
  - `AiCreditsWidget.tsx` reescrito consumindo RPC `get_user_credit_status`.
  - VIP/parceiro veem card "Uso ilimitado 💚" sem barra, sem botão de compra, com badge da razão do ilimitado (Parceiro / Admin).
  - Demais usuários veem barra `used/included`, saldo de pacotes comprados e CTA de compra.
  - Ainda **zero bloqueio ou warning** — só apresentação.
- **⏳ 5.2 — Warning a 80%** — banner + push opcional. Ainda não iniciado.
- **⏳ 5.3 — Path de enforcement em canário (VIP/parceiro)** — validar que bypass não regride latência antes de bloquear ninguém.
- **⏳ 5.4 — Soft-block real em PRO/Acadêmico/Premium** — retorno 402 + modal otimista, rollout em 3 ondas. Clínica fica de fora.
- **⏳ 5.5 — Soft-block em clínica** — só se dados mostrarem abuso; nunca bloqueia atendimento.
- Consumir saldo (Fase 5.4): primeiro pacote comprado (FIFO por `expires_at`), depois quota mensal.



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
