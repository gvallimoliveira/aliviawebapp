---
name: Admin Subscription Management
description: Como reembolsar/cancelar/rebaixar contas PRO com segurança pelo painel admin (aba Profissionais)
type: feature
---

Reembolso no Stripe **nunca** rebaixa a conta automaticamente (protege casos de cobrança duplicada, ex.: Rita Chagas).

Para agir sobre acesso, usar o painel Admin → Profissionais → ícone de escudo (`SubscriptionAdminDialog`),
que chama a edge function `admin-manage-subscription` (valida `is_admin`):

- `inspect` — lista todas as assinaturas Stripe do e-mail e sinaliza duplicidade ativa.
- `cancel_at_period_end` — cancela ao fim do ciclo, mantém acesso.
- `cancel_now` — cancela imediato; só rebaixa se **não** sobrar outra assinatura ativa. Com 2+ ativas, exige seleção explícita (HTTP 409).
- `downgrade_basic` — rebaixa só no app (não mexe no Stripe); limpa partner/premium/grace.
- `reactivate_access` — correção manual, devolve PRO.

Motivo é obrigatório e tudo fica auditado em `public.subscription_admin_actions` (leitura só para admin).
