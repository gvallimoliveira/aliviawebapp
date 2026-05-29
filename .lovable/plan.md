
## Objetivo

Eliminar a barreira de confirmação de email no signup. Usuário entra direto no sistema em plano básico (com CTAs de upgrade contextuais conforme a landing de origem). Confirmação só é exigida em dois pontos sensíveis: **checkout Stripe** e **recuperação de senha**. Banner persistente lembra o usuário no dashboard.

---

## Mudanças

### 1. Auth — auto-confirmar emails
- Habilitar `auto_confirm_email: true` no Supabase Auth (via `configure_auth`).
- Novos signups ficam imediatamente ativos: o `signUp()` já retorna `session`, então o `AuthContext` atual cai direto logado, sem passar por `/verify-email`.

### 2. Backfill de usuários presos
- Migration SQL (admin-only): `UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE email_confirmed_at IS NULL;` — libera todos os cadastros que estavam travados em `/verify-email`.

### 3. Fluxo de signup (`Auth.tsx` / cadastro nas landings)
- Após `signUp()` bem-sucedido → redirecionar direto para `/dashboard` (ou destino contextual conforme `source` / landing de origem: pro → Gateway com perfil PRO demo; clinic → Dashboard com CTA trial; paciente/landing principal → Dashboard básico).
- Remover redirect para `/verify-email` no fluxo padrão.
- `/verify-email` continua existindo, mas só é alcançada manualmente (ex.: botão "Reenviar confirmação" no banner).

### 4. Banner persistente "Confirme seu email"
- Novo componente `EmailVerificationBanner.tsx` montado no layout do Dashboard (e ClinicDashboard).
- Aparece quando `user && !user.email_confirmed_at`.
- Conteúdo: "Confirme seu email para garantir recuperação de senha e recebimento de relatórios" + botão "Reenviar email" (chama `supabase.auth.resend`) + link "Já confirmei, atualizar".
- Dismissível por sessão (não persistente em localStorage — volta na próxima abertura).

### 5. Gate no checkout Stripe
- Hooks de pagamento (`useProSubscription.handleSubscribe`, `handleLifetimeCheckout`, `create-clinic-subscription`, `create-pro-treatment-payment`, `create-payment` para Premium) verificam `user.email_confirmed_at` **no frontend antes de invocar a edge function**.
- Se não confirmado → abrir modal `ConfirmEmailGateDialog` explicando que o recibo Stripe precisa de email válido, com botão "Reenviar confirmação" e instrução para clicar no link e tentar de novo.
- Não muda lógica das edge functions (mantém compatibilidade).

### 6. Gate na recuperação de senha
- `resetPassword` em `AuthContext`: antes de chamar `resetPasswordForEmail`, fazer lookup leve. Como `auth.users` não é acessível pelo client, abordagem alternativa: criar edge function pública `check-email-confirmed` que retorna apenas `{ confirmed: boolean }` para o email informado (sem vazar se a conta existe — sempre 200 OK, `confirmed: false` cobre tanto "não existe" quanto "não confirmado").
- Se `confirmed: false`, exibir mensagem: "Não conseguimos enviar recuperação. Confirme seu email primeiro ou contate o suporte."
- Mensagem genérica evita user-enumeration.

### 7. Atualização da página de Suporte
- Atualizar `Support.tsx` + `ClinicSupport.tsx` (pt/en/es) com nova seção: "Sobre a confirmação de email — não é mais obrigatória para usar o app, mas necessária para assinar e recuperar senha".

### 8. Memória do projeto
- Atualizar `mem://index.md` Core: substituir referência a "verificação obrigatória" por "email opcional, exigido só em checkout e reset de senha".
- Atualizar `mem://constraints/auth-stability` se mencionar verify-email.

---

## Detalhes técnicos

### Arquivos afetados
- Nova migration: `auto_confirm_email` + backfill `auth.users`.
- `supabase--configure_auth` com `auto_confirm_email: true`.
- `src/pages/Auth.tsx` — remover navigate("/verify-email"), mandar direto para dashboard.
- `src/contexts/AuthContext.tsx` — ajustar `resetPassword` para verificar confirmação antes.
- Nova edge function: `supabase/functions/check-email-confirmed/index.ts` (service-role, retorna boolean genérico).
- Novo: `src/components/EmailVerificationBanner.tsx`.
- Novo: `src/components/ConfirmEmailGateDialog.tsx`.
- `src/pages/Dashboard.tsx` + Clinic dashboard root — montar banner.
- `src/hooks/useProSubscription.ts` — gate no `handleSubscribe`, `handleLifetimeCheckout`.
- Componentes que disparam `create-clinic-subscription`, `create-payment`, `create-pro-treatment-payment` — gate antes do invoke.
- `src/pages/Support.tsx`, `src/pages/ClinicSupport.tsx`, `src/locales/{pt,en,es}.json` — nova seção.
- `src/pages/VerifyEmail.tsx` — manter, mas ajustar copy para "passo opcional".

### O que NÃO muda
- Estrutura de assinaturas, RLS, edge functions de pagamento, fluxos contextuais de landing (pro/clinic/paciente já funcionam corretamente hoje via `source`/redirect).
- Política de "PRO só pode ser criado pela landing PRO" (memória já existente) — mantida; apenas o passo de verificar email some.

### Risco mitigado
- Contas fake: mantemos HIBP + limite de 1 avaliação básica por conta. Sem mudança aqui.
- Stripe enviando recibo para email inválido: bloqueado pelo gate de checkout.
