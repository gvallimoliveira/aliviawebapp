

## Diagnóstico: Configuração Stripe + Bug de verificação de pagamento

### Problema 1 — Stripe Checkout sem branding configurado

A conta Stripe está com o nome padrão **"Área restrita de New business"**. A página de checkout do Stripe precisa de configuração manual no painel Stripe:

1. **Business name**: Ir em [Stripe Dashboard → Settings → Business Details](https://dashboard.stripe.com/settings/business-details) e alterar o nome para "Aliv.iA"
2. **Branding (logo, cores)**: Ir em [Stripe Dashboard → Settings → Branding → Checkout](https://dashboard.stripe.com/settings/branding/checkout) e configurar:
   - Upload do ícone/logo do Aliv.iA
   - Cor do botão (cor primária do app)
   - Cor de fundo
3. **Políticas e contato**: Ir em [Stripe Dashboard → Settings → Checkout](https://dashboard.stripe.com/settings/checkout) para adicionar informações de suporte e políticas de reembolso

Isso é configuração do painel Stripe — não pode ser feito via código.

### Problema 2 — Bug crítico: Product ID desatualizado no verify-payment

O `verify-payment` (linha 196) verifica assinaturas Premium buscando o product ID **`prod_U6HcKYW069jBRN`** (produto antigo "Assinatura Premium Aliv.iA"). Porém, o `create-payment` cria sessões com preços do produto **`prod_U9PZeaM93PlMwb`** (novo "Avaliação Premium - Mensal").

**Resultado**: Após pagar a assinatura mensal Premium, o `verify-payment` não encontra a subscription ativa porque procura pelo produto errado → usuário aparece como "sem acesso".

**Correção**: Atualizar `verify-payment/index.ts` linha 196 para usar `prod_U9PZeaM93PlMwb`.

### Problema 3 — Produtos duplicados/obsoletos no Stripe

Existem 14 produtos no Stripe, incluindo vários antigos/obsoletos (MoveWell, Insights PRO, etc.). Recomendo arquivar os produtos não utilizados no painel Stripe para evitar confusão. Produtos ativos necessários:

| Produto | ID | Usado em |
|---|---|---|
| Avaliação Premium - Mensal | `prod_U9PZeaM93PlMwb` | `create-payment` (subscription) |
| Avaliação Premium - Avulso | `prod_U9PZ5EOMytUZXX` | `create-payment` (payment) |
| Plano Profissional Aliv.iA | `prod_U5dB77Y8adgxGf` | `create-pro-subscription` (monthly) |
| Plano Profissional Anual | `prod_U6HddACIn9ZUvy` | `create-pro-subscription` (annual) |
| Tratamento Avulso | `prod_U6Hd8n833TWnrV` | `create-pro-treatment-payment` |
| Tratamento Vitalício | `prod_U6HdfkecpWCTyD` | `create-pro-lifetime-treatment` |

### Resumo de alterações no código

- **`supabase/functions/verify-payment/index.ts`** — Corrigir product ID de `prod_U6HcKYW069jBRN` para `prod_U9PZeaM93PlMwb` na verificação de assinatura Premium (linha 196)

### Ações manuais no Stripe Dashboard (você precisa fazer)
1. Configurar Business Name → "Aliv.iA"
2. Configurar Branding (logo, cores) em Settings → Branding
3. Arquivar produtos obsoletos (MoveWell, Insights, etc.)

