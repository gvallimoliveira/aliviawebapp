## Timer de urgência + Desconto 10% no Exit Intent do diagnóstico básico

### 1. Timer de urgência no CTA avulso (DiagnosisResult)

**Arquivo: `src/components/assessment/DiagnosisResult.tsx**`

- Adicionar hook `useCountdown` inline: inicia em 5 minutos (300s) ao montar o componente, decrementa a cada segundo
- Exibir abaixo do preço: `⏳ Oferta válida por 4:59` com texto vermelho/amber pulsante
- Quando chegar a 0, mostrar "Oferta expirada" (mas ainda permite clicar — é urgência psicológica, não bloqueio real)

### 2. Desconto 10% exclusivo no Exit Intent do diagnóstico

**Abordagem**: Cupom Stripe único gerado on-the-fly. Mais limpo que produto separado — mantém o mesmo price_id da avulsa (R$109) mas aplica 10% off (fica ~R$98,10).

**Arquivo: `supabase/functions/create-payment/index.ts**`

- Aceitar novo campo `exit_intent_discount: true` no body
- Quando presente e `payment_type === "single"`: criar cupom Stripe `percent_off: 10, duration: "once", max_redemptions: 1` com nome `Exit Intent 10% - {timestamp}`
- Aplicar o cupom na session via `discounts: [{ coupon }]`
- Não acumula com referral discount (prioriza o maior)

**Arquivo: `src/components/ExitIntentPopup.tsx**`

- Quando `variant === "diagnosis"`: mudar copy para mostrar desconto de 10%
  - Título: "Espere! Desconto exclusivo de 10% 🔥"
  - Descrição: "Desbloqueie seu resultado completo por R$98,10 (de R$109,00). Oferta única!"
- Botão CTA chama `supabase.functions.invoke("create-payment", { body: { payment_type: "single", exit_intent_discount: true } })` e redireciona ao checkout Stripe
- Salvar flag `sessionStorage.setItem("exit-intent-discount-used", "true")` para não repetir
- Adicionar estado de loading no botão

**Arquivo: `src/components/assessment/DiagnosisResult.tsx**`

- Importar e renderizar `<ExitIntentPopup variant="diagnosis" />` diretamente dentro do bloco `mode === "basic"` (além do que já está no Assessment.tsx, para garantir cobertura)

### Arquivos alterados


| Arquivo                                         | Ação                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/components/assessment/DiagnosisResult.tsx` | Timer countdown de 5min no CTA avulso                                        |
| `src/components/ExitIntentPopup.tsx`            | Copy com desconto 10%, botão chama create-payment com `exit_intent_discount` |
| `supabase/functions/create-payment/index.ts`    | Gerar cupom Stripe 10% único quando `exit_intent_discount: true`             |
