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
| `pro_monthly` | 100 cr | Reduzido de 150; uso moderado real ≈ 33 cr |
| `pro_annual` | 120 cr | +20% pela fidelidade |
| `academic_monthly` | 40 cr | Quizzes fixos cortaram demanda |
| `academic_annual` | 50 cr | |
| `clinic_small` (≤3 ther.) | 200 cr/terapeuta | **Generoso por estratégia — sem hard block, só warning + overage** |
| `clinic_medium` (≤8) | 250 cr/terapeuta | idem |
| `clinic_large` (9+) | 300 cr/terapeuta | idem |
| `premium_b2c` | 15 cr | Uso de paciente |
| `unlimited` (VIP/admin/partner Chat) | — | Sem trava |

## 3. Add-ons recorrentes (Fase 5/7)

| Add-on | Preço | Inclui | Observação |
|---|---|---|---|
| Chat Agente Clínico | R$ 19,90/mês | Ilimitado dentro do bom-senso | Proposto híbrido (R$14,90 + R$0,10/msg >100) — pendente decisão A5 |
| Transcrição +5 | R$ 14,90 | 5 transcrições, val. 12 meses | Base inclui 5/mês no PRO |
| Transcrição +15 | R$ 34,90 | 15 transcrições | |
| Transcrição +50 | R$ 89,90 | 50 transcrições | |

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
