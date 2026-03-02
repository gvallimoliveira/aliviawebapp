
# Fluxo "Esqueci Minha Senha"

## Resumo
Adicionar o fluxo completo de recuperacao de senha: link "Esqueci minha senha" na tela de login, envio de email de reset, e uma nova pagina `/reset-password` para definir a nova senha.

---

## Mudancas

### 1. AuthContext - nova funcao `resetPassword`
- Adicionar `resetPassword(email: string)` ao contexto
- Chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`

### 2. Tela de Login (`Auth.tsx`) - link "Esqueci minha senha"
- Adicionar um estado `isForgotPassword` para mostrar um formulario simplificado (apenas email)
- Quando ativo, exibe campo de email + botao "Enviar link de recuperacao"
- Link para voltar ao login normal

### 3. Nova pagina: `src/pages/ResetPassword.tsx`
- Detecta o token de recovery no URL hash (`type=recovery`)
- Exibe formulario com "Nova senha" e "Confirmar senha"
- Chama `supabase.auth.updateUser({ password })` para atualizar
- Apos sucesso, redireciona ao Dashboard com toast de confirmacao
- Rota publica (sem protecao de auth)

### 4. Rota no `App.tsx`
- Adicionar `<Route path="/reset-password" element={<ResetPassword />} />`

### 5. Traducoes (i18n)
Novas chaves PT/EN:
- `auth.forgot_password` / "Esqueci minha senha" / "Forgot password?"
- `auth.forgot_title` / "Recuperar Senha" / "Reset Password"
- `auth.forgot_desc` / "Informe seu email para receber o link" / "Enter your email to receive a reset link"
- `auth.send_reset` / "Enviar link" / "Send reset link"
- `auth.reset_sent` / "Email enviado!" / "Email sent!"
- `auth.reset_sent_desc` / "Verifique sua caixa de entrada" / "Check your inbox"
- `auth.back_to_login` / "Voltar ao login" / "Back to login"
- `auth.new_password` / "Nova senha" / "New password"
- `auth.confirm_password` / "Confirmar senha" / "Confirm password"
- `auth.passwords_no_match` / "As senhas nao coincidem" / "Passwords don't match"
- `auth.reset_success` / "Senha atualizada!" / "Password updated!"
- `auth.reset_button` / "Redefinir senha" / "Reset password"

---

## Detalhes Tecnicos

- O fluxo usa `supabase.auth.resetPasswordForEmail` que envia o email automaticamente pelo sistema de autenticacao
- A pagina `/reset-password` precisa verificar o hash da URL para confirmar que e um fluxo de recovery valido
- Nenhuma mudanca no banco de dados e necessaria
- A pagina de reset usa o mesmo layout visual da pagina de Auth (header com logo, card centralizado)
