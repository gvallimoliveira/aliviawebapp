# Project Memory

## Core
Brand: Aliv.iA. Modern warm design, primary teal & earthy tones, rounded corners. Slogan: "...sistema de raciocínio clínico com alma de fisioterapeuta".
URL oficial do app: **https://aliviawebapp.com.br** — usar SEMPRE esse domínio em conteúdos gerados/embutidos (blog, e-mails, PDFs). Nunca alivia.app / alivia.com.br.
Blog: NÃO prometer "avaliação gratuita" em textos direcionados a fisioterapeuta/clínica/acadêmico — só existe "teste grátis 14 dias do plano PRO".
Methodology: Always apply STEPS (6 phases) & D.I.F.I (Pain, Inhibition, Weakness, Disability) frameworks.
Assessments: Mandatory 'Red Flags' screening. Patient-only flow interrupts; pro/clinic-link & manual flows continue with hypothesis "sob ressalva" until any clinic therapist dismisses with justification (audit kept and shown in PDF).
AI Reasoning: Enforce 4-layer JSON extraction logic in Edge Functions to handle inconsistent formatting.
PDFs: Maintain strict 158mm useful width margin. Protect titles against orphaning.
Pro Access: Registration strictly via landing page with payment first. Stripe branding MUST be manually set in Stripe dashboard.
Clinic Mode: Staff must use institutional clinic links, not personal links, to prevent private abuse. Treatments are free in clinic mode.
Gateway/UI: Use `overflow-x-hidden` on gateway root to keep header sticky. Mobile carousels use horizontal 'peek' effect (~2.5 cards).
Auth is critical: NO global Service Workers / PWA cache layers may intercept Supabase auth. Test login on desktop AND mobile before shipping any change to AuthContext, supabase client, main.tsx, or SW config.
Final Hypothesis: PRO/Clinic owner+therapist podem sobrescrever hipótese da IA; override substitui em prontuário, PDF e WhatsApp.
Support page: ao lançar/mudar feature relevante, atualizar Support.tsx + ClinicSupport.tsx + pt/en/es na MESMA loop.
Signup: email auto-confirm está ativo (`auto_confirm_email: true`). Usuário entra direto, sem etapa /verificar-email. NÃO criar gates de email_confirmed_at em checkout/reset.
LGPD: proibido script de rastreamento/session replay (Clarity removido). Controlador/DPO: Guilherme Vallim de Oliveira (aliviawebapp@gmail.com). Consentimento versionado via `POLICY_VERSION` em src/lib/consentLog.ts.


