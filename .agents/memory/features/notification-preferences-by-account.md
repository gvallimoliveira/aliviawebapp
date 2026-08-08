---
name: Notification Preferences by Account Type
description: Toggles de notificação diferentes para conta pessoal (paciente) e profissional, com bloco de uso pessoal para quem acumula os dois papéis.
type: feature
---
`notification_preferences` tem duas famílias de colunas:

- Profissional: `assessments`, `messages`, `red_flags`, `questionnaires`, `billing`.
- Pessoal (paciente): `care_plan` (HEP, diário de dor, streaks), `my_assessment` (avaliação para retomar, resultado, sugestão de reavaliação), `messages` (compartilhada), `payments` (boleto, pagamento confirmado, premium disponível).

Regras:
- Conta sem perfil profissional real (`professionals` ativo/CREFITO válido/assinatura/parceiro) e sem `clinic_members` ativo → mostra APENAS a lista de paciente. Detecção em `useIsProfessionalAccount`.
- Profissional vê a lista clínica completa + bloco separado "Uso pessoal" com `care_plan`/`my_assessment`/`payments`.
- Todo disparo em `push-cron` (e qualquer novo lembrete a paciente) DEVE enviar `category`, senão o toggle não vale. `send-push-notification` só filtra categorias presentes em `VALID_CATEGORIES`.
