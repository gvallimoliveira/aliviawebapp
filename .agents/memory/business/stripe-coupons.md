---
name: Stripe Coupons (campanhas)
description: Cupons ativos no Stripe e como aplicar no checkout PRO
type: feature
---

- `create-pro-subscription` envia `allow_promotion_codes: true` no checkout (mensal e anual), permitindo cupom digitado pelo usuário.
- Cupom `souibmr`: 50% off `forever`, `redeem_by` 2026-06-19 (7d janela palestra IBMR). Mantém desconto enquanto a assinatura existe; cancelou = perde.
- Promotion code `SOUIBMR` criado via API (live): `promo_1ThcxF2HgVhVBE8UPfe7bK7H`, ativo, expira 2026-06-19, vinculado ao coupon `souibmr`. Usuário digita SOUIBMR no checkout.