## Memories
- [No Email Confirmation](mem://constraints/no-email-confirmation) — Signup sem etapa de confirmação; implicações e como reverter.
- [Auth Stability](mem://constraints/auth-stability) — Forbidden patterns around login (SW/PWA/cache) and required safeguards.
- [Visual Direction](mem://style/visual-direction) — Brand identity, colors, shapes, and official slogan.
- [Mobile UX](mem://style/mobile-ux) — Horizontal scrolling strategy for mobile views.
- [Gateway Page](mem://features/gateway-page) — Profile selector layout and styling constraints.
- [PDF Report Constraints](mem://features/pdf-report) — Layout margins and typography rules for PDFs.
- [Diagnosis Confidence](mem://clinical/diagnosis-confidence) — Rule for displaying confidence badges.
- [Safety Screening](mem://features/safety-screening) — Mandatory red flags and severe trauma screening.
- [Treatment Plan Framework](mem://features/treatment-plan) — STEPS framework phases and professional clinical guidelines for severe pain.
- [Clinical Knowledge Base](mem://clinical/knowledge-base) — Evidence-based protocols guiding AI reasoning (HIMA, HSR, McKenzie).
- [Clinical Methodology](mem://clinical/methodology) — Core clinical concepts STEPS and D.I.F.I.
- [VIP Users](mem://features/vip-users) — Access rules for VIP admin emails.
- [Pain Map Editor](mem://features/pain-map-editor) — Visual debug mode for admins to adjust SVG map paths.
- [Balance Training Preference](mem://clinical/balance-training-preference) — Sem superfícies instáveis; estabilidade em solo firme com perturbações e base reduzida (foot core).
- [Diagnosis Sharing](mem://features/diagnosis) — Fallback logic and versioning for PDF sharing.
- [Follow-Up System](mem://features/follow-up-system) — Automated check-in emails at weeks 1, 2, 4, 6.
- [Pain Diary](mem://features/pain-diary) — Daily pain tracking with 0-10 slider and gamification.
- [Assessment Comparison](mem://features/assessment-comparison) — Before & After comparison for users with 2+ premium assessments.
- [Assessment Resume Identity](mem://features/assessment-resume-identity) — Retomada 24h: link com token retoma por dispositivo/nuvem; link genérico só retoma após e-mail/nome baterem.

- [Professional Marketplace](mem://features/professional-marketplace) — Requirements and rules for professional listings.
- [Dashboard Tabs](mem://features/dashboard-tabs) — Adaptive layout based on Clinic, Solo, or Patient mode.
- [Pricing and Tiers](mem://business/pricing-and-tiers) — Professional plan pricing and billing toggle behavior.
- [Stripe Branding Requirements](mem://tech/stripe-branding-requirements) — Manual branding config required in Stripe dashboard.
- [Lifetime Treatment Logic](mem://business/lifetime-treatment-logic) — Distinction between lifetime treatment and PRO subscription.
- [Retention System](mem://features/retention-system) — Push notifications for adherence and clinical alerts.
- [Referral Program](mem://business/referral-program) — Discount priority and rules for the referral system.
- [Exit Intent Popup](mem://features/exit-intent-popup) — Desktop/mobile exit intent logic and 10% discount.
- [Async Payment Persistence](mem://features/async-payment-persistence) — State preservation for async payments like Boleto.
- [Professional PDF Branding](mem://features/professional-pdf-branding) — Custom logo placement in PDF reports.
- [AI Integration Rules](mem://tech/ai-integration) — 4-layer JSON extraction logic for AI responses.
- [Clinical Impression](mem://features/clinical-impression) — AI summary of patient evolution across multiple assessments.
- [Internal Messaging](mem://features/internal-messaging) — Two-way P2P chat and permission differences.
- [Internal Messaging Disclaimer](mem://tech/internal-messaging-disclaimer) — Liability disclaimer for chat interactions.
- [Pro Express Reassessment](mem://features/pro-express-reassessment) — Reassessment pre-fills and highlights changes.
- [Pro Evolution Report](mem://features/pro-evolution-report) — AI-generated comparative summary for discharge.
- [Professional Registration Flow](mem://features/professional-registration-flow) — Registration constraint for professionals.
- [Pro Simulated Environment](mem://features/pro-simulated-environment) — Demo mode for professionals with mock data and drag-and-drop tests.
- [Adaptive Progression AI](mem://features/adaptive-progression-ai) — AI treatment progression logic for self-service premium users.
- [Video Calling](mem://features/video-calling) — P2P video chat using WebRTC and Supabase Realtime.
- [Pro Agenda](mem://features/pro-agenda) — Native overflow usage for drag-and-drop schedule grid.
- [Clinic Product Model](mem://business/clinic-product-model) — Clinic pricing tiers and 15-day no-CC trial.
- [Clinic White Label](mem://features/clinic-white-label) — Custom brand colors and logo for clinic mode.
- [Clinic Treatment Pricing](mem://business/clinic-treatment-pricing) — Treatments are free and included in clinic mode.
- [Clinic Anti-Abuse](mem://features/clinic-anti-abuse) — Prevents staff from using clinic resources for private patients.
- [Clinic Assessment Links](mem://features/clinic-assessment-links) — Staff must use institutional links over personal ones.
- [AI Agenda Import](mem://features/ai-agenda-import) — Gemini Flash OCR for schedule image imports.
- [Patient Documents](mem://features/patient-documents) — 20MB limit for file uploads per patient.
- [Clinic Trial Management](mem://features/clinic-trial-management) — Urgency banners and lockouts for the 15-day trial.
- [Clinic Feedback Survey](mem://features/clinic-feedback-survey) — Public satisfaction survey with NPS dashboard and chat integration.
- [PWA Reinstall Flag](mem://features/pwa-reinstall-flag) — How to flag a release in `public/version-extras.json` so the update toast tells PWA users to reinstall the home-screen icon.
- [Clinic Archive Patients](mem://features/clinic-archive-patients) — Soft archive at clinic level shared by team; secretaries can hide/restore without losing history.
- [Pro Demo for Clinic Therapist](mem://features/pro-demo-for-clinic-therapist) — Clinic therapists without PRO profile get a "Profissional Autônomo (Demo)" option that opens the simulated Pro dashboard with subscription CTA.
- [Partner Access Model](mem://business/partner-access-model) — Desacoplamento PRO/Clínica/Premium e tabela granted_premium_users para Premium B2C por e-mail.
- [Partner Temporary CREFITO](mem://features/partner-temporary-crefito) — CREFITO placeholder `NNNNNN-X` criado no painel de parceiros nunca classifica a conta como profissional formado.

- [Final Hypothesis Overrule](mem://features/final-hypothesis-overrule) — Profissional pode sobrescrever hipótese da IA no prontuário e PDF.
- [Support Page Maintenance](mem://process/support-page-maintenance) — Toda feature relevante exige atualização imediata de Support.tsx + ClinicSupport.tsx + pt/en/es na mesma loop.
- [Autogestão de Assinatura](mem://features/subscription-self-service) — Usuário cancela/retoma/muda para anual em Minha Conta; admin avisado na hora; auditoria self_*.
- [LGPD Pendências](mem://features/lgpd-pending) — Ajustes finais de LGPD adiados: banner de cookies, consentimento nos cadastros, fila de pedidos no Admin, retenção, e-mails.

- [AI Voice Recorder](mem://features/ai-voice-recorder) — FAB de gravação durante avaliação manual; Gemini transcreve+resume; áudio descartado, texto fica em `assessment_voice_notes`.
- [Agent Security Protocol](mem://tech/agent-security-protocol) — Blindagem anti-prompt-injection do Agente Clínico: papéis só via backend, sigilo total de internals/usuários.
- [Agent Research Niches](mem://features/agent-research-niches) — 10 nichos iniciais do Agente de Raciocínio Clínico (PEDro ≥ 7) salvos em `agent_settings.preferred_niches`.
- [Agent Knowledge Validation](mem://features/agent-knowledge-validation) — Cross-check obrigatório de título contra PubMed/Crossref; PMID como link primário; action `revalidate` para varredura.
- [External Assessment Upload](mem://features/external-assessment-upload) — Upload PDF/imagem de avaliação externa, IA mapeia para o padrão Aliv.iA, vira avaliação nativa via prefillData no ManualAssessmentModal.
- [AI Credits Workspace Plan](mem://business/ai-credits-workspace-plan) — Plano de créditos de IA: tabelas, edge functions, IDs Stripe, carência 20% da clínica e Fase 7 futura (dashboard admin de rentabilidade por período/tipo de cliente).
- [Credits Sufficiency Table on Landings](mem://features/credits-sufficiency-table-landings) — Tabela de "quantas vezes cabem no plano" para landings Pro/Clínica/Acadêmico, tranquilizando sobre suficiência dos créditos.
- [LGPD Compliance](mem://features/lgpd-compliance) — Controlador/DPO, páginas /privacidade e /termos, consentimento versionado, direitos do titular e proibição de session replay.

- [Chat Addon Flag](mem://features/chat-addon-flag) — `ENABLE_CHAT_ADDON=false`: card de venda do Chat do Agente só volta a aparecer no mesmo deploy do enforcement do chat.
- [Blog AI Generation Rules](mem://features/blog-ai-generation-rules) — URL oficial https://aliviawebapp.com.br e proibição de "avaliação gratuita" para público profissional no gerador de artigos.
- [Admin Subscription Management](mem://features/admin-subscription-management) — Reembolso não rebaixa; cancelar/rebaixar/reativar via painel Admin → Profissionais com auditoria.
- [Admin Alert Center](mem://features/admin-alert-center) — Alertas de ticket de suporte e vendas/reembolsos Stripe via `notify-admin` (trigger + cron + auditoria).

