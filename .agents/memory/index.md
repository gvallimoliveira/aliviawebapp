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

## Memories
- [Blog AI Generation Rules](mem://features/blog-ai-generation-rules) — URL oficial e restrição de "avaliação gratuita" por público no gerador de artigos.
