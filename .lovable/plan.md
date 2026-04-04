

# Correção Definitiva: PWA Não Deve Ativar SW Novo em Rotas Inseguras

## Causa raiz

O problema **não é apenas o reload** — é o `SKIP_WAITING`. Hoje o código em `main.tsx` envia `postMessage({ type: "SKIP_WAITING" })` **imediatamente** quando um novo service worker é instalado (linhas 30 e 37). Isso força o novo SW a assumir o controle, disparando `controllerchange`. Mesmo que o `PwaUpdateGuard` adie o `reload()`, o novo SW já está ativo e servindo assets da nova versão, o que pode causar:

- Erros de módulo (imports que mudaram entre versões)
- Chunks inexistentes (hash diferente)
- Comportamento inconsistente sem reload visível

**A solução correta**: adiar o `SKIP_WAITING` até que o usuário esteja numa rota segura. O novo SW fica em estado `waiting` sem interferir até ser seguro ativá-lo.

## Plano

### 1. `src/main.tsx` — Não enviar SKIP_WAITING automaticamente

- Remover os dois `postMessage({ type: "SKIP_WAITING" })` (linhas 30 e 37)
- Em vez disso, quando detectar um SW waiting/installed, apenas setar `window.__pwaUpdatePending = true` e disparar o evento `pwa-update-ready`
- Guardar referência ao registration globalmente: `window.__pwaRegistration = registration`
- **Não** fazer nada no `controllerchange` além de reload (que agora só será chamado após SKIP_WAITING controlado)

### 2. `src/components/PwaUpdateGuard.tsx` — Controlar SKIP_WAITING + reload

- Quando detectar update pendente **E** rota segura:
  1. Enviar `SKIP_WAITING` ao SW waiting via `window.__pwaRegistration?.waiting?.postMessage({ type: "SKIP_WAITING" })`
  2. O `controllerchange` fará o reload
- Manter a lógica de adiamento: se rota insegura, não faz nada até navegar para rota segura

### 3. `src/main.tsx` — Simplificar `controllerchange`

- No `controllerchange`, simplesmente fazer reload direto (já estamos garantidos numa rota segura porque o SKIP_WAITING só foi enviado pelo guard)
- Manter o flag `refreshing` para evitar reload duplo

### Fluxo corrigido

```text
Nova versão detectada (SW installed)
  → Setar flag __pwaUpdatePending = true
  → Disparar evento "pwa-update-ready"
  → NÃO enviar SKIP_WAITING

Usuário navega para rota segura (ou já está numa)
  → PwaUpdateGuard detecta flag + rota segura
  → Envia SKIP_WAITING ao SW waiting
  → controllerchange dispara
  → Reload imediato
```

## Arquivos a alterar

1. **`src/main.tsx`** — remover SKIP_WAITING automático, expor registration globalmente, simplificar controllerchange
2. **`src/components/PwaUpdateGuard.tsx`** — assumir responsabilidade de enviar SKIP_WAITING quando seguro

