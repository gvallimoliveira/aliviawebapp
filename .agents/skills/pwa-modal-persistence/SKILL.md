# Persistência de Modal / Workflow em PWA/React

## Quando usar

Sempre que um modal ou workflow longo (avaliação, formulário multi-step, checklist clínico) precisa **sobreviver** a:
- Troca de app no celular (app backgrounding)
- Tela bloqueando
- SO matando a aba/PWA por falta de memória
- Reload acidental da página
- Usuário usando outro app em paralelo (ex: medidor de ADM, câmera)

## Conceito-chave: 3 camadas de defesa

| Camada | Responsabilidade | Tecnologia |
|--------|------------------|------------|
| **1. Rascunho** | Salvar dados do formulário | `useAutosaveDraft` (localStorage + Supabase) |
| **2. Sessão** | Marcar que há um modal ativo | `localStorage` (TTL 12h) |
| **3. Resumer** | Reabrir o modal automaticamente no boot | Componente global + polling + eventos |

---

## Implementação

### Passo 1 — Utilitário de Sessão (`sessionPersistence.ts`)

```typescript
const KEY = "app:workflow:session";
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

export interface WorkflowSession {
  professionalId: string;
  clinicId?: string | null;
  patientName: string;
  patientEmail?: string | null;
  editAssessmentId?: string | null;
  userId?: string | null;
  openedAt: number;
}

export const saveWorkflowSession = (session: WorkflowSession) => {
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* quota */ }
};

export const getWorkflowSession = (): WorkflowSession | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkflowSession;
    if (!parsed?.professionalId || !parsed?.patientName || !parsed?.openedAt) return null;
    if (Date.now() - parsed.openedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
};

export const clearWorkflowSession = () => {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
};
```

**Regras:**
- TTL longo (12h) porque o fisioterapeuta pode pausar entre atendimentos.
- Campos mínimos para reabrir o modal com contexto (quem é o paciente, qual profissional).
- `editAssessmentId` permite buscar os dados atuais no banco ao retomar (mais seguro que confiar só no rascunho).

---

### Passo 2 — Componente Resumer (`WorkflowResumer.tsx`)

Montado **uma vez** no topo da árvore (ex: `App.tsx`), fora de rotas que mudam.

```typescript
const WorkflowResumer = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [session, setSession] = useState<WorkflowSession | null>(null);
  const [open, setOpen] = useState(false);
  const tryingRef = useRef(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    let cancelled = false;

    const tryRestore = async () => {
      if (cancelled || restoredRef.current || tryingRef.current || open) return;
      const stored = getWorkflowSession();
      if (!stored) return;

      // Rotas onde NUNCA devemos interromper
      const skipPrefixes = ["/auth", "/reset-password", "/payment-success"];
      if (skipPrefixes.some(p => location.pathname.startsWith(p))) return;

      // Verifica auth
      if (loading) return;
      if (stored.userId && user?.id && stored.userId !== user.id) {
        clearWorkflowSession();
        return;
      }

      // Evita duplicar se outro host já montou o modal
      if (document.querySelector("[data-workflow-modal]")) return;

      tryingRef.current = true;
      try {
        let editData = null;
        if (stored.editAssessmentId) {
          const { data } = await supabase.from("assessments").select("*")
            .eq("id", stored.editAssessmentId).maybeSingle();
          if (data) editData = data;
        }
        if (cancelled || restoredRef.current) return;
        restoredRef.current = true;
        setSession(stored);
        setOpen(true);
        toast({ title: "Retomando...", description: `Continue com ${stored.patientName}` });
      } finally { tryingRef.current = false; }
    };

    // 1) Tentativa síncrona no mount
    void tryRestore();

    // 2) Polling agressivo nos primeiros 30s (iOS PWA é teimoso)
    const poll = setInterval(() => {
      if (restoredRef.current) { clearInterval(poll); return; }
      void tryRestore();
    }, 500);
    const stopPoll = setTimeout(() => clearInterval(poll), 30_000);

    // 3) Eventos que indicam "app voltou ao primeiro plano"
    const onVisible = () => { if (document.visibilityState === "visible") void tryRestore(); };
    const onPageShow = () => void tryRestore();
    const onFocus = () => void tryRestore();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes("workflow")) void tryRestore();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(stopPoll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [loading, user?.id, location.pathname]);

  const handleClose = () => {
    setOpen(false);
    clearWorkflowSession();
    restoredRef.current = false;
  };

  if (!open || !session) return null;
  return <YourWorkflowModal open={open} onOpenChange={handleClose} /* ...session props */ />;
};
```

**Estratégia brute-force para iOS PWA:**
- Tenta no mount.
- Re-tenta a cada mudança de auth/rota.
- Polling de 500ms nos primeiros 30s.
- Escuta `visibilitychange`, `pageshow`, `focus`, `storage`.
- Qualquer gatilho abre o modal se houver sessão válida.

---

### Passo 3 — Dentro do Modal (`YourWorkflowModal.tsx`)

#### 3a. Persistir sessão em TODOS os eventos de saída

```typescript
useEffect(() => {
  if (!open || demoMode) return;
  const refresh = () => saveWorkflowSession({
    professionalId, clinicId: clinicId ?? null, patientName,
    patientEmail: patientEmail ?? null,
    editAssessmentId: editAssessment?.id ?? null,
    userId: user?.id ?? null, openedAt: Date.now(),
  });
  // Eventos que iOS/Android disparam ao background/kill:
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("pagehide", refresh);
  window.addEventListener("beforeunload", refresh);
  window.addEventListener("blur", refresh);
  document.addEventListener("freeze", refresh); // iOS critical
  return () => {
    document.removeEventListener("visibilitychange", refresh);
    window.removeEventListener("pagehide", refresh);
    window.removeEventListener("beforeunload", refresh);
    window.removeEventListener("blur", refresh);
    document.removeEventListener("freeze", refresh);
  };
}, [open, professionalId, clinicId, patientName, patientEmail, editAssessment?.id, user?.id]);
```

**Nota:** `freeze` é disparado pelo iOS Safari antes de descarregar a aba — última chance de gravar o marcador.

#### 3b. Wake Lock (evita tela bloqueando)

```typescript
useEffect(() => {
  if (!open || demoMode) return;
  let wakeLock: any = null;
  let cancelled = false;
  const request = async () => {
    try {
      const wl = (navigator as any).wakeLock;
      if (!wl?.request) return;
      wakeLock = await wl.request("screen");
      if (cancelled && wakeLock) {
        try { await wakeLock.release(); } catch { } wakeLock = null;
      }
    } catch { /* noop */ }
  };
  void request();
  const onVisible = () => {
    if (document.visibilityState === "visible" && !wakeLock) void request();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    cancelled = true;
    document.removeEventListener("visibilitychange", onVisible);
    if (wakeLock) { try { wakeLock.release(); } catch { } }
  };
}, [open, demoMode]);
```

#### 3c. Confirmação ao sair (anti-close acidental)

```typescript
const [confirmExitOpen, setConfirmExitOpen] = useState(false);

// No Dialog:
<Dialog
  open={open}
  onOpenChange={(o) => { if (!o) requestClose(); }}
  onEscapeKeyDown={(e) => { e.preventDefault(); requestClose(); }}
  onPointerDownOutside={(e) => { e.preventDefault(); requestClose(); }}
>

const requestClose = () => {
  if (demoMode) { onOpenChange(false); return; }
  setConfirmExitOpen(true);
};

// AlertDialog de confirmação:
<AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
      <AlertDialogDescription>Seus dados estão salvos em rascunho, mas ...</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setConfirmExitOpen(false)}>Continuar avaliação</AlertDialogCancel>
      <AlertDialogAction onClick={() => { setConfirmExitOpen(false); onOpenChange(false); }}>Sair</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### 3d. Autosave agressivo

```typescript
const draft = useAutosaveDraft({
  formKey: "workflow_draft",
  scopeKey: open && !isEditing ? `${professionalId}:${patientEmail}` : null,
  state: { /* todos os campos do formulário */ },
  enabled: open && !isEditing && !demoMode,
  debounceMs: 300, // ~300ms — suficiente para sobreviver app switch
});
```

---

### Passo 4 — Integração no App

```tsx
// App.tsx
import WorkflowResumer from "@/components/WorkflowResumer";

function App() {
  return (
    <BrowserRouter>
      {/* ...providers... */}
      <WorkflowResumer />
      <Routes>{/* ... */}</Routes>
    </BrowserRouter>
  );
}
```

---

## Checklist de validação

- [ ] Modal reabre automaticamente após tela bloquear e desbloquear
- [ ] Modal reabre após trocar de app e voltar (iOS Safari PWA)
- [ ] Modal reabre após reload forçado da página (F5 / pull-to-refresh)
- [ ] Não reabre em rotas proibidas (auth, pagamento, etc.)
- [ ] Não duplica modal se usuário clicou no botão de avaliação no exato momento do boot
- [ ] Wake Lock ativo enquanto modal está aberto (tela não apaga)
- [ ] Confirmação de saída aparece ao clicar fora, ESC, ou botão de fechar
- [ ] Autosave < 500ms de debounce
- [ ] TTL da sessão > 8h (cobre pausa entre turnos)

---

## Armadilhas comuns

1. **iOS PWA freeze**: O evento `freeze` é a ÚNICA chance de gravar antes do SO matar. Não omita.
2. **React Strict Mode**: useRef (`restoredRef`, `tryingRef`) protege contra duplo-mount.
3. **Auth atrasado**: No Resumer, espere `loading === false` antes de comparar `user.id`.
4. **Duplicação**: Sempre verifique `document.querySelector("[data-modal]")` antes de montar.
5. **Polling**: 500ms por 30s parece exagerado, mas iOS PWA precisa. Pode reduzir para 10s em Android/desktop.

---

## Variantes

- **TTL mais curto**: Use 2h para formulários rápidos (checkout, cadastro).
- **Sem Wake Lock**: Remova se o workflow não exige tela sempre ligada.
- **Múltiplos workflows**: Use chaves de localStorage separadas (`app:workflow:A`, `app:workflow:B`) e Resumers separados, ou uma fila de sessões.
