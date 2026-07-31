---
name: Autogestão de Assinatura
description: Usuário gerencia a própria assinatura em "Minha Conta" (cancelar, retomar, mudar para anual, portal Stripe) com aviso imediato ao admin.
type: feature
---
Card `src/components/account/SubscriptionCard.tsx` na página "Minha Conta" (seção "Assinatura e cobrança").

Backend: edge function `manage-my-subscription` — ações permitidas apenas sobre a assinatura do próprio usuário autenticado (customer resolvido pelo e-mail do JWT; recusa `subscription_id` de terceiros):
- `inspect` — lista assinaturas vivas (active/trialing/past_due/unpaid) com plano, valor, status e fim do período.
- `cancel_at_period_end` — cancelamento SEMPRE agendado para o fim do período pago; nunca corta acesso já pago.
- `resume` — desfaz o cancelamento agendado.
- `switch_to_annual` — troca mensal → anual com `create_prorations` (mapa de preços PRO e Clínica no arquivo).

Toda ação grava em `subscription_admin_actions` com `action = self_*` e `performed_by` = próprio usuário, e dispara `notify-admin` (`subscription_self_service`) na hora.

`stripe-webhook` também alerta o admin em `customer.subscription.updated/deleted` (cancelamento agendado/desfeito, troca de plano, mudança de status) e em `invoice.payment_failed` — cobre mudanças feitas direto no portal Stripe. Renovações comuns não geram alerta.

`SubscriptionAdminDialog` (Admin → Profissionais) mostra as ações `self_*` recentes com motivo e data.

Layout de "Minha Conta": seções com subtítulos — Conta, Assinatura e cobrança, Notificações, Perfil profissional, Privacidade e dados, Ajuda.
