
Objetivo: corrigir de forma estrutural o login no desktop, hoje quebrado por “NetworkError when attempting to fetch resource”, sem comprometer os links institucionais nem o restante do dashboard.

Diagnóstico mais provável
- O problema não parece ser credencial nem backend de autenticação, porque no mobile funciona.
- O ponto mais suspeito é a camada de PWA/cache/update adicionada hoje:
  - `vite.config.ts` registra um Service Worker global via `vite-plugin-pwa`.
  - `src/main.tsx` faz registro/atualização agressiva do SW.
  - `src/lib/versionChecker.ts` também força limpeza de cache, unregister e reload.
  - `src/components/PwaUpdateGuard.tsx` tenta ativar atualização e recarregar a app.
  - `src/pages/ClearCache.tsx` limpa caches, mas preserva `localStorage`, então um estado de auth corrompido pode sobreviver.
- Hoje existem duas responsabilidades misturadas: PWA/offline e push notifications. Isso aumenta muito o risco de o SW interferir no fluxo de auth, especialmente no desktop.

Plano de correção
1. Remover a interferência do PWA no login
- Desabilitar o Service Worker global da aplicação para navegação/cache da app.
- Manter apenas o manifesto de installability, se desejado, sem cache offline global.
- Remover o bootstrap de SW global em `src/main.tsx`.
- Remover a lógica de atualização forçada em `src/lib/versionChecker.ts`.
- Remover `PwaUpdateGuard` do fluxo principal em `src/App.tsx`.
- Limpar estados visuais de “update pending” em `Header` e `GlobalMobileMenu`.

2. Preservar push notifications sem quebrar auth
- Migrar push para um Service Worker dedicado e mínimo, registrado só quando o usuário realmente ativa notificações.
- Ajustar `src/hooks/usePushNotifications.ts` para registrar esse worker sob demanda, em vez de depender do SW global da app.
- Assim, notificações continuam possíveis, mas sem interceptar login/navegação.

3. Endurecer o fluxo de autenticação
- Ajustar `AuthContext` para tratar erro de rede com recuperação mais segura:
  - limpar apenas chaves locais de sessão/auth quando houver falha persistente de fetch;
  - refazer `getSession()` após falha;
  - evitar que estado antigo de sessão fique “preso”.
- Manter o retry simples, mas com fallback específico para auth storage corrompido, não com limpeza ampla de navegador.

4. Corrigir a página utilitária de limpeza
- Em `ClearCache.tsx`, passar a limpar também apenas as chaves locais de autenticação do app, não o `localStorage` inteiro.
- Isso vira um fallback real para auth quebrado, sem destruir outras preferências do usuário.

5. Validar o comportamento em todos os cenários críticos
- Preview no editor.
- Domínio publicado.
- Desktop normal.
- Desktop anônimo.
- Login por e-mail/senha.
- Login por Google.
- Logout e novo login.
- Reset de senha.

Arquivos que precisam ser alterados
- `vite.config.ts`
- `src/main.tsx`
- `src/lib/versionChecker.ts`
- `src/components/PwaUpdateGuard.tsx`
- `src/App.tsx`
- `src/components/Header.tsx`
- `src/components/GlobalMobileMenu.tsx`
- `src/hooks/usePushNotifications.ts`
- `src/contexts/AuthContext.tsx`
- `src/pages/ClearCache.tsx`

Resultado esperado
- O login para de depender de uma camada de cache/SW agressiva.
- Desktop e mobile passam a usar o mesmo caminho de autenticação estável.
- Push notifications continuam possíveis, mas desacopladas da navegação/autenticação.
- O preview deixa de sofrer com efeitos colaterais de PWA.

Detalhe técnico importante
- Eu não seguiria tentando “mais um ajuste” no SW atual.
- A estratégia certa aqui é simplificar: tirar o SW global da frente do auth e deixar notificações em um worker isolado.
- Isso é coerente com o que o próprio projeto já indica: a camada de PWA/cache foi a principal mudança de risco recente.

Quando você aprovar, eu implemento essa limpeza estrutural e deixo o login estável no desktop primeiro; depois valido se as notificações continuam operando pelo worker dedicado.
