## Contexto

Hoje o app **não tem nenhum mecanismo de atualização automática**:

- `PwaUpdateGuard.tsx` → no-op
- `versionChecker.ts` → no-op
- `main.tsx` → desregistra **qualquer** Service Worker que não seja `/sw-push.js`
- `sw-push.js` → só lida com push, **não faz cache nem fetch**
- Não há `manifest.json` standalone nem SW de atualização

Então quando o usuário abre o atalho na tela inicial, o navegador serve o HTML pelo cache HTTP padrão. Sem SW de atualização e sem cache-busting, o iOS/Android pode segurar o `index.html` por horas/dias antes de reconsultar o servidor → versão desatualizada e nenhum aviso de "atualizando".

A regra inegociável (`mem://constraints/auth-stability`): **nenhum SW pode interceptar requests de auth do Supabase**. A tentativa anterior de PWA com Workbox quebrou login no desktop justamente por interceptar `fetch`.

&nbsp;

Lembre tb que ha paginas onde nao pode acontecer a atualização automatica pois perde o fluxo em curso. Tal como durante avaliação basica ou premium em andamento e no andamento tb de fluxos de compras/ stripe.  O ideal é atualizar no dashboard, landing pages , e outras paginas seguras

## Abordagem proposta — "Version Poll sem Service Worker"

Em vez de reintroduzir um SW que intercepta `fetch` (risco de quebrar auth de novo), faço a verificação **100% no lado do cliente, em JS comum**, sem tocar em SW, sem `caches.match()`, sem interceptar nada.

### Como funciona

1. `**plugins/versionPlugin.ts` já existe e gera `/version.json**` com hash de build a cada deploy. Vou reaproveitar.
2. **Novo `src/lib/versionChecker.ts` (substitui o no-op atual):**
  - Faz `fetch('/version.json?t=Date.now()', { cache: 'no-store' })` em momentos seguros:
    - Ao montar o App
    - Quando a aba volta a ficar visível (`visibilitychange`)
    - Quando a janela ganha foco (`focus`) — crucial para PWA mobile, pois é quando o usuário reabre o atalho
    - A cada 15 minutos enquanto a aba está ativa
  - Compara `remoteHash` com `import.meta.env.VITE_BUILD_HASH` (já injetado pelo plugin existente).
  - Se diferente → mostra um **toast persistente** com botão "Atualizar agora".
  - Ao clicar → `window.location.replace(pathname + '?v=' + hash)` (cache-bust por query string, sem mexer em SW nem em `caches`).
3. **Salvaguardas críticas para não repetir o incidente de auth:**
  - **Nunca** registrar SW novo nem mexer no `sw-push.js`.
  - **Nunca** chamar `caches.delete()` automaticamente — só sob clique explícito do usuário no botão "Atualizar".
  - **Nunca** chamar `localStorage.removeItem` em chaves `sb-*` automaticamente.
  - **Nunca** fazer `window.location.reload()` automático sem ação do usuário (evita reload no meio de um login em curso).
  - O fetch de `/version.json` é uma chamada GET para um arquivo estático na **mesma origem** — não toca em `*.supabase.co`, então não pode interferir com auth.
  - Adicionar guarda: se `window.location.pathname` estiver em `/auth`, `/reset-password`, `/accept-invite`, ou se houver flag de "login em andamento" → **não exibir** o toast; apenas marcar para mostrar depois.
4. **Manifest leve para o atalho mobile (opcional, mas recomendado):**
  - Adicionar `<meta http-equiv="Cache-Control" content="no-cache">` em `index.html` para o HTML em si (não afeta assets com hash).
  - Isso faz o iOS/Android revalidar o `index.html` mais rápido ao abrir o atalho — o resto (JS/CSS) já tem hash no nome via Vite.
5. **Wire-up:** `App.tsx` chama `startVersionChecker()` uma vez no mount.

### O que NÃO vou fazer (lições do incidente anterior)

- ❌ Não vou reintroduzir `vite-plugin-pwa` / Workbox.
- ❌ Não vou criar SW que faz `addEventListener('fetch', ...)`.
- ❌ Não vou tocar em `main.tsx`, `AuthContext.tsx`, `client.ts` ou `sw-push.js`.
- ❌ Não vou limpar caches/localStorage automaticamente.
- ❌ Reload só acontece sob clique do usuário.

## Arquivos a alterar


| Arquivo                            | Mudança                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| `src/lib/versionChecker.ts`        | Implementar polling + toast (substitui no-op)            |
| `src/App.tsx`                      | Chamar `startVersionChecker()` no mount                  |
| `index.html`                       | Adicionar meta `Cache-Control: no-cache` para o HTML     |
| `mem://constraints/auth-stability` | Adicionar nota documentando esta abordagem como aprovada |


**Não tocar:** `main.tsx`, `AuthContext.tsx`, `supabase/client.ts`, `sw-push.js`, `PwaUpdateGuard.tsx`.

## Resultado esperado

- Ao publicar: em até ~15 min (ou imediatamente ao reabrir o atalho), o usuário vê toast **"Nova versão disponível — Atualizar"**.
- Clique → reload limpo com `?v=hash` → carrega a nova versão.
- Login continua intacto: zero interceptação de requests, zero limpeza automática de storage.