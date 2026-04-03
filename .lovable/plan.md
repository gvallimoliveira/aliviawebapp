

# Auditoria do Sistema de Indicação ("Indique e Ganhe 20%")

## Fluxo Completo Analisado

1. **Captura do código** — Gateway/PatientLanding/LandingLegacy capturam `?ref=CODE` da URL e salvam em `localStorage("alivia_referral_code")`
2. **Envio no checkout** — Assessment.tsx envia `referral_code` no body do `create-payment`
3. **Processamento** — `create-payment` valida o código, cria reward + coupon Stripe, aplica a assinante ativo, envia push
4. **Desconto do indicador** — Na próxima compra do indicador, `create-payment` busca reward com status `"rewarded"` e aplica como discount no checkout
5. **Safety net** — `push-cron` reaplica cupons pendentes a assinantes ativos
6. **UI** — ReferralCard exibe código, contagem de amigos, badge de desconto disponível

## Problemas Encontrados

### BUG 1 — Referral reward criada ANTES do pagamento ser confirmado (CRÍTICO)

O `create-payment` cria o `referral_reward` e o coupon Stripe no momento da **criação do checkout session**, não após o pagamento. Se o indicado abandona o checkout ou o pagamento falha, o indicador já recebeu o reward (status `"rewarded"`) e o coupon Stripe já foi criado e possivelmente aplicado à subscription.

**Impacto:** O indicador ganha desconto mesmo que o amigo nunca pague. Perda de receita.

**Correção:** Mover a lógica de referral para o `stripe-webhook` (evento `checkout.session.completed` com `payment_status === "paid"`). No `create-payment`, apenas salvar o `referral_code` no metadata da session para processamento posterior.

### BUG 2 — Coupon não aplicado ao indicado no checkout

O fluxo atual aplica o coupon ao **indicador** (quem compartilhou o link). Porém, o **indicado** (quem usou o link) não recebe nenhum desconto na sua primeira compra. Isso reduz o incentivo para usar o link. Se a intenção é que o indicado também ganhe desconto, isso está faltando.

**Avaliação:** Isso pode ser intencional (só o indicador ganha). Preciso confirmar com o usuário.

### BUG 3 — `referralCodeRecord` é declarado mas nunca usado

Na linha 60-70 do `create-payment`, `referralCodeRecord` é atribuído mas nunca referenciado novamente. Código morto, sem impacto funcional.

### BUG 4 — Risco de conflito entre exit intent discount e referral discount

Se o indicado tem `exit_intent_discount: true` e também envia `referral_code`, o exit intent discount tem prioridade (linhas 193-205). O referral reward do indicador é criado e o coupon Stripe é gerado, mas o desconto do indicador NÃO é aplicado ao checkout do indicado (que recebe o exit intent). Isso é correto para o indicado, mas o indicador recebe o reward independentemente.

### BUG 5 — `count` do ReferralCard pode ser impreciso

O ReferralCard conta `referral_rewards` com `referrer_user_id = user.id`, incluindo rewards com status `"pending"`, `"rewarded"` e `"used"`. Porém, conforme Bug 1, rewards podem existir sem pagamento confirmado. A contagem de "amigos indicados" pode estar inflada.

## Plano de Correção

### 1. Mover processamento de referral para o webhook (correção do Bug 1)

**`create-payment/index.ts`**: Em vez de processar o referral imediatamente, apenas incluir `referral_code` no metadata do checkout session. Remover toda a lógica de criação de reward/coupon/push do `create-payment`.

**`stripe-webhook/index.ts`**: Adicionar lógica no `fulfillOrder` para processar o referral code quando `session.metadata.referral_code` existir e `payment_status === "paid"`. Criar o reward, coupon, aplicar a subscription e enviar push apenas nesse momento.

### 2. Limpar código morto

Remover `referralCodeRecord` não utilizado do `create-payment`.

### 3. Ajustar contagem no ReferralCard

Filtrar `referral_rewards` por `status` in `("rewarded", "used")` para não contar rewards pendentes ou de pagamentos abandonados.

### 4. Manter lógica de desconto do indicador no `create-payment`

A parte que busca `available_discount` (linhas 122-139) para aplicar ao indicador na sua próxima compra permanece no `create-payment`, pois é executada no momento correto (quando o indicador está fazendo checkout).

## Arquivos a alterar

1. `supabase/functions/create-payment/index.ts` — simplificar: apenas passar `referral_code` no metadata
2. `supabase/functions/stripe-webhook/index.ts` — adicionar processamento de referral no fulfillment
3. `src/components/dashboard/ReferralCard.tsx` — filtrar contagem por status

