---
name: LGPD Compliance
description: Estrutura de conformidade LGPD do Aliv.iA — controlador/DPO, páginas legais, registro de consentimento e direitos do titular.
type: feature
---
Controlador e Encarregado (DPO): Guilherme Vallim de Oliveira — aliviawebapp@gmail.com.

Regras:
- Proibido qualquer script de rastreamento/session replay (Microsoft Clarity foi removido). Telas com dados de saúde não podem ser gravadas por terceiros.
- Páginas legais: `/privacidade` (src/pages/PrivacyPolicy.tsx) e `/termos` (src/pages/Terms.tsx), linkadas no Footer.
- Consentimento versionado: `src/lib/consentLog.ts` (`POLICY_VERSION`) grava em `consent_records`. Ao alterar o texto da política ou do consentimento, subir a `POLICY_VERSION`.
- Autoavaliação de paciente registra consentimento via `logConsent` no WelcomeStep.
- Novo pedido de titular dispara `trg_notify_admin_new_dsr` -> edge `notify-admin` action `dsr`: alerta admin (e-mail/Telegram/push) com prazo de 15 dias e próximos passos + e-mail de confirmação ao titular; `notified_at` marca entrega e `sweep` reprocessa falhas.
- Direitos do titular: `src/components/account/PrivacyRightsCard.tsx` em Minha Conta — exportação JSON dos dados e registro de solicitações em `data_subject_requests` (acesso, portabilidade, correção, exclusão, revogação). Prazo de resposta: 15 dias.
- Prontuário pode ser retido pelo prazo legal de guarda; demais dados eliminados/anonimizados.
- Suboperadores declarados: Lovable/Supabase, Stripe, Resend, provedores de IA via gateway.
