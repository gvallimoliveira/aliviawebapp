

# Desconto de 10% para indicados + regras de não-cumulatividade

## Resposta à dúvida

Os 20% do indicador atualmente valem para **ambos**: se o indicador tem assinatura mensal ativa, o desconto é aplicado automaticamente na próxima cobrança via Stripe; se compra avulso, é aplicado no checkout. Cada indicação gera 1 cupom, e apenas 1 cupom é consumido por compra (já funciona assim — não acumula 2 descontos em 1 compra). **Isso já está correto no código.**

## O que será implementado

### 1. Desconto de 10% para o indicado (premium avulso apenas)

**`create-payment/index.ts`**: Quando o indicado envia `referral_code` e o `paymentType === "single"`, criar um cupom Stripe de 10% e aplicar ao checkout session. Se `paymentType === "monthly"`, o referral_code é passado no metadata para recompensar o indicador, mas o indicado NÃO recebe desconto.

Prioridade: exit_intent (10%) > referral indicado (10%) > referral indicador (20%). Não acumula.

### 2. Informar regras no ReferralCard

**`src/components/dashboard/ReferralCard.tsx`**: Adicionar texto pequeno abaixo dos botões explicando as regras:
- "Você ganha 20% de desconto (1 uso por compra). Seu amigo ganha 10% na primeira avaliação avulsa."
- "Descontos não são cumulativos."

### 3. Informar regras na página de Suporte

**`src/pages/Support.tsx`**: Adicionar um item FAQ sobre o programa de indicação com as regras completas.

### 4. Traduções

Novas chaves em `pt.json`, `en.json`, `es.json`:
- `referral.rules`: "Você ganha 20% na próxima compra (avulsa ou mensalidade). Seu amigo ganha 10% na primeira avaliação avulsa. Descontos não cumulativos: 1 desconto por compra."
- FAQ de suporte sobre indicação

## Arquivos a alterar

1. `supabase/functions/create-payment/index.ts` — aplicar 10% ao indicado (single only)
2. `src/components/dashboard/ReferralCard.tsx` — texto de regras
3. `src/pages/Support.tsx` — FAQ de indicação
4. `src/locales/pt.json`, `en.json`, `es.json` — novas chaves

