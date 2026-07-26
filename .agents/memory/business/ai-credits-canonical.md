---
name: AI Credits — Canonical Source of Truth
description: Fonte única e canônica de pacotes, quotas, preços e IDs Stripe do sistema de créditos Aliv.iA. Substitui números divergentes em plan.md e outras memórias.
type: feature
---

# Créditos Aliv.iA — Fonte Única de Verdade (canônica)

**Última atualização:** 29/06/2026
**Status:** este documento sobrescreve qualquer número diferente em `.lovable/plan.md` ou outras memórias. Em caso de conflito, **este arquivo vence**.

---

## 1. Pacotes Stripe ativos (BRL, one-off) — **o que está realmente rodando no app**

| SKU | Créditos | Preço | Stripe price_id | Notas |
|---|---|---|---|---|
| **Starter** | 25 cr | R$ 8 | `price_1TmRLn2HgVhVBE8UsHAPQlBe` | Entrada |
| **Mini** | 50 cr | R$ 15 | `price_1TmR9S2HgVhVBE8UkDiP7iTx` | "Popular" |
| **Plus** | 150 cr | R$ 39 | `price_1TnmWF2HgVhVBE8UokvoKgGZ` | "Melhor valor" — repricing 29/06/2026 (R$35 → R$39, margem 23% → 32%) |

Validade: 12 meses a partir da compra. Idempotência via `stripe_session_id`.

> **Histórico de preços do Plus:**
> - 28/06/2026: R$ 35 (`price_1TmR9i2HgVhVBE8URRd5yRSh`) — desativado por margem insuficiente.
> - 29/06/2026: R$ 39 (`price_1TnmWF2HgVhVBE8UokvoKgGZ`) — em produção.
>
> **Proposta NÃO implementada (Mini 100cr/R$29, Plus 300cr/R$69, Pro 1000cr/R$199):** existia em rascunhos anteriores, mas nunca foi ativada no Stripe nem no edge function. Para implementar, criar novos price_ids e fazer migração coordenada (UI + edge + cache de quotas).

## 2. Quotas mensais por tier (Fase 5 — aguardando seed)

| Tier | Quota mensal | Observações |
|---|---|---|
| `pro_monthly` | 60 cr | **Ajustado 26/07/2026** (150 → 100 → 60). Cobre uso intenso do autônomo real (≤8 avaliações/mês + chat): ~8×0,78 + impressões/HEP + chat ≈ 25–40 cr. |
| `pro_annual` | 72 cr | +20% pela fidelidade |
| `academic_monthly` | 60 cr | **Igual ao PRO** — Acadêmico paga o mesmo preço que Profissional, então cota deve ser idêntica. |
| `academic_annual` | 72 cr | **Igual ao PRO anual** pelo mesmo motivo. |
| `clinic_small` (≤3 ther.) | 200 cr/terapeuta | **Generoso por estratégia — sem hard block, só warning + overage** |
| `clinic_medium` (≤8) | 250 cr/terapeuta | idem |
| `clinic_large` (9+) | 300 cr/terapeuta | idem |
| `premium_b2c` | 15 cr | Uso de paciente |
| `unlimited` (VIP/admin/partner Chat) | — | Sem trava |

## 3. Add-ons recorrentes (Fase 5/7)

| Add-on | Preço | Inclui | Stripe price_id | Status |
|---|---|---|---|---|
| **Chat do Agente — Mensal** | R$ 14,90/mês | 150 mensagens/mês; excedente consome créditos normais | `price_1Tnmik2HgVhVBE8UH8xK7t5H` | **ATIVO (A5, 29/06/2026)** — instrumentado em `clinical-agent-chat` via `profiles.chat_addon_status` + `chat_addon_msgs_used` (reset mensal por `reset_chat_addon_period_if_needed`). Quando ativo e dentro da franquia, shadow-log registra `credits: 0` + `chat_addon: true`. |
| **Pacote IA Anual** | R$ 299 (one-off) | 1200 créditos, val. 12 meses | `price_1Tnmj52HgVhVBE8UJfS8V5lF` | **ATIVO (A5, 29/06/2026)** — ~R$ 0,25/cr (~4% off vs Plus avulso). Fulfilled via `stripe-webhook` com metadata `package=annual`. |
| Transcrição +5 | R$ 14,90 | 5 transcrições, val. 12 meses | — | Base inclui 5/mês no PRO |
| Transcrição +15 | R$ 34,90 | 15 transcrições | — | |
| Transcrição +50 | R$ 89,90 | 50 transcrições | — | |

### 3.1 Trial Clínica (A5)

- **Limite de IA durante trial:** 75 créditos totais (campo `clinics.trial_credits_cap`, default 75).
- **CNPJ obrigatório:** validado por dígitos verificadores (mod 11) em `_shared/cnpj.ts`. Bloqueio de duplicidade (1 trial por CNPJ).
- **MEI aceito.** Campo `clinics.cnpj` único.
- Front: `ClinicLanding.tsx` exige 14 dígitos antes de enviar.


## 4. Custo unitário Lovable assumido

**R$ 0,18 por crédito Aliv.iA** (premissa de planejamento) — **NÃO validado** contra fatura real ainda (ver Etapa A2).

## 5. Regras de exceção

- **Admin VIP** (`gvallimoliveira@gmail.com`): bypass total.
- **Parceiros** (`professionals.is_partner = true`): regra normal, **exceto Chat Agente liberado sem add-on** (consome créditos PRO pessoais).
- **Acadêmico**: Chat Agente incluso na quota (sem add-on).
- **Clínica**: tratamentos sempre gratuitos; nunca sofre hard-block, só warning + overage na fatura do dono.
- **Biblioteca de Evidências**: livre para todos os planos pagos.

## 6. Premissas de cenário (planejamento financeiro)

- **Custo fixo de marketing:** R$ 1.500/mês (incluir em TODOS os cenários — não era contabilizado antes).
- **Churn assumido:** 8–12% ao mês (pendente A4 — modelagem realista).
- **Mix de conversão:** 50% anual / 50% mensal (pendente A4 — antes assumido 70% anual).
- **Mix de uso (50 usuários):** 60% leve / 35% moderado / 5% intenso → ~740 cr/mês.

## 7. Saldo workspace recomendado

| Usuários | Mínimo | Confortável (1.5× buffer) |
|---|---|---|
| 10 | 200 cr | 300 cr |
| 25 | 500 cr | 700 cr |
| 50 | 1.000 cr | 1.400 cr |
