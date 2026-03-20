

## Auditoria Completa do Fluxo de Pagamento — Aliv.iA

### ✅ Bugs Corrigidos

#### 1. Product ID desatualizado no verify-payment (corrigido anteriormente)
- `verify-payment` buscava `prod_U6HcKYW069jBRN` (produto antigo) → atualizado para `prod_U9PZeaM93PlMwb`

#### 2. Plano Profissional Anual: modo incompatível com tipo de preço (CRÍTICO)
- **Problema**: `create-pro-subscription` usava `mode: "payment"` com um preço `recurring` (interval: year). Stripe rejeita essa combinação → **nenhum profissional conseguia comprar o plano anual**.
- **Correção**: Criado novo preço one-time `price_1TCruvCBxbFcCp8IAjlnnNTO` (R$418,80) para substituir o preço recorrente. Código atualizado.

#### 3. Plano Anual: sem verificação de pagamento (CRÍTICO)
- **Problema**: Após pagar o plano anual, o profissional era redirecionado para `/dashboard?subscription=success` sem nenhuma verificação. O campo `pro_access_expires_at` nunca era preenchido → **profissional pagava mas não recebia acesso**.
- **Correção**: Redirecionamento para `/payment-success?session_id=...&type=pro_annual`. Handler adicionado em `verify-payment` para setar `pro_access_expires_at` com +1 ano e `approved: true`.

#### 4. Criação dinâmica de preços no Tratamento Vitalício
- **Problema**: Para usuários fora dos primeiros 30 dias, `create-pro-lifetime-treatment` criava um novo preço Stripe a cada tentativa → poluição de preços no Stripe.
- **Correção**: Criado preço fixo `price_1TCrvQCBxbFcCp8IlbHkAA9G` (R$249,90). Código atualizado para usar preço fixo.

#### 5. check-pro-subscription: falso positivo com assinaturas B2C
- **Problema**: Buscava qualquer assinatura ativa (limit 1) sem filtrar por produto. Se o profissional também tivesse assinatura Premium B2C, poderia ser detectado como tendo plano Pro.
- **Correção**: Filtro adicionado por `prod_U5dB77Y8adgxGf` (Plano Profissional).

### ⚠️ Itens para Atenção

#### 6. Business Name no Stripe
- A API ainda retorna **"Área restrita de New business"**. Se você já alterou, pode levar algum tempo para propagar. Verifique em: [Settings → Business Details](https://dashboard.stripe.com/settings/business-details)

#### 7. Produtos obsoletos do Aliv.iA no Stripe
Os seguintes produtos são antigos do Aliv.iA e devem ser **arquivados** no Stripe para evitar confusão:
- `prod_U6HcKYW069jBRN` — "Assinatura Premium Aliv.iA" (substituído por `prod_U9PZeaM93PlMwb`)
- `prod_U60kJ6Tj0qKcNA` — "Pro Treatment Unlock" (substituído por `prod_U6Hd8n833TWnrV`)

#### 8. Customer Portal Stripe
- O Customer Portal precisa estar configurado no painel Stripe para funcionar: [Ativar portal](https://dashboard.stripe.com/settings/billing/portal)
- Sem essa configuração, o botão "Gerenciar assinatura" vai dar erro.

### Mapa Final de Produtos Ativos

| Produto | Product ID | Price ID | Valor | Tipo | Usado em |
|---|---|---|---|---|---|
| Premium Mensal (B2C) | `prod_U9PZeaM93PlMwb` | `price_1TB6k8CBxbFcCp8I4piuJ3Dm` | R$79,90/mês | subscription | `create-payment` |
| Premium Avulso (B2C) | `prod_U9PZ5EOMytUZXX` | `price_1TB6kPCBxbFcCp8IUAo03Qeu` | R$109,00 | payment | `create-payment` |
| Pro Mensal (B2B) | `prod_U5dB77Y8adgxGf` | `price_1T7Rv6CBxbFcCp8I1Tsv0WwS` | R$49,00/mês | subscription | `create-pro-subscription` |
| Pro Anual (B2B) | `prod_UBENhRLOTa0bHS` | `price_1TCruvCBxbFcCp8IAjlnnNTO` | R$418,80 | payment | `create-pro-subscription` |
| Tratamento Avulso | `prod_U6Hd8n833TWnrV` | `price_1T854NCBxbFcCp8IpPdh93Qd` | R$29,90 | payment | `create-pro-treatment-payment` |
| Tratamento Vitalício (promo) | `prod_U6HdfkecpWCTyD` | `price_1T8546CBxbFcCp8IwpQN1AZD` | R$149,90 | payment | `create-pro-lifetime-treatment` |
| Tratamento Vitalício (regular) | `prod_UBEOREW3toWxBh` | `price_1TCrvQCBxbFcCp8IlbHkAA9G` | R$249,90 | payment | `create-pro-lifetime-treatment` |
