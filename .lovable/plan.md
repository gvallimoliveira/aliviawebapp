

# Plano: Atualização de Precificação Pro para R$97/mês e R$67/mês (anual)

## Contexto
Os preços atuais do Plano Profissional são R$49/mês e R$34,90/mês (anual = R$418,80/ano). A nova precificação será R$97/mês e R$67/mês (anual = R$804/ano). Isso exige mudanças coordenadas em **Stripe (novos preços)**, **código front-end**, **edge functions** e **textos de localização**.

---

## Impacto e Arquitetura

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  pricing.ts     │────▶│  Landing Pages       │────▶│  Edge Functions     │
│  (valores +     │     │  (ProfessionalSection │     │  create-pro-sub     │
│   price_ids)    │     │   ProfessionalLanding │     │  check-pro-sub      │
│                 │     │   ProDashboard)       │     │  stripe-webhook     │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
        │                                                     │
        └──── Stripe Products & Prices (novos price_ids) ─────┘
```

---

## Passos de Implementação

### 1. Criar novos preços no Stripe
Usando as ferramentas do Stripe, criar **2 novos Price objects** nos produtos existentes:
- **Produto `prod_U5dB77Y8adgxGf`** (Pro Monthly): novo Price de R$97/mês (9700 centavos BRL, recurring monthly)
- **Produto `prod_UBENhRLOTa0bHS`** (Pro Annual): novo Price de R$804/ano (80400 centavos BRL, recurring yearly)

Os preços antigos serão mantidos no Stripe (para assinantes atuais) mas não referenciados no código.

### 2. Atualizar `src/constants/pricing.ts`
- `PRO_PLAN_PRICE` → `97`
- `PRO_PLAN_PRICE_FORMATTED` → `"R$ 97/mês"`
- `PRO_PLAN_ANNUAL_PRICE` → `67`
- `PRO_PLAN_ANNUAL_PRICE_FORMATTED` → `"R$ 67/mês"`
- `PRO_PLAN_ANNUAL_TOTAL` → `804`
- Atualizar os `price_id` em `PRO_PLAN_STRIPE` e `PRO_PLAN_ANNUAL_STRIPE` com os novos IDs gerados

### 3. Atualizar Edge Function `create-pro-subscription/index.ts`
- Substituir os dois `price_id` hardcoded (mensal e anual) pelos novos IDs
- Atualizar os comentários com os novos valores

### 4. Atualizar Edge Function `check-pro-subscription/index.ts`
- O filtro `prod_U5dB77Y8adgxGf` permanece igual (mesmo produto, preço novo)
- O produto anual `prod_UBENhRLOTa0bHS` também permanece (usa `pro_access_expires_at`)
- **Nenhuma mudança necessária** nesta função

### 5. Atualizar Edge Function `stripe-webhook/index.ts`
- **Nenhuma mudança necessária** — o webhook usa `metadata.type` (`pro_subscription`, `pro_annual`) para fulfillment, não price IDs
- Os novos preços nos mesmos produtos continuarão funcionando

### 6. Atualizar textos de localização (pt.json, en.json, es.json)
- `b2b.billed_annually`: `R$ 418,80/ano` → `R$ 804/ano`
- `b2b.save_30` → `b2b.save_31` ou manter "Economize 31%" (economia real: (97-67)/97 = 30.9%)
- `b2b.roi_conclusion`: `R$ 1,20/dia` → `R$ 2,23/dia` (R$67/30) para o plano anual, ou `R$ 3,23/dia` para mensal

### 7. Atualizar seção ROI na landing profissional
- A conclusão de ROI que diz "Por menos de R$ 1,20/dia" precisa ser recalculada:
  - Mensal: R$97/30 = ~R$3,23/dia
  - Anual: R$67/30 = ~R$2,23/dia
  - Usar o valor anual como referência: "Por menos de R$ 2,30/dia"

### 8. Componentes front-end que já usam as constantes
- `ProfessionalSection.tsx` — usa `PRO_PLAN_PRICE` e `PRO_PLAN_ANNUAL_PRICE` (atualiza automaticamente)
- `ProfessionalLanding.tsx` — idem
- `ProDashboard.tsx` — usa `PRO_PLAN_PRICE_FORMATTED` (atualiza automaticamente)

---

## Detalhes Técnicos Importantes

- **Assinantes existentes** não são afetados — continuam no preço antigo até cancelarem
- **Boleto**: O Pro subscription usa `payment_method_types: ["card"]` (sem boleto), então não há impacto em fluxos de boleto
- **Filtro de produto no check-pro-subscription**: Continua usando o mesmo `product_id`, apenas o `price_id` muda — sem impacto
- **Webhook**: Roteia por `metadata.type`, não por preço — sem impacto
- **Economia anual**: (97-67)/97 ≈ 31% — manter o badge "Economize 30%" ou ajustar para "~31%"

---

## Arquivos Modificados
1. **Stripe** — 2 novos Prices (via ferramenta Stripe)
2. `src/constants/pricing.ts` — valores e price_ids
3. `supabase/functions/create-pro-subscription/index.ts` — price_ids
4. `src/locales/pt.json` — textos de billing e ROI
5. `src/locales/en.json` — idem
6. `src/locales/es.json` — idem

