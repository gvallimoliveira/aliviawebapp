

# Restringir Auto-Reload do PWA a Páginas Seguras

## Problema
Quando o service worker detecta uma nova versão, o app recarrega automaticamente (`window.location.reload()`) independentemente da página atual. Se o usuário estiver no meio de uma avaliação ou lendo um diagnóstico, perde os dados.

## Solução
No listener `controllerchange` em `src/main.tsx`, verificar a rota atual antes de recarregar. Se estiver em uma página segura, recarregar imediatamente. Caso contrário, armazenar o flag de "pendente" e só recarregar quando o usuário navegar para uma página segura.

### Páginas seguras para reload
- `/` (Gateway)
- `/para-pacientes`
- `/profissionais`
- `/landing-legacy`
- `/dashboard` (somente a raiz)
- `/suporte`
- `/blog` (listagem)

### Páginas bloqueadas (nunca reload automático)
- `/assessment/*`
- `/assessment/view/*`
- `/payment-success`
- Qualquer outra rota não listada acima

### Implementação em `src/main.tsx`

1. Definir lista de prefixos seguros: `["/", "/para-pacientes", "/profissionais", "/landing-legacy", "/suporte", "/blog", "/dashboard"]`
2. Criar função `isSafeRoute()` que verifica se `window.location.pathname` corresponde exatamente a uma rota segura (não permite prefixos parciais como `/dashboard/xxx`)
3. No `controllerchange`:
   - Se `isSafeRoute()` → mostrar banner e recarregar (comportamento atual)
   - Se não → setar `window.__pwaUpdatePending = true` sem recarregar
4. Adicionar listener `popstate` + override de `history.pushState` para detectar navegação e, quando o usuário chegar a uma rota segura com update pendente, executar o reload

### Alternativa mais limpa (preferida)
Usar um event customizado + um componente React que escuta mudanças de rota:

1. No `controllerchange` do `main.tsx`: em vez de reload direto, disparar `window.dispatchEvent(new Event("pwa-update-ready"))` e setar flag global
2. Criar um pequeno componente `PwaUpdateGuard.tsx` montado no `App.tsx` que:
   - Escuta o evento `pwa-update-ready`
   - Usa `useLocation()` do React Router para monitorar a rota
   - Quando a rota muda para uma segura E há update pendente → mostra banner e recarrega
   - Em rotas seguras quando o evento chega → recarrega imediatamente

## Arquivos a alterar

1. **`src/main.tsx`** — remover reload direto no `controllerchange`, substituir por flag + evento customizado
2. **`src/components/PwaUpdateGuard.tsx`** — novo componente com lógica de rota segura
3. **`src/App.tsx`** — montar `PwaUpdateGuard` dentro do `BrowserRouter`

