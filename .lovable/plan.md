
Objetivo: tratar isso como falha crítica de autenticação e atacar todas as camadas envolvidas no login desktop, não só o formulário.

Diagnóstico já encontrado:
- O backend de autenticação não parece estar “fora do ar”: há registro recente de `POST /token` com status `200` no domínio publicado para `carolpetisco@gmail.com`.
- Isso indica que pelo menos parte do problema está no cliente: persistência de sessão, redirecionamento prematuro, PWA/service worker, ou corrida entre login e navegação.
- Hoje o app tem 2 pontos frágeis para esse cenário:
  1. `Auth.tsx` navega para `/dashboard` imediatamente após `signIn`, sem esperar a sessão ficar estável.
  2. `main.tsx`, `PwaUpdateGuard.tsx` e `versionChecker.ts` fazem limpeza/reload agressivos fora de rotas críticas, e `/auth`/`/dashboard` não estão protegidas disso.

Plano de correção:
1. Blindar o fluxo de login
- Ajustar `AuthContext.tsx` para o login retornar também o estado real da sessão após `signIn`.
- Após autenticar, confirmar a sessão com `getSession()`/evento `SIGNED_IN` antes de considerar o login concluído.
- Tratar explicitamente o caso “backend aceitou, mas a sessão ainda não hidratou no React”.

2. Remover a corrida entre login e redirecionamento
- Em `Auth.tsx`, parar de fazer `navigate(redirectTo)` logo após `signIn`.
- Deixar o redirecionamento acontecer apenas quando `user/session` já estiverem confirmados pelo `AuthProvider`.
- Adicionar estado de “entrando...” para evitar clique duplo e navegação antes da hidratação.

3. Parar interferências do PWA na autenticação
- Em `main.tsx`, `PwaUpdateGuard.tsx` e `versionChecker.ts`, bloquear reload/ativação de nova versão nas rotas:
  - `/auth`
  - `/dashboard`
  - `/reset-password`
  - possivelmente `/conta`
- Evitar que service worker/cache reset aconteça no meio do login ou imediatamente depois.

4. Fortalecer a recuperação de erro de rede
- Em `AuthContext.tsx`, revisar a lógica de recovery para limpar também estado parcial de autenticação quando houver falha de transporte.
- Garantir que retry não deixe o app num estado “meio logado / meio deslogado”.

5. Evitar falso “deslogado” após login bem-sucedido
- Em `Dashboard.tsx`, segurar o redirect para `/auth` até o auth estar realmente resolvido.
- Revisar guards que hoje dependem só de `user` e podem disparar cedo demais.
- Se necessário, adicionar uma fase intermediária de hidratação da sessão antes de qualquer redirect.

6. Revisão completa de pontos relacionados
- Conferir também `Header.tsx`, `Gateway.tsx`, `GlobalMobileMenu.tsx` e página `/conta` para garantir leitura consistente de sessão.
- Padronizar o comportamento pós-login e pós-logout para não haver telas que pareçam “sem login” enquanto a sessão ainda está sendo restaurada.

Validação que vou fazer após implementar:
- Login com email/senha no preview
- Login com email/senha no domínio publicado
- Login seguido de redirecionamento para `/dashboard`
- Navegar para home, voltar ao painel e verificar que a sessão permanece
- Testar conta owner e conta secretária
- Testar desktop e mobile
- Verificar se não há reload inesperado do app durante login
- Revisar regressões em logout, reset de senha e Google login

Arquivos mais prováveis de ajuste:
- `src/contexts/AuthContext.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Dashboard.tsx`
- `src/main.tsx`
- `src/components/PwaUpdateGuard.tsx`
- `src/lib/versionChecker.ts`

Resultado esperado:
- Login deixa de falhar/intermitir no desktop
- Sessão permanece estável após autenticação
- O app não aparenta “perder o login”
- Preview e ambiente publicado passam a ter comportamento consistente
