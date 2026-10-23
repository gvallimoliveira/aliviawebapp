# Project Memory

## Core
Studio linha editorial: qualquer marca cria temas (serviços/produtos/diferenciais) — destaque só com termo canônico do tema, um tema por arte, seleção múltipla só nesses grupos.
Studio Aline Vet: tutor é o leitor/decisor; sintomas, coceira, citologia e queixas pertencem sempre ao animal (cão/gato/pet), nunca ao tutor.
Formulários mobile: todo campo de texto/select precisa de fonte >=16px no mobile (padrão `text-base md:text-sm` do Input; Textarea já segue) — fonte menor faz o iOS dar auto-zoom e cortar a tela.
Studio: painéis de criação ficam dentro de `StudioBoundary` (nunca tela branca; erro vai para app_errors) e blocos NUNCA usam texto como `key` de lista — sempre `${texto}-${i}`.
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
Push: triggers do banco chamam `notify-user` com `x-internal-secret` (anon key em http_post = 401). Sempre conferir `push_delivery_log`. Opt-in de push é sticky (`push_opt_in_enabled_v1`) e se auto-restaura após updates; só opt-out manual desativa.
Videochamada: fluxo CONGELADO (signaling durável + retry automático). Não mexer em VideoCallContext/video_call_sessions/triggers de push de chamada sem pedido direto do usuário.
Final Hypothesis: PRO/Clinic owner+therapist podem sobrescrever hipótese da IA; override substitui em prontuário, PDF e WhatsApp.
Support page: ao lançar/mudar feature relevante, atualizar Support.tsx + ClinicSupport.tsx + pt/en/es na MESMA loop.
Signup: email auto-confirm está ativo (`auto_confirm_email: true`). Usuário entra direto, sem etapa /verificar-email. NÃO criar gates de email_confirmed_at em checkout/reset.
LGPD: proibido script de rastreamento/session replay (Clarity removido). Controlador/DPO: Guilherme Vallim de Oliveira (aliviawebapp@gmail.com). Consentimento versionado via `POLICY_VERSION` em src/lib/consentLog.ts.
Studio copy: variação linguística = RELEITURA da frase (src/pages/studio/rewrite.ts), nunca troca de 1-2 palavras; 100% local, sem créditos de IA.
Studio copy: manual/briefing (brief_answers) é fonte primária do texto; acervo genérico só emergência; toda arte nasce de um par público × medo/desejo × gancho × CTA; vícios do Aliv.iA Fisio banidos (STALE_PHRASES).
Studio marca própria: copy charmosa do manual do Aliv.iA Studio (10 públicos) é exclusiva da marca dona — nunca vaza para marca de cliente.
Studio copy: ângulos venda/dor/desejo seguem os Pilares da Escrita Charmosa (empatia estruturada, ritmo com remate seco, foco no "você", antecipação, convite sem súplica). "Informar" fica fora.
Studio gramática: todo texto passa por proofread/agreement.ts (concordância determinante-possessivo-ordinal × núcleo nominal) — erro de concordância é bug; barra de busca escolhe o prefixo que dá match com as sugestões (fallback "saber mais sobre").
Studio gramática: toda frase passa pela guarda de português (nominalização de dores/desejos + portão readsWell); nunca cortar frase nem usar tapa-buraco visual (letra solta).
Studio 360° = modo livre (seed sorteia marca ampla OU 1 público matriz por lote), nunca todos juntos; ângulo "Informar" ≠ educacional.



Studio autoral: marca com `content_source = 'authorial'` NUNCA gera texto — só diagrama textos do autor (`studio_texts`) e slogans; jamais mistura obras nem fragmentos fora de ordem.

Studio léxico: marca Aliv.iA falando com paciente/sub-nicho clínico usa "AutoAvaliação"; nunca afirmar "protocolo" (método estruturado / direcionamento / raciocínio clínico).

