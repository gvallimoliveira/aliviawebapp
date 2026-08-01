---
name: LGPD Pendências
description: Ajustes finais de LGPD ainda NÃO implementados (banner de cookies, consentimento em cadastros, retenção, e-mails).
type: feature
---
Pendências acordadas com o usuário (adiadas em 31/07/2026, implementar quando ele pedir):

1. Banner de cookies/consentimento de 1º acesso — não existe componente hoje (só menção na Política).
2. Consentimento versionado nos cadastros de profissional e clínica (`professional_terms` / `clinic_terms` via `logConsent`); hoje só o WelcomeStep da autoavaliação registra.
3. Retenção/expurgo automático de rascunhos e logs antigos (hoje só `assessment_progress` expira).
4. Fila visual de "Pedidos de Direitos do Titular" no Admin (o alerta já chega, mas não há tela dedicada lendo `data_subject_requests`).

FEITO em 01/08/2026: gancho de notificação — trigger `trg_notify_admin_new_dsr` chama `notify-admin` action `dsr`, que avisa admins (e-mail/Telegram/push) com tipo, titular, prazo de 15 dias e próximos passos, envia e-mail de confirmação ao titular e marca `notified_at`; `sweep` reprocessa pedidos não entregues.
