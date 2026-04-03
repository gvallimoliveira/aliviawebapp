

# Auditoria completa dos fluxos de pagamento e plano de correção

## Problemas Críticos Encontrados

### BUG 1 — Pro Subscription (Mensal/Anual): webhook não processa `pro_subscription`

**Gravidade: ALTA — pagamento confirmado mas acesso não liberado**

O `create-pro-subscription` define `type: "pro_subscription"` no metadata para o plano mensal. Porém, o `stripe-webhook` no `fulfillOrder()` não tem um `case "pro_subscription"` — cai no `default` e faz **nada**. O acesso só funciona porque o `check-pro-subscription` consulta o Stripe diretamente a cada verificação. Porém, se houver atraso na sincronização, o profissional pode ver `subscription_status: "inactive"` temporariamente. Não é bloqueante imediato, mas é uma inconsistência que pode causar problemas.

**Correção:** Adicionar `case "pro_subscription"` no `fulfillOrder` do webhook para atualizar `subscription_status` e `approved` na tabela `professionals`.

### BUG 2 — Pro Annual via Subscription: `verify-payment` trata como one-time payment

**Gravidade: ALTA**

O `create-pro-subscription` com `plan: "annual"` cria uma **subscription** (mode: subscription). Porém, o `verify-payment` (linha 92-108) trata `pro_annual` como se fosse um pagamento avulso — define `pro_access_expires_at` manualmente. Se o plano anual é uma assinatura recorrente, deveria ser tratado igual ao mensal (via `check-pro-subscription`). A data de expiração deveria vir do Stripe (`current_period_end`), não de um cálculo manual `+1 ano`.

O `success_url` do `create-pro-subscription` é `/dashboard?subscription=success` — **não passa pela `/payment-success`** — então o `verify-payment` só seria chamado se alguém manualmente acessasse a URL. Isso significa que para assinaturas Pro (mensal e anual), o fulfillment depende **exclusivamente do webhook**. E o webhook não trata `pro_subscription` (Bug 1).

**Correção:** Adicionar `case "pro_subscription"` e ajustar `case "pro_annual"` no webhook para atualizar `professionals.subscription_status = "active"` e `approved = true`. Para o anual, calcular `pro_access_expires_at` a partir do `current_period_end` do Stripe (não um +1 ano manual).

### BUG 3 — Pro Lifetime Treatment: `verify-payment` atualiza via `professional_id` mas o metadata pode não tê-lo

**Gravidade: MÉDIA**

O `create-pro-lifetime-treatment` inclui `professional_id` no metadata — OK. Mas o `verify-payment` (linha 78-88) usa `professional_id` do metadata para atualizar a tabela. Se por algum motivo o metadata não chegar, o update silenciosamente não faz nada (sem erro, sem feedback).

**Correção:** Adicionar fallback: se `professional_id` não estiver no metadata, buscar pelo `user_id`.

### BUG 4 — PaymentSuccess não trata `pro_annual` nem `pro_subscription` vindos do checkout do Pro

**Gravidade: BAIXA (não bloqueante)**

O `create-pro-subscription` redireciona para `/dashboard?subscription=success`, não para `/payment-success`. Portanto, o `PaymentSuccess.tsx` nunca é acionado para esse fluxo. Isso é correto para subscriptions, já que o `check-pro-subscription` atualiza o estado. Sem ação necessária.

### BUG 5 — `create-pro-treatment-payment` usa Price ID inconsistente com `pricing.ts`

**Gravidade: MÉDIA**

O `create-pro-treatment-payment` usa `price_1TBkbx2HgVhVBE8UKUTkPf6e` mas o `pricing.ts` define `price_1T854NCBxbFcCp8IpPdh93Qd`. Se as duas contas Stripe são diferentes (test vs live), isso pode causar falha no checkout. Precisa verificar qual é o correto.

**Correção:** Alinhar o Price ID no edge function com o definido no `pricing.ts`, ou confirmar que os dois são válidos no ambiente live.

### BUG 6 — `create-payment` (Premium B2C) usa Price IDs diferentes do `pricing.ts`

**Gravidade: MÉDIA**

- `create-payment` linha 143: `price_1TBkbt2HgVhVBE8Uu2a9zsjb` (single R$109)
- `pricing.ts`: `price_1TB6kPCBxbFcCp8IUAo03Qeu`
- `create-payment` linha 144: `price_1TBkbt2HgVhVBE8UWGL7zPGZ` (monthly R$79,90)
- `pricing.ts`: `price_1TB6k8CBxbFcCp8I4piuJ3Dm`

Mesma inconsistência. Pode significar migração de conta Stripe. Se os IDs antigos no `pricing.ts` não são mais válidos, o `pricing.ts` deveria ser atualizado. Os IDs no edge function são os que realmente importam.

### BUG 7 — `create-pro-subscription` usa Price IDs diferentes do `pricing.ts`

- Edge function: `price_1TBkc72HgVhVBE8UmxiIVoJV` (annual) e `price_1TBkbt2HgVhVBE8U4UvTqFpY` (monthly)
- `pricing.ts`: `price_1TCruvCBxbFcCp8IAjlnnNTO` (annual) e `price_1T7Rv6CBxbFcCp8I1Tsv0WwS` (monthly)

Mesma inconsistência de IDs.

## Plano de Correção

### 1. Corrigir `stripe-webhook/index.ts` — fulfillOrder

Adicionar dois novos cases:

- `case "pro_subscription"`: atualizar `professionals` com `subscription_status: "active"`, `approved: true`.
- Ajustar `case "pro_annual"`: além do que já faz, buscar `current_period_end` da subscription do Stripe para definir `pro_access_expires_at` com precisão (em vez de +1 ano manual). Atualizar `subscription_status: "active"` e `approved: true`.

### 2. Corrigir `verify-payment/index.ts` — fallback pro_lifetime

Para `pro_lifetime_treatment` (linha 78-88): adicionar fallback usando `session.metadata.user_id` caso `professional_id` não esteja disponível.

### 3. Alinhar Price IDs

Atualizar `src/constants/pricing.ts` para refletir os Price IDs reais usados nos edge functions (os IDs nos edge functions são os que efetivamente funcionam no Stripe). Isso evita confusão futura e garante que qualquer componente que referencie `pricing.ts` use os valores corretos.

### 4. Revisar todos os edge functions ao final

Confirmar que cada fluxo tem cobertura tanto no `verify-payment` (para pagamentos avulsos que passam por `/payment-success`) quanto no `stripe-webhook` (para todos os pagamentos, incluindo async como boleto).

## Arquivos a alterar

1. `supabase/functions/stripe-webhook/index.ts` — adicionar cases `pro_subscription` e ajustar `pro_annual`
2. `supabase/functions/verify-payment/index.ts` — fallback para `pro_lifetime_treatment`
3. `src/constants/pricing.ts` — alinhar Price IDs com os edge functions