Créditos de IA: após CADA etapa do plano de créditos, rodar o double-check padrão (mem://process/credits-phase-doublecheck) antes de declarar a etapa concluída.

Studio: manual da marca em PDF e questionário valem IGUAL — marca com só o manual não perde qualidade; a IA responde o questionário a partir dele.

Studio refinamentos de uma marca viram guardas globais quando forem gramática/coerência; só regras de domínio ficam específicas.

## Memories
- [Patient list default sort](mem://features/patient-list-default-sort) — Lista abre em "mais recentes"; A-Z é escolha do profissional na sessão.
- [HEP load bands](mem://features/hep-load-bands) — Faixas de séries semanais (leve até 15, moderada 16-29, alta ≥30), ponderação por objetivo e esforço 5-9.
- [Studio Editorial Line Any Brand](mem://features/studio-editorial-line-any-brand) — Linha editorial genérica: temas fechados, termos de destaque, seleção múltipla e arco obrigatório.
- [Studio Aline Veterinary Voice](mem://features/studio-aline-veterinary-voice) — Tutor é interlocutor, pet é paciente e referências à profissional Aline usam feminino.
- [Studio Global Copy Guards](mem://features/studio-global-copy-guards) — Refinamentos de títulos, aspas, caixa, possessivos e matrizes valem para todas as marcas.
- [Studio Tweet Carousel](mem://features/studio-tweet-carousel) — Tratamento opcional de carrossel como fio coerente de posts curtos, da tese ao fechamento.
- [Studio Manual = Questionário](mem://features/studio-manual-equals-questionnaire) — Manual em PDF e questionário com peso igual; IA preenche o questionário a partir do manual sem sobrescrever resposta escrita à mão.
- [Assessment Addenda](mem://features/assessment-addenda) — Informações adicionais em avaliação concluída: adendo manual, link /adendo/:token e reinterpretação opcional da IA.
- [Credits Phase Double-check](mem://process/credits-phase-doublecheck) — Revisão adversarial obrigatória ao fim de cada etapa do sistema de créditos de IA (bypass, paridade SQL, fail-open, trava dupla, relato).
- [Studio Multi-Slogan](mem://features/studio-multi-slogan) — Slogans independentes por linha no kit e siglas (DNA) sem flexão de artigo.
- [Studio Template Blocks](mem://features/studio-template-blocks) — Blocos de template externo (caixa de perguntas, promoção no celular, letras empilhadas, tratamentos 4/5 de carrossel) e checklist de registro.
- [Studio Terminology Rules](mem://features/studio-terminology-rules) — "AutoAvaliação" para paciente da marca Aliv.iA e proibição de afirmar "protocolo" (usar método estruturado/direcionamento/raciocínio clínico).
- [Studio Authorial Mode](mem://features/studio-authorial-mode) — Marcas autorais: Studio só diagrama textos do autor, regras de coerência e fragmentação.
- [Studio Gallery Edit](mem://features/studio-gallery-edit) — Edição de arte salva usa instantâneo (snapshot) da arte pronta; nunca reconstruir pela receita.
- [Studio Art Edit Save Safety](mem://features/studio-art-edit-save-safety) — Remontar arte após editar texto (evita erro ao salvar), faixa de tamanho 0,3–4 e carrossel sem frase repetida.
- [Studio Proofreading](mem://features/studio-proofreading) — Revisor de concordância global e escolha do texto digitado na barra de busca.
- [Studio Grammar Guard](mem://features/studio-grammar-guard) — Nominalização, portão readsWell, léxico proibido e fim dos tapa-buracos visuais.
- [AI Credits Period Timezone](mem://business/ai-credits-period-timezone) — Mês de créditos = fuso Brasília via `credit_period_start()`; escudos anti-falha no widget.
- [No Email Confirmation](mem://constraints/no-email-confirmation) — Signup sem etapa de confirmação; implicações e como reverter.
- [Auth Stability](mem://constraints/auth-stability) — Forbidden patterns around login (SW/PWA/cache) and required safeguards.
- [Visual Direction](mem://style/visual-direction) — Brand identity, colors, shapes, and official slogan.
- [Landing Layout Switch](mem://style/landing-layout-switch) — Alternar landings entre layout cinematográfico e original (LANDING_LAYOUT em src/lib/landingLayout.ts).
- [Landing Layout Toggles](mem://features/landing-layout-toggles) — GATEWAY_LAYOUT (modern/classic) para a landing geral; tom formal obrigatório no Gateway.
- [Cinematic Landing Scroll](mem://style/cinematic-landing-scroll) — Primitivos de scroll cinematográfico das landings (ScrollProgress, Reveal, KineticStatement, StickyShowcase, BrandMarquee) e regra de 1 seção escura.
- [Mobile UX](mem://style/mobile-ux) — Horizontal scrolling strategy for mobile views.
- [Gateway Page](mem://features/gateway-page) — Profile selector layout and styling constraints.
- [PDF Report Constraints](mem://features/pdf-report) — Layout margins and typography rules for PDFs.
- [Diagnosis Confidence](mem://clinical/diagnosis-confidence) — Rule for displaying confidence badges.
- [Safety Screening](mem://features/safety-screening) — Mandatory red flags and severe trauma screening.
- [Treatment Plan Framework](mem://features/treatment-plan) — STEPS framework phases and professional clinical guidelines for severe pain.
- [Clinical Knowledge Base](mem://clinical/knowledge-base) — Evidence-based protocols guiding AI reasoning (HIMA, HSR, McKenzie).
- [Clinical Methodology](mem://clinical/methodology) — Core clinical concepts STEPS and D.I.F.I.
- [Hypothesis Scope](mem://clinical/hypothesis-scope) — Hipótese diagnóstica curta (máx. 20 palavras), sem agravantes/medidas/impacto funcional; cuidado extra em avaliação externa.
- [VIP Users](mem://features/vip-users) — Access rules for VIP admin emails.
- [Pain Map Editor](mem://features/pain-map-editor) — Visual debug mode for admins to adjust SVG map paths.
- [Balance Training Preference](mem://clinical/balance-training-preference) — Sem superfícies instáveis; estabilidade em solo firme com perturbações e base reduzida (foot core).
- [Positional / Ergonomic Screening](mem://clinical/positional-ergonomic-screening) — Triagem da posição do exercício/alongamento; dor anterior de joelho ou restrição de flexão → nada de ajoelhar.
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
- [Clinical Impression Depth](mem://features/clinical-impression-depth) — Impressão clínica profunda: obrigatório analisar dinamometria, ADM e notas de evolução das sessões.
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

- [Assisted Differential Diagnosis](mem://features/differential-diagnosis) — Diferenciais só em confiança baixa/moderada, geração manual, adoção como hipótese final e bloco opcional no PDF.
- [Final Hypothesis Overrule](mem://features/final-hypothesis-overrule) — Profissional pode sobrescrever hipótese da IA no prontuário e PDF.
- [Support Page Maintenance](mem://process/support-page-maintenance) — Toda feature relevante exige atualização imediata de Support.tsx + ClinicSupport.tsx + pt/en/es na mesma loop.
- [Autogestão de Assinatura](mem://features/subscription-self-service) — Usuário cancela/retoma/muda para anual em Minha Conta; admin avisado na hora; auditoria self_*.
- [LGPD Pendências](mem://features/lgpd-pending) — Ajustes finais de LGPD adiados: banner de cookies, consentimento nos cadastros, fila de pedidos no Admin, retenção, e-mails.

- [AI Voice Recorder](mem://features/ai-voice-recorder) — FAB de gravação durante avaliação manual; Gemini transcreve+resume; áudio descartado, texto fica em `assessment_voice_notes`.
- [Agent Security Protocol](mem://tech/agent-security-protocol) — Blindagem anti-prompt-injection do Agente Clínico: papéis só via backend, sigilo total de internals/usuários.
- [Push Notification Transport](mem://tech/push-notification-transport) — Caminho obrigatório de push (notify-user + segredo interno), trigger de videochamada, payload mínimo iOS e log de entrega.
- [Agent Research Niches](mem://features/agent-research-niches) — 10 nichos iniciais do Agente de Raciocínio Clínico (PEDro ≥ 7) salvos em `agent_settings.preferred_niches`.
- [Agent Knowledge Validation](mem://features/agent-knowledge-validation) — Cross-check obrigatório de título contra PubMed/Crossref; PMID como link primário; action `revalidate` para varredura.
- [External Assessment Upload](mem://features/external-assessment-upload) — Upload PDF/imagem de avaliação externa, IA mapeia para o padrão Aliv.iA, vira avaliação nativa via prefillData no ManualAssessmentModal.
- [AI Credits Workspace Plan](mem://business/ai-credits-workspace-plan) — Plano de créditos de IA: tabelas, edge functions, IDs Stripe, carência 20% da clínica e Fase 7 futura (dashboard admin de rentabilidade por período/tipo de cliente).
- [Health History Screening](mem://features/health-history-screening) — Triagem obrigatória de hipertensão/diabetes/cardiopatia e medicação contínua em toda anamnese, prontuário, PDFs e prompts de IA.
- [Sacroiliac Laslett Cluster](mem://features/sacroiliac-laslett-cluster) — Cluster de Laslett sugerido na avaliação manual quando há dor sacroilíaca/glútea.
- [Studio Marketing Landing](mem://features/studio-marketing-landing) — Landing mutável /studio (preview + admin) para gerar conteúdo de marketing dos 4 mundos.
- [Studio Editorial Coverage](mem://features/studio-editorial-coverage) — Sistema mestre do /studio: registro canônico de tópicos, imagem = assunto (sem fallback) e cobertura editorial consultada antes da criação.

- [Studio Photo Library](mem://features/studio-photo-library) — Fotos privadas no backend + 3 blocos fotográficos do Studio (tipografia gigante, split, retrato).
- [Studio Reference Blocks](mem://features/studio-reference-blocks) — Blocos busca/mockup de dispositivo/porta/palco vindos das referências enviadas + BRAND_HANDLE e BRAND_SITE.
- [Studio Model Preferences](mem://features/studio-model-preferences) — Seletor de modelos de arte no Studio (Aleatório padrão) restringindo os blocos gerados.
- [Credits Sufficiency Table on Landings](mem://features/credits-sufficiency-table-landings) — Tabela de "quantas vezes cabem no plano" para landings Pro/Clínica/Acadêmico, tranquilizando sobre suficiência dos créditos.
- [Continuidade básica → premium](mem://features/basic-to-premium-continuity) — Red flags reaproveitadas (sem repetir a etapa) e hipótese diagnóstica contínua com explicação de mudança no upgrade.
- [LGPD Compliance](mem://features/lgpd-compliance) — Controlador/DPO, páginas /privacidade e /termos, consentimento versionado, direitos do titular e proibição de session replay.

- [Chat Addon Flag](mem://features/chat-addon-flag) — `ENABLE_CHAT_ADDON=false`: card de venda do Chat do Agente só volta a aparecer no mesmo deploy do enforcement do chat.
- [Blog AI Generation Rules](mem://features/blog-ai-generation-rules) — URL oficial https://aliviawebapp.com.br e proibição de "avaliação gratuita" para público profissional no gerador de artigos.
- [Admin Subscription Management](mem://features/admin-subscription-management) — Reembolso não rebaixa; cancelar/rebaixar/reativar via painel Admin → Profissionais com auditoria.
- [Admin Alert Center](mem://features/admin-alert-center) — Alertas de ticket de suporte e vendas/reembolsos Stripe via `notify-admin` (trigger + cron + auditoria).

- [Multi-Condition Dashboard](mem://features/multi-condition-dashboard) — Painel pessoal agrupa avaliações por região/episódio; diário de dor, evolução e histórico por condição.
- [Video Call Flow Frozen](mem://features/video-call-frozen) — Fluxo de videochamada congelado: arquivos e regras que não podem mudar sem autorização.
- [Push Opt-In Persistence](mem://features/push-opt-in-persistence) — Autorização de push sticky, heal automático pós-update e opt-out manual.
- [Strength Dynamometry](mem://features/strength-dynamometry) — Dinamometria: medidas múltiplas, tempo até o pico opcional, assimetria L/R e agonista/antagonista com limite de 10% (verde/vermelho).
- [Pain Mechanism Roadmap](mem://features/pain-mechanism-roadmap) — Roteiro segmentado de mecanismo de dor + mapa v2, status por passo e flags ENABLE_PAIN_MECHANISM / ENABLE_PAINMAP_V2.
- [Notification Preferences by Account](mem://features/notification-preferences-by-account) — Toggles de notificação distintos para conta pessoal (paciente) e profissional; toda push nova precisa de `category`.
- [FABQ / Psychosocial Questionnaires](mem://features/fabq-psychosocial) — FABQ-Brasil como domínio psicossocial (yellow flags): gatilhos, cortes das subescalas, etapa opcional na reavaliação e uso pela IA.
- [Pro Dashboard Slim](mem://features/pro-dashboard-slim) — Dashboard PRO enxuto (lista de pacientes no topo, sem card do Agente, backup em Minha Conta) e FAB/botão "Registrar evolução" no prontuário via evento `alivia:open-session-note`.
- [Studio Public Pricing & Entry](mem://business/studio-public-pricing-and-entry) — Planos 39/99/249 + anual −20%, custo ~0 por arte, e decisão de acesso interno futuro com botão de volta.
- [Studio Brand Mark Pattern](mem://features/studio-brand-mark-pattern) — Padrão de fundo com o símbolo da marca repetido (campo mark_url) ao lado das tramas geométricas.
- [Studio Brand Signature](mem://features/studio-brand-signature) — Assinatura obrigatória da marca em todas as artes; toggle global por marca.
- [Studio Method Blocks](mem://features/studio-method-blocks) — STEPS e D.I.F.I. como artes do Studio, exclusivas da marca Aliv.iA.
- [Studio Matrix Audiences](mem://features/studio-matrix-audiences) — Públicos matriz contam na métrica oficial das artes; sub-nichos (parentId) nunca contam.
- [Studio Persuasion Layer](mem://features/studio-persuasion-layer) — Diretrizes ago/2026: ponto zero de impacto, jargão proibido, postura padrão, léxico exclusivo do Studio; regras rejeitadas (limite de palavras, mix 4/2/2/2, séries).
- [Studio Relational Copy](mem://features/studio-relational-copy) — Hierarquia DNA-first (manual/briefing), par relacional obrigatório por arte e vícios de linguagem banidos.
- [Studio Kit Fields, Caption & Carousel Filter](mem://features/studio-kit-fields-and-caption) — Legenda pelo diretor, filtro de nexo no carrossel, par obrigatório de campos do kit e objeção como título.
- [Studio Self Charm Copy](mem://features/studio-self-charm-copy) — Copy charmosa exclusiva da marca Aliv.iA Studio (10 públicos do manual v1.0), nunca aplicada a marca de cliente.
- [Aliv.iA Core Charm Copy](mem://features/alivia-core-charm-copy) — Copy charmosa exclusiva do Aliv.iA app clínico (6 públicos: paciente, autônomo, clínica, estudante, recém-formado, institucional).
- [Studio Neutral Operation](mem://features/studio-neutral-operation) — Acervo neutro escreve com o vocabulário da operação real da marca (operationWords), sem temática de consultório.
- [Studio Hook Library](mem://features/studio-hook-library) — Ganchos virais: mecanismo por ingredientes do kit, acervo curado por marca e modelo/bloco "Ganchos".
- [Studio Copy Engine](mem://features/studio-copy-engine) — Motor textual local: léxico + releitura de frase (rewrite.ts), níveis Baixa/Média/Alta, sem créditos de IA.
- [Studio Carousel Variety](mem://features/studio-carousel-variety) — Repertório de roteiros de carrossel por público/marca + rotação por seed (nunca repetir o mesmo tema).
- [Studio Charm Writing](mem://features/studio-charm-writing) — Pilares da Escrita Charmosa nos ângulos venda/dor/desejo + tabela de copy charmosa por sub-nicho (dor crônica, esportista, pós-op, 60+, vestibular, feridas).
- [Studio Color Precision](mem://features/studio-color-precision) — Lado A/B por arte (inverter cores), captura de tom pixel a pixel do manual e conta-gotas no kit de cores.
- [Periodization Load](mem://features/periodization-load) — Periodização macro/meso/micro, sRPE, ACWR, check-in 1–10 e link público /carga/:token.
- [Exercise Video Monthly Audit](mem://features/exercise-video-monthly-audit) — Auditoria mensal automática dos vídeos do YouTube da biblioteca de exercícios (cron dia 1º, aba Vídeos no Admin).
- [Studio Photo Rotation](mem://features/studio-photo-rotation) — Rotatividade do acervo no lote: foto menos usada primeiro, teto de 3 repetições com 10+ fotos, cota de 70% com foto de fundo.
- [Studio Typography Guards](mem://features/studio-typography-guards) — Regras globais das artes: palavra-cartaz inteira, chamada de público curta (1 por vez), caixa de frase, fecho da arte e contraste garantido sobre foto.
- [Studio Creative Learning Loop](mem://features/studio-creative-learning) — Correções de texto viram regra da marca, memória entre lotes, briefing de IA guardado (vale com IA off) e coleta de resultados por geração.
- [Studio Format Insights](mem://features/studio-format-insights) — Campo "Insights de formatos" no kit: diálogo pronto (título | falas | fecho) que vira cartaz, lista, história e carrossel.
- [Studio Manual-Only Audience](mem://features/studio-manual-only-audience) — Público `manualOnly` fica fora do sorteio da Visão 360° e só gera arte quando selecionado na aba do topo (caso "feridas" da Guilherme Vallim).
- [Studio Vestibular Lexicon](mem://features/studio-vestibular-lexicon) — Vocabulário de tontura (labirintite, VPPB, otocônias, canais semicirculares, avaliação antes da manobra) nas artes do público vestibular.
- [Studio MSK Lexicon](mem://features/studio-msk-lexicon) — Vocabulário de lesões (LCA, menisco, manguito, arremessador, lesão muscular, tendinopatias, dor patelofemoral, quadril, tornozelo) para esportista, pós-op e dor crônica.
- [Studio Audience Scope](mem://features/studio-audience-scope) — Filtro de pertencimento: arte de um público não cita rótulo de outro nem tema clínico incompatível.
- [Studio Brand Sharing](mem://features/studio-brand-sharing) — Compartilhar marca do Studio com outra conta: membros por e-mail, acesso total, cota do criador.
- [Cardio Module](mem://features/cardio-module) — Perfil CV manual pelo fisio, teto Gellish, sem citar marcas, caminho com oxímetro.
