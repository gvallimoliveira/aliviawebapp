

## Corrigir botão de assinatura mensal para usuário premium avulso

### Problema
Na linha 417 do `Dashboard.tsx`, o botão "Assinar mensal" do banner de upgrade para usuários avulsos faz `navigate("/assessment/premium")`, que abre uma nova avaliação premium em vez de redirecionar ao checkout da assinatura mensal.

### Solução
Substituir o `navigate("/assessment/premium")` por uma chamada à edge function `create-payment` com `payment_type: "monthly"`, que cria uma sessão de checkout Stripe para a assinatura mensal (R$79,90/mês) e redireciona o usuário.

### Alterações

**`src/pages/Dashboard.tsx`**
- Adicionar estado `upgradeLoading` para controlar o loading do botão
- Criar função `handleUpgradeToMonthly` que invoca `supabase.functions.invoke("create-payment", { body: { payment_type: "monthly" } })` e redireciona via `window.location.href`
- Substituir o `onClick` do botão de upgrade pelo handler correto
- Adicionar indicador de loading no botão durante o processamento

