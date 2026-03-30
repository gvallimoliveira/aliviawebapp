

## Análise e Correção do Sistema "Indique e Ganhe"

### Como funciona hoje

1. Usuário A compartilha link com `?ref=ALIVIA-XXXXXX`
2. Usuário B acessa o link → código salvo no `localStorage`
3. Usuário B faz pagamento via `create-payment` → o sistema cria um `referral_reward` para o Usuário A com um cupom Stripe de 20%
4. Na próxima vez que o Usuário A faz checkout via `create-payment`, o cupom é aplicado na sessão de checkout

### Problema crítico identificado: Mensalistas

**Para assinantes mensais, o desconto NUNCA é aplicado automaticamente.** A assinatura renova via Stripe automaticamente — o usuário não passa novamente pelo `create-payment`. O cupom fica armazenado na tabela `referral_rewards` mas nunca é consumido na renovação.

**Para avulsos**, o fluxo funciona: na próxima compra, o `create-payment` detecta o cupom e aplica.

### Problemas adicionais

- Nenhuma notificação push é enviada quando o desconto é validado
- O aviso de desconto no dashboard é sutil (apenas um badge pequeno no ReferralCard)

### Solução proposta

#### 1. Aplicar cupom na assinatura ativa do mensalista (create-payment)

Quando o `create-payment` detecta um cupom disponível E o usuário já tem uma assinatura ativa, em vez de guardar para o próximo checkout, aplicar o cupom diretamente na assinatura Stripe existente via `stripe.subscriptions.update(subscriptionId, { coupon: couponId })`. Isso garante que a próxima fatura da assinatura receba o desconto de 20%.

Fluxo corrigido no `create-payment`:
- Se o indicado compra → cupom criado para o indicador (já funciona)
- Verificar se o indicador tem assinatura ativa
- Se sim: aplicar cupom diretamente na subscription via API Stripe + marcar reward como "used"
- Se não: manter comportamento atual (cupom aplicado no próximo checkout)

#### 2. Notificação push ao ganhar desconto

Na edge function `create-payment`, após criar o reward, enviar push notification para o indicador via `send-push-notification` informando que ele ganhou 20% de desconto.

#### 3. Alerta destacado no Dashboard

Adicionar um banner/alert proeminente no topo do Dashboard (não apenas no ReferralCard) quando `available_discount` existe, com texto claro explicando que o desconto será aplicado automaticamente.

#### 4. Atualizar push-cron (opcional)

Adicionar verificação no cron: se um reward está com status "rewarded" há mais de 1 hora e o usuário tem assinatura ativa, aplicar o cupom (safety net caso o apply falhe no momento da compra).

### Alterações técnicas

| Ação | Arquivo |
|------|---------|
| Editar | `supabase/functions/create-payment/index.ts` — após criar reward, verificar se indicador tem subscription ativa e aplicar cupom direto |
| Editar | `supabase/functions/create-payment/index.ts` — enviar push notification ao indicador |
| Editar | `src/pages/Dashboard.tsx` — adicionar banner proeminente de desconto disponível |
| Editar | `src/locales/pt.json`, `en.json`, `es.json` — traduções do banner |

### Fluxo corrigido

```text
Indicado compra → reward criado para indicador
                     │
                     ├─ Indicador tem assinatura ativa?
                     │   SIM → aplica cupom na subscription Stripe
                     │         marca reward como "used"
                     │   NÃO → cupom fica disponível para próximo checkout
                     │
                     └─ Envia push notification ao indicador
                        "Você ganhou 20% de desconto!"
```

### Observação sobre segurança

O cupom Stripe com `duration: "once"` garante que o desconto é aplicado apenas uma vez, mesmo se aplicado via API. Não há risco de desconto duplicado.

