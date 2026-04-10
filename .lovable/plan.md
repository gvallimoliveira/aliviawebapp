# Plano: Aliv.ia Clinic

## Resumo

Criar um terceiro nicho de produto (Aliv.ia Clinic) para clínicas e consultórios com equipe de profissionais e secretária, incluindo hierarquia de permissoes, landing page dedicada, precificacao por faixas e coexistencia com contas individuais.

---

## Arquitetura de Dados

### Novas tabelas

`**clinics**` -- Representa a clinica/consultorio

- `id`, `name`, `owner_user_id`, `subscription_status`, `subscription_stripe_id`, `logo_url`, `phone`, `address`, `created_at`

`**clinic_members**` -- Vincula usuarios a uma clinica com papel

- `id`, `clinic_id` (FK clinics), `user_id`, `role` (enum: `owner`, `therapist`, `secretary`), `invited_by`, `invited_at`, `accepted_at`, `status` (pending/active/removed)

`**clinic_invitations**` -- Convites pendentes por email

- `id`, `clinic_id`, `email`, `role`, `invited_by`, `token`, `expires_at`, `created_at`

### Regras de negocio no banco

- Enum `clinic_role` com valores `owner`, `therapist`, `secretary`
- Funcao `get_clinic_role(user_id, clinic_id)` SECURITY DEFINER para uso em RLS
- RLS em `clinic_members`: membros veem sua propria clinica; owner e secretary gerenciam membros
- Avaliações da clinica: um `clinic_id` sera adicionado a tabela `assessments` e `professional_appointments` para que todos os membros vejam os mesmos pacientes
- Link de avaliacao compartilhado: assessments criados com `clinic_id` sao visiveis para todos os membros. O owner tera tambem um link pessoal (sem `clinic_id`, apenas `professional_id`)

### Matriz de permissoes

```text
Funcionalidade          | Owner  | Therapist | Secretary
------------------------|--------|-----------|----------
Agenda - visualizar     |   ✓    |     ✓     |    ✓
Agenda - editar         |   ✓    |     ✗     |    ✓
Avaliacoes - visualizar |   ✓    |     ✓     |    ✓
Avaliacoes - editar     |   ✓    |     ✓     |    ✗
Emitir PDFs             |   ✓    |     ✓     |    ✓
Chat com pacientes      |   ✓    |     ✓     |    ✓
Videochamada            |   ✓    |     ✓     |    ✓
Gerenciar equipe        |   ✓    |     ✗     |    ✓
Painel "Minha Saude"    |   ✗    |     ✗     |    ✗
```

---

## Precificacao por Faixas

Tres faixas a definir (valores sugeridos, voce confirma):

- **Ate 3 membros**: R$ 197/mes
- **4 a 8 membros**: R$ 347/mes
- **9+ membros**: R$ 497/mes

Cada faixa sera um produto/preco separado no Stripe. O sistema verificara a quantidade de membros ativos e bloqueara novos convites se o limite da faixa for atingido (com sugestao de upgrade).

---

## Frontend

### 1. Gateway (pagina inicial)

- Novo card centralizado abaixo dos dois cards existentes: "Quero o Aliv.ia na minha clinica" com icone Building2, direcionando para `/clinica`

### 2. Landing Page `/clinica`

- Pagina de vendas completa com argumentos: avaliacao remota, triagem, anamnese, testes funcionais, relatorios, HEP, chat, videochamada, agenda multi-profissional
- Comparativo visual das faixas de preco
- CTA para registro/compra

### 3. Dashboard Clinic

- Reutiliza o `Dashboard.tsx` existente com adaptacoes:
  - Sem aba "Minha Saude" -- apenas paineis profissionais
  - Header mostra nome/logo da clinica
  - Aba "Equipe" para owner/secretary gerenciarem membros (convidar por email, remover, alterar papel)
  - Agenda e listagem de pacientes compartilhados entre todos os membros
  - Componentes de edicao de avaliacoes desabilitados para secretary (view-only + botao PDF habilitado)

### 4. Seletor de contexto

- Ao logar, se o usuario pertence a uma clinica E tem perfil autonomo, exibir um seletor: "Acessar como Autonomo" ou "Acessar Clinica X"
- Armazenado em estado global (context) para filtrar dados corretamente

### 5. Convites

- Owner/Secretary acessam "Gerenciar Equipe" > "Convidar membro"
- Insere email + papel. Sistema envia email com link de convite
- Ao clicar no link, usuario faz login/cadastro e e vinculado automaticamente a clinica

---

## Backend (Edge Functions)

- `**create-clinic-subscription**`: Checkout Stripe para faixa selecionada
- `**check-clinic-subscription**`: Verifica status da assinatura da clinica
- `**invite-clinic-member**`: Gera convite e envia email
- `**accept-clinic-invite**`: Vincula usuario a clinica apos aceite

---

## Plano de execucao (etapas)

1. **Migracoes de banco**: criar tabelas `clinics`, `clinic_members`, `clinic_invitations`, enum, funcoes RLS, adicionar `clinic_id` em `assessments` e `professional_appointments`
2. **Produtos Stripe**: criar 3 produtos/precos para as faixas
3. **Edge Functions**: subscription, convites, verificacao
4. **Landing page** `/clinica` com marketing e checkout
5. **Gateway**: adicionar card "Clinica"
6. **Dashboard adaptado**: context de clinica, seletor de contexto, aba equipe, permissoes no frontend
7. **Convites por email**: fluxo de envio e aceite
8. **Testes e ajustes**: verificar RLS, permissoes, fluxo completo

---

## Pontos que preciso da sua confirmacao

- Os valores sugeridos por faixa (R$ 197 / R$ 347 / R$ 497) estao adequados? sim
- Devemos oferecer tambem plano anual para clinicas (com desconto similar ao Pro)? sim
- Limite maximo de membros na faixa 9+? Ou ilimitado? ilimitado