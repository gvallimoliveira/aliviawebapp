

## Corrigir navegação do logo (não deslogar) + facilitar login persistente

### Problema identificado

1. **O logo no Header** (`onClick={() => go("/")}`) navega para `/` (Gateway). A sessão Supabase NÃO é destruída, mas a Gateway não verifica se o usuário está logado — sempre mostra "Login" e não oferece caminho de volta ao Dashboard. O usuário percebe como "deslogou".

2. **A Gateway** tem seu próprio header minimalista sem verificação de auth. Usuário logado vê a mesma tela de visitante.

3. **Persistência de sessão**: Supabase já persiste sessão via localStorage (funciona entre reloads). O problema não é perda real de sessão, é UX — o usuário não vê indicação de que está logado ao visitar `/`.

### Solução

#### 1. Header — Logo redireciona para Dashboard se logado
No `Header.tsx`, alterar o click do logo:
- Se `user` existe → navegar para `/dashboard`
- Se não → navegar para `/`

Isso evita que usuário logado "caia" na pré-landing sem contexto.

#### 2. Gateway — Detectar usuário logado e adaptar header
No `Gateway.tsx`:
- Importar `useAuth`
- Se `user` existe, trocar botão "Login" por "Dashboard" e adicionar botão "Sair"
- Opcional: mostrar nome do usuário

#### 3. Auth page — Facilidades de login
- Adicionar `autoComplete="email"` e `autoComplete="current-password"` nos inputs do formulário de login para que navegadores salvem e sugiram credenciais
- Adicionar `autoComplete="new-password"` no signup
- Adicionar `autoComplete="name"` no campo de nome

#### 4. Auth page — Redirecionar se já logado
- Se usuário já está autenticado ao acessar `/auth`, redirecionar automaticamente para `/dashboard`

### Alterações

| Ação | Arquivo |
|------|---------|
| Editar | `src/components/Header.tsx` — logo click condicional (dashboard se logado) |
| Editar | `src/pages/Gateway.tsx` — header auth-aware (Dashboard/Sair se logado) |
| Editar | `src/pages/Auth.tsx` — autoComplete nos inputs + redirect se já logado |

### Impacto nas notificações push
A sessão nunca estava sendo destruída — o token permanece no localStorage. As push subscriptions vinculadas ao `user_id` continuam funcionando. A correção é puramente de UX para evitar confusão.

