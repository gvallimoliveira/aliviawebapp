---
name: LGPD Pendências
description: Ajustes finais de LGPD ainda NÃO implementados (banner de cookies, consentimento em cadastros, fila de pedidos no Admin, retenção, e-mails).
type: feature
---
Pendências acordadas com o usuário (adiadas em 31/07/2026, implementar quando ele pedir):

1. Banner de cookies/consentimento de 1º acesso — não existe componente hoje (só menção na Política).
2. Consentimento versionado nos cadastros de profissional e clínica (`professional_terms` / `clinic_terms` via `logConsent`); hoje só o WelcomeStep da autoavaliação registra.
3. Fila de "Pedidos de Direitos do Titular" no Admin lendo `data_subject_requests`, com status, prazo de 15 dias e alerta específico (separado dos tickets de suporte).
4. Retenção/expurgo automático de rascunhos e logs antigos (hoje só `assessment_progress` expira).
5. Link da Política de Privacidade nos e-mails transacionais.
