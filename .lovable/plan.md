## Plano: Reestruturação de Preços e Integração Stripe

### Resumo das mudanças de preço


| Plano                  | Antes                 | Depois                                                  |
| ---------------------- | --------------------- | ------------------------------------------------------- |
| Premium (B2C)          | R$129 pagamento único | R$99,90/mês (assinatura, 2 avaliações/mês)              |
| Pro Mensal (B2B)       | R$49/mês              | Mantém R$49/mês                                         |
| Pro Anual (B2B)        | Não existia           | R$34,90/mês (cobrado anualmente = R$418,80/ano)         |
| Pro Treatment          | R$9,90 por avaliação  | Plano de tratamento avulso mudar de R$9,90 para 29,90   |
| Pro Lifetime Treatment | Não existia           | R$149,90 pagamento único (De R$249,90, urgência 1º mês) |


---

### 1. Criar novos produtos/preços no Stripe

- **Premium Subscription**: Novo price recurring mensal R$99,90 (9990 centavos BRL) no produto `prod_U1S9PIjw4l6VRd`
- **Pro Annual**: Novo price recurring anual R$418,80 (41880 centavos) no produto `prod_U5dB77Y8adgxGf`
- **Pro Lifetime Treatment**: Novo produto + price one-time R$149,90 (14990 centavos) — plano de tratamento vitalício

---

### 2. Atualizar `src/constants/pricing.ts`

```typescript
// Premium agora é assinatura mensal
export const PREMIUM_PRICE = 99.90;
export const PREMIUM_PRICE_FORMATTED = "R$ 99,90/mês";

// Pro plans
export const PRO_PLAN_PRICE = 49;
export const PRO_PLAN_PRICE_FORMATTED = "R$ 49/mês";
export const PRO_PLAN_ANNUAL_PRICE = 34.90;
export const PRO_PLAN_ANNUAL_PRICE_FORMATTED = "R$ 34,90/mês";

// Pro Lifetime Treatment
export const PRO_LIFETIME_TREATMENT_PRICE = 149.90;
export const PRO_LIFETIME_TREATMENT_ORIGINAL_PRICE = 249.90;

// Stripe IDs (will be filled after creation)
export const PREMIUM_STRIPE = { product_id: "...", price_id: "..." };
export const PRO_PLAN_STRIPE = { product_id: "...", price_id: "..." };
export const PRO_PLAN_ANNUAL_STRIPE = { product_id: "...", price_id: "..." };
export const PRO_LIFETIME_TREATMENT_STRIPE = { product_id: "...", price_id: "..." };
```

---

### 3. Edge Functions — Mudanças

`**create-payment**` → Converter de `mode: "payment"` para `mode: "subscription"` com o novo price_id mensal do Premium.

`**create-pro-subscription**` → Aceitar parâmetro `plan: "monthly" | "annual"` e usar o price_id correspondente.

`**check-pro-subscription**` → Já funciona para assinaturas ativas, sem mudanças estruturais.

**Nova function `create-pro-lifetime-treatment**` → Pagamento único (mode: payment) para o tratamento vitalício. Salva flag `lifetime_treatment: true` no profissional após verificação.

`**create-pro-treatment-payment**` → Adicionar check: se profissional tem `lifetime_treatment = true`, pular pagamento e gerar tratamento direto.

`**verify-payment**` → Adicionar handler para tipo `pro_lifetime_treatment`.

---

### 4. Database — Migration

Adicionar coluna `lifetime_treatment` (boolean, default false) na tabela `professionals` para marcar quem comprou o vitalício.

---

### 5. Frontend — UI

`**Assessment.tsx**` — Tela de pagamento premium: mudar texto de pagamento único para assinatura mensal, atualizar CTA.

`**ProfessionalLanding.tsx**` — Adicionar toggle mensal/anual na seção de pricing, mostrar ambos os preços. Adicionar card de "Tratamento Vitalício" com urgência visual (De R$249,90 por R$149,90, badge "oferta 1º mês").

`**ProfessionalSection.tsx**` — Atualizar preço exibido de R$49 para "A partir de R$34,90/mês".

`**ComparisonSection.tsx**` — Atualizar preço premium para R$99,90/mês.

`**ProDashboard.tsx**` — Se profissional tem `lifetime_treatment`, não mostrar botão de desbloqueio por R$9,90; gerar tratamento direto.

`**AssessmentView.tsx**` — Checar `lifetime_treatment` antes de cobrar R$9,90.

**Traduções** — Atualizar LanguageContext com novos textos de preço, urgência, plano anual.

---

### 6. Lógica de urgência (1º mês)

Na UI da landing profissional e no ProDashboard, calcular se o profissional se cadastrou há menos de 30 dias (`professionals.created_at`). Se sim, mostrar preço promocional R$149,90. Caso contrário, mostrar R$249,90.

---

### Arquivos a modificar

1. `src/constants/pricing.ts` — Novos preços e IDs Stripe
2. `supabase/functions/create-payment/index.ts` — Premium → subscription
3. `supabase/functions/create-pro-subscription/index.ts` — Aceitar monthly/annual
4. `supabase/functions/create-pro-treatment-payment/index.ts` — Check lifetime
5. Nova: `supabase/functions/create-pro-lifetime-treatment/index.ts`
6. `src/pages/Assessment.tsx` — UI de assinatura premium
7. `src/pages/ProfessionalLanding.tsx` — Pricing com toggle + vitalício
8. `src/components/ProfessionalSection.tsx` — Preço atualizado
9. `src/components/ComparisonSection.tsx` — Preço atualizado
10. `src/components/dashboard/ProDashboard.tsx` — Lógica lifetime
11. `src/pages/AssessmentView.tsx` — Lógica lifetime
12. `src/contexts/LanguageContext.tsx` — Traduções
13. Migration SQL — coluna `lifetime_treatment`
14. `supabase/config.toml` — Nova function