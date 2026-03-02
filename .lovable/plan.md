# Aprovacao Admin para Profissionais

## Resumo

Adicionar campo `approved` (boolean, default false) na tabela `professionals`. Profissionais so aparecem na busca apos aprovacao do admin. O admin gerencia aprovacoes na pagina `/admin`. alem disso, no futuro, so terá acesso a essa lista de profissionais quem pagar por avaliação premium. ou seja, futuramente nao vai bastar se cadastrar  para ter acesso a listagem dos profissionais pelo painel do usuario. quero que coloque já um comando aguardando ter essa ordem ativada pelo admin.  obs importantissima: preencher crefito é obrigatório para cadastro. 

---

## 1. Banco de Dados

Migracao SQL:

- Adicionar coluna `approved boolean NOT NULL DEFAULT false` na tabela `professionals`
- Atualizar a policy de SELECT para exigir `approved = true` (alem de `active = true`) para usuarios normais
- Criar nova policy permitindo que admins (VIP users) vejam TODOS os profissionais (incluindo nao aprovados)
- Criar security definer function `is_admin()` que verifica se o usuario esta na tabela `vip_users`

```text
professionals.approved = false  -->  Nao aparece na busca publica
professionals.approved = true   -->  Visivel para pacientes
Admin (VIP user)                -->  Ve todos os profissionais
```

## 2. Pagina de Registro do Profissional

Atualizar `ProfessionalRegister.tsx`:

- Apos salvar, mostrar mensagem informando que o cadastro foi enviado para aprovacao
- Se ja cadastrado e `approved = false`, mostrar badge "Aguardando aprovacao"
- Se `approved = true`, mostrar badge "Aprovado"

## 3. Pagina Admin - Gestao de Profissionais

Atualizar `Admin.tsx` para incluir nova secao:

- Listar profissionais pendentes de aprovacao (`approved = false`)
- Listar profissionais aprovados
- Botoes para aprovar/rejeitar (toggle `approved`)
- Mostrar nome, CREFITO, cidade/estado, especialidades de cada profissional
- Usar a edge function `manage-vip-users` como referencia de pattern, mas acessar diretamente via Supabase client (admin ja eh VIP)

## 4. Dashboard do Profissional

Atualizar `Dashboard.tsx`:

- Na secao do profissional, mostrar status de aprovacao
- Se `approved = false`: banner amarelo "Seu perfil esta em analise. Voce sera notificado quando for aprovado."
- Se `approved = true`: badge verde "Perfil ativo"

## 5. Traducoes (i18n)

Novas chaves PT/EN:

- `prof.pending_approval` / "Aguardando aprovacao" / "Pending approval"
- `prof.approved` / "Aprovado" / "Approved"  
- `prof.submitted_for_review` / "Cadastro enviado para analise!" / "Registration submitted for review!"
- `prof.profile_under_review` / "Seu perfil esta em analise..." / "Your profile is under review..."
- `admin.professionals_title` / "Gestao de Profissionais" / "Professional Management"
- `admin.approve` / "Aprovar" / "Approve"
- `admin.revoke` / "Revogar" / "Revoke"
- `admin.pending` / "Pendentes" / "Pending"
- `admin.approved_list` / "Aprovados" / "Approved"

---

## Arquivos Modificados


| Arquivo                              | Acao                                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| `supabase/migrations/`               | Coluna `approved`, policies atualizadas, funcao `is_admin()` |
| `src/pages/ProfessionalRegister.tsx` | Feedback de status pos-cadastro                              |
| `src/pages/Admin.tsx`                | Nova secao de gestao de profissionais                        |
| `src/pages/Dashboard.tsx`            | Banner de status de aprovacao                                |
| `src/contexts/LanguageContext.tsx`   | Novas traducoes                                              |
