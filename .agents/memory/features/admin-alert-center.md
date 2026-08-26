---
name: Admin Alert Center
description: Central de alertas ao admin (ticket de suporte, venda e reembolso Stripe) via edge function notify-admin, trigger no banco e cron de varredura.
type: feature
---

Todo alerta ao admin passa pela edge function `notify-admin` (canais: Telegram → e-mail Resend → push).

- Auth: `SUPABASE_SERVICE_ROLE_KEY`, header `x-internal-secret` (= secret `INTERNAL_ALERT_SECRET`) ou JWT de usuário logado. Anon NÃO é aceito.
- Disparos server-side (nunca no browser):
  - Trigger `trg_notify_admin_new_support_ticket` em `support_tickets` (action `ticket`).
  - Trigger `trg_notify_admin_new_assessment` em `assessments`: alerta SOMENTE autoavaliações (`professional_id IS NULL AND clinic_id IS NULL`) e sem nome/e-mail do paciente. Avaliação de link de profissional/clínica notifica apenas o profissional responsável — privacidade/LGPD.
  - Cron `notify-admin-sweep` a cada 5 min (action `sweep`) reenvia tickets com `notified_at IS NULL`.
  - `stripe-webhook`: `checkout.session.completed`, `async_payment_succeeded` e `charge.refunded` chamam action `alert`.
- Auditoria em `public.admin_alert_log` (canal, status, detalhe).
- Resend está em sandbox: só entrega em `gvallim.fisio@gmail.com`; há fallback automático que reenvia para o dono da conta ao receber 403. Verificar domínio para entregar nos dois e-mails VIP.
- Push está inativo enquanto os admins não registrarem dispositivos (`push_subscriptions` vazio).
- Telegram fica ativo ao definir `TELEGRAM_BOT_TOKEN` e `TELEGRAM_ADMIN_CHAT_ID`.
