

## Implementação: Pay-per-use Premium + Ajustes de Precificação

### Resumo

Três mudanças principais:
1. **Premium B2C**: Adicionar opção pay-per-use (R$109) com switch toggle, reduzir mensalidade para R$79,90
2. **Pro Anual B2B**: Mudar de `mode: "subscription"` para `mode: "payment"` no Stripe (cobrança única R$418,80, acesso por 1 ano)
3. **UI**: Switch toggle mensal/avulso na ComparisonSection e na tela de pagamento da Assessment

---

### 1. Criar produtos no Stripe

- **Premium Mensal** — novo preço R$79,90/mês (recurring) — substituir o price_id atual `price_1T853WCBxbFcCp8IFOFnTkfY`
- **Premium Pay-per-use** — R$109 (one-time payment) — novo produto/preço

### 2. Atualizar `src/constants/pricing.ts`

```typescript
// Premium Mensal — R$79,90/mês
export const PREMIUM_PRICE = 79.90;
export const PREMIUM_PRICE_FORMATTED = "R$ 79,90/mês";

// Premium Avulso — R$109 (pagamento único)
export const PREMIUM_SINGLE_PRICE = 109;
export const PREMIUM_SINGLE_PRICE_FORMATTED = "R$ 109,00";
export const PREMIUM_SINGLE_STRIPE = { price_id: "price_NEW_ID", product_id: "prod_NEW_ID" };
```

### 3. Atualizar `ComparisonSection.tsx`

- Adicionar switch toggle (Mensal / Avulso) acima do card Premium
- Card Premium mostra preço dinâmico conforme toggle
- Quando "Mensal": R$79,90/mês + lista de vantagens (diário de dor, comparação de métricas, histórico)
- Quando "Avulso": R$109 + descrição "Avaliação pontual completa"
- Destacar visualmente que mensal é melhor custo-benefício

### 4. Atualizar `src/pages/Assessment.tsx` — tela de pagamento

- Adicionar o mesmo switch toggle na tela `payment_check`
- Passar o tipo selecionado (monthly/single) para a edge function `create-payment`
- Mostrar vantagens do mensal vs avulso conforme seleção

### 5. Atualizar `supabase/functions/create-payment/index.ts`

- Aceitar parâmetro `payment_type: "monthly" | "single"` no body
- Se "monthly": usar o novo price_id mensal com `mode: "subscription"`
- Se "single": usar o price_id avulso com `mode: "payment"`
- Manter lógica de referral/discount existente

### 6. Atualizar `supabase/functions/create-pro-subscription/index.ts`

- Quando `plan === "annual"`: mudar `mode` de `"subscription"` para `"payment"` (cobrança única R$418,80)
- Manter `mode: "subscription"` apenas para o plano mensal

### 7. Atualizar traduções em `LanguageContext.tsx`

- `compare.premium.price` → valor dinâmico (removido hardcode)
- Novas keys: `compare.premium.monthly_benefits`, `compare.premium.single_desc`, toggle labels

### 8. Atualizar referências de preço

- `DiagnosisResult.tsx`, `ProfessionalSearch.tsx` — atualizar `PREMIUM_PRICE_FORMATTED` (automático via constante)
- `StickyCTA.tsx` — sem mudanças necessárias

---

### Detalhes técnicos

**Switch toggle**: Reutilizar o componente `Switch` de `@/components/ui/switch` com labels "Mensal" e "Avulso", seguindo o mesmo padrão visual usado na ProfessionalLanding para monthly/annual.

**Pro Anual como payment único**: O `mode: "payment"` no Stripe cobra R$418,80 de uma vez. O controle de expiração (1 ano) será feito via `subscription_status` + lógica de data no `check-pro-subscription`. Será necessário salvar a data de início na tabela `professionals` para calcular expiração.

**Migração DB**: Adicionar coluna `pro_access_expires_at` (timestamptz) na tabela `professionals` para controlar expiração do plano anual pago como produto único.

