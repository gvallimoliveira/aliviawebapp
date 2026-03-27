

## Corrigir atualização automática do PWA (app na tela de início)

### Problema

O `registerType: "autoUpdate"` está configurado no Vite, mas o `vite-plugin-pwa` com essa opção precisa que o service worker seja **registrado explicitamente** no código da aplicação para que o ciclo de atualização funcione. Sem isso, o service worker antigo fica em cache indefinidamente e o app instalado na tela de início nunca busca a versão nova.

### Solução

Duas alterações:

**1. `src/main.tsx` — Registrar o service worker com lógica de auto-update**

Adicionar o registro do `registerSW` do `vite-plugin-pwa/virtual` que:
- Detecta quando há uma nova versão disponível
- Aplica a atualização automaticamente
- Força reload quando o novo service worker assume o controle
- Inclui intervalo de verificação periódica (a cada 60 segundos) para que ao reabrir o app, ele busque atualizações rapidamente
- Inclui guard para não registrar em iframes ou no preview do Lovable

**2. `vite.config.ts` — Adicionar `skipWaiting` e `clientsClaim`**

Configurar o Workbox para:
- `skipWaiting: true` — o novo service worker assume imediatamente sem esperar que o usuário feche todas as abas
- `clientsClaim: true` — o novo service worker toma controle de todas as páginas abertas imediatamente
- `devOptions: { enabled: false }` — desabilitar no desenvolvimento para não interferir no preview

### Resultado esperado

Quando você publicar uma atualização e o usuário reabrir o app na tela de início, o service worker vai detectar a nova versão em até 60 segundos, baixar os novos assets e recarregar automaticamente — comportamento idêntico ao navegador normal.

### Detalhes técnicos

Arquivos modificados:
- `vite.config.ts` — adicionar `skipWaiting`, `clientsClaim`, `devOptions`
- `src/main.tsx` — adicionar registro do SW com `registerSW({ immediate: true, onRegisteredSW })` e intervalo de polling de 60s

