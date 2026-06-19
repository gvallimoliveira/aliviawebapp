## Objetivo

Garantir que o modal de **Avaliação Manual** nunca seja perdido quando o usuário:
- bloqueia a tela do celular,
- abre outro app em paralelo (goniômetro, dinamômetro, calculadora etc.),
- sofre um reload forçado da PWA pelo sistema operacional.

O modal só fecha quando o usuário **finaliza** a avaliação ou **explicitamente** decide sair.

## Comportamento esperado

1. Enquanto o modal estiver aberto:
   - **ESC** e **clique fora** deixam de fechar o modal (já existe parcial p/ FAB de voz — vamos estender).
   - O botão **X** do canto passa a pedir confirmação: *"Sair da avaliação? Seus dados ficam salvos como rascunho."* (`Continuar editando` / `Sair`).
   - (Opcional, best-effort) ativar **Screen Wake Lock API** enquanto o modal está visível, para reduzir bloqueio automático de tela durante medições.

2. Ao abrir o modal, é gravado um **marcador de sessão** em `localStorage` (`alivia:manual-assessment:session`) contendo: `professionalId`, `clinicId`, `patientName`, `patientEmail`, `editAssessmentId` (se edição), `openedAt`. Atualizado também em `visibilitychange` / `pagehide` (o autosave de rascunho já existe e continua intacto).

3. Ao iniciar o app (após login, dentro de `AuthProvider`), um novo componente **`ManualAssessmentResumer`** detecta o marcador e:
   - reabre o modal automaticamente com o mesmo `patientName/Email/professionalId/clinicId`;
   - se `editAssessmentId` existir, busca a avaliação no Supabase e injeta como `editAssessment`;
   - o `useAutosaveDraft` existente repõe o estado do formulário a partir do rascunho local + nuvem (`scopeKey` permanece o mesmo).
   - Mostra um toast curto: *"Retomando sua avaliação manual…"*.

4. O marcador é **removido** quando:
   - usuário confirma "Sair" no modal,
   - a avaliação é finalizada/salva com sucesso,
   - usuário descarta o rascunho na barra de retomada.

5. Cenários **não** afetados (continuam como hoje):
   - Botões "Nova avaliação manual" no prontuário, lista de pacientes ou bottom menu: continuam abrindo do zero / oferecendo retomada via banner atual.
   - Reload manual com `Ctrl+R` no desktop e fluxo de logout.

## Mudanças técnicas

**Novo arquivo** `src/lib/manualAssessmentSession.ts`
- `saveSession(meta)`, `getSession()`, `clearSession()` — wrapper fino sobre `localStorage` com TTL de 12h.

**`src/components/dashboard/ManualAssessmentModal.tsx`**
- `useEffect`: `saveSession(...)` quando `open === true`; `clearSession()` quando `open === false` **e** a saída foi confirmada (sucesso do save ou confirmação do usuário).
- `<Dialog>`: adicionar `onEscapeKeyDown={(e) => e.preventDefault()}` e expandir o `onPointerDownOutside` / `onInteractOutside` para sempre `preventDefault()` (já há a exceção do FAB — viramos a regra: nada fora do botão X fecha).
- Novo `ConfirmExitDialog` interno acionado pelo X (custom close button substitui o `DialogClose` padrão do shadcn).
- Hook `useScreenWakeLock(open)` (novo, opcional, com try/catch — silencioso se o navegador não suportar).
- No `handleSave` final / `onSaved`: `clearSession()`.

**Novo arquivo** `src/components/dashboard/ManualAssessmentResumer.tsx`
- Montado uma única vez via `App.tsx` dentro de `<AuthProvider>` (e antes do `<BrowserRouter>` não é necessário — pode ficar dentro).
- Lê `getSession()`; se válida e usuário autenticado, carrega `editAssessment` (se ID) e renderiza `<ManualAssessmentModal open ... />`. Fecha → `clearSession()`.
- Mostra `toast` curto na primeira montagem com sessão ativa.

**`src/App.tsx`**
- Adicionar `<ManualAssessmentResumer />` ao lado de `<RealtimeNotifier />`.

**Sem mudanças** em: `useAutosaveDraft`, edge functions, schema do banco, `sessionPersistence` (rota), service workers.

## Riscos & mitigação

- **Reabrir sobre outra tela em uso (ex.: usuário foi para Conta):** aceitável — usuário pediu explicitamente persistência "a qualquer custo". O modal já é fullscreen-like e tem o botão Sair com confirmação.
- **Marcador "preso" após bug:** TTL de 12h + botão "Sair" sempre limpa. Também limpamos em `onSaved`.
- **Wake Lock negado pelo navegador:** ignorado silenciosamente.
- **Modal duplicado** (Resumer + pai já abrindo): Resumer checa se já existe `[data-manual-assessment-modal]` no DOM antes de montar.
