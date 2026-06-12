---
name: Stripe Coupons (campanhas)
description: Cupons ativos no Stripe e como aplicar no checkout PRO
type: feature
---

- `create-pro-subscription` envia `allow_promotion_codes: true` no checkout (mensal e anual), permitindo cupom digitado pelo usuário.
- Cupom `souibmr`: 50% off `forever`, `redeem_by` 2026-06-19 (7d janela palestra IBMR). Mantém desconto enquanto a assinatura existe; cancelou = perde. Para virar promotion code visível no checkout, criar manualmente no painel Stripe (POST /promotion_codes com coupon=souibmr, code=SOUIBMR).
