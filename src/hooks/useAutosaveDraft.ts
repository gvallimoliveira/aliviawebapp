import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useAutosaveDraft — protege formulários longos contra perda de progresso
 * por reload do app (tela bloqueada, troca de app, refresh, crash).
 *
 * Camada dupla:
 *  - localStorage (síncrono, instantâneo, offline)
 *  - tabela form_drafts (nuvem, cross-device, sobrevive a limpeza de cache)
 *
 * Uso:
 *   const draft = useAutosaveDraft({
 *     formKey: "hep",
 *     scopeKey: `${professionalId}:${patientName}`,
 *     state: { selected, customExercises, notes },
 *     enabled: open && !alreadySaved,
 *   });
 *   // draft.hasDraft, draft.draftMeta, draft.restore(), draft.discard(), draft.saving
 */

export type FormKey = "hep" | "manual_assessment" | "anamnesis";

interface UseAutosaveDraftOptions<T> {
  formKey: FormKey;
  scopeKey: string | null | undefined;
  state: T;
  enabled?: boolean;
  /** Debounce em ms antes de persistir. Default 800. */
  debounceMs?: number;
  /** Tamanho máx do payload serializado (default 200KB). Acima disso, só salva local. */
  maxPayloadBytes?: number;
  /**
   * Opcional: decide se um payload deve ser considerado "vazio". Quando
   * omitido, o hook usa o primeiro estado visto após habilitar como linha de
   * base — enquanto o estado for igual a ela, nada é gravado (nem local nem
   * na nuvem) e nenhum rascunho é oferecido. Isso evita "rascunhos fantasma"
   * criados só por abrir e fechar um modal.
   */
  isEmpty?: (state: T) => boolean;
}


interface DraftMeta {
  updatedAt: Date;
  source: "local" | "cloud";
}

interface UseAutosaveDraftResult<T> {
  hasDraft: boolean;
  draftMeta: DraftMeta | null;
  draftPayload: T | null;
  restore: () => T | null;
  discard: () => Promise<void>;
  /** Força um salvamento imediato (local + nuvem), ignorando o debounce. */
  flush: () => Promise<void>;
  saving: boolean;
  /** Última vez que algo foi salvo. Use para um pequeno "Rascunho salvo" no UI. */
  lastSavedAt: Date | null;
}

const LOCAL_PREFIX = "alivia:draft:";

const localKey = (formKey: string, scopeKey: string) =>
  `${LOCAL_PREFIX}${formKey}:${scopeKey}`;

const readLocal = <T,>(formKey: string, scopeKey: string): { payload: T; updatedAt: Date } | null => {
  try {
    const raw = localStorage.getItem(localKey(formKey, scopeKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.payload || !parsed?.updatedAt) return null;
    return { payload: parsed.payload as T, updatedAt: new Date(parsed.updatedAt) };
  } catch {
    return null;
  }
};

const writeLocal = (formKey: string, scopeKey: string, payload: unknown) => {
  try {
    localStorage.setItem(
      localKey(formKey, scopeKey),
      JSON.stringify({ payload, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* quota cheia — ignora */
  }
};

const removeLocal = (formKey: string, scopeKey: string) => {
  try {
    localStorage.removeItem(localKey(formKey, scopeKey));
  } catch {
    /* noop */
  }
};

export function useAutosaveDraft<T>({
  formKey,
  scopeKey,
  state,
  enabled = true,
  debounceMs = 800,
  maxPayloadBytes = 200 * 1024,
  isEmpty,
}: UseAutosaveDraftOptions<T>): UseAutosaveDraftResult<T> {
  const [draftPayload, setDraftPayload] = useState<T | null>(null);
  const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const lastSerializedRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string | null>(null);
  const restoredRef = useRef(false);
  // Linha de base: primeiro estado visto após habilitar. Enquanto o estado
  // atual for idêntico a ela, o formulário está "intocado".
  const baselineRef = useRef<string | null>(null);

  const isBlank = useCallback(
    (value: T, serialized?: string): boolean => {
      if (isEmpty) {
        try {
          return isEmpty(value);
        } catch {
          /* cai no fallback abaixo */
        }
      }
      const s = serialized ?? JSON.stringify(value);
      return !!baselineRef.current && s === baselineRef.current;
    },
    [isEmpty],
  );

  // Captura/limpa a linha de base conforme o formulário é habilitado.
  useEffect(() => {
    if (!enabled || !scopeKey) {
      baselineRef.current = null;
      return;
    }
    if (baselineRef.current === null) {
      try {
        baselineRef.current = JSON.stringify(state);
      } catch {
        baselineRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scopeKey]);


  // Carregar rascunho existente (local + nuvem) ao habilitar
  useEffect(() => {
    if (!enabled || !scopeKey) {
      setDraftPayload(null);
      setDraftMeta(null);
      restoredRef.current = false;
      return;
    }

    let cancelled = false;
    const load = async () => {
      const local = readLocal<T>(formKey, scopeKey);
      let best: { payload: T; updatedAt: Date; source: "local" | "cloud" } | null = local
        ? { ...local, source: "local" }
        : null;

      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id ?? null;
        userIdRef.current = uid;
        if (uid) {
          const { data } = await (supabase as any)
            .from("form_drafts")
            .select("payload, updated_at")
            .eq("user_id", uid)
            .eq("form_key", formKey)
            .eq("scope_key", scopeKey)
            .maybeSingle();
          if (data) {
            const cloudUpdated = new Date(data.updated_at);
            if (!best || cloudUpdated > best.updatedAt) {
              best = { payload: data.payload as T, updatedAt: cloudUpdated, source: "cloud" };
            }
          }
        }
      } catch {
        /* sem rede ou não autenticado — usa apenas local */
      }

      if (cancelled) return;
      // Ignora rascunhos sem conteúdo real (estado inicial gravado por versões
      // antigas do app) — não faz sentido oferecer "restaurar" para eles.
      if (best && !isBlank(best.payload)) {
        setDraftPayload(best.payload);
        setDraftMeta({ updatedAt: best.updatedAt, source: best.source });
      } else {
        setDraftPayload(null);
        setDraftMeta(null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, formKey, scopeKey]);

  // Salvar (debounced) quando state muda
  useEffect(() => {
    if (!enabled || !scopeKey) return;

    const serialized = JSON.stringify(state);
    if (serialized === lastSerializedRef.current) return;
    if (serialized === "{}" || serialized === "null" || serialized === "undefined") return;
    // Formulário intocado: não cria rascunho fantasma.
    if (isBlank(state, serialized)) return;


    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      lastSerializedRef.current = serialized;
      writeLocal(formKey, scopeKey, state);
      setLastSavedAt(new Date());

      const bytes = new Blob([serialized]).size;
      if (bytes > maxPayloadBytes) return; // só local

      const uid = userIdRef.current;
      if (!uid) {
        try {
          const { data } = await supabase.auth.getUser();
          userIdRef.current = data.user?.id ?? null;
        } catch {
          return;
        }
      }
      if (!userIdRef.current) return;

      setSaving(true);
      try {
        await (supabase as any).from("form_drafts").upsert(
          {
            user_id: userIdRef.current,
            form_key: formKey,
            scope_key: scopeKey,
            payload: state,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,form_key,scope_key" },
        );
      } catch {
        /* fire-and-forget */
      } finally {
        setSaving(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state, enabled, formKey, scopeKey, debounceMs, maxPayloadBytes]);

  // Flush imediato antes do app sumir
  useEffect(() => {
    if (!enabled || !scopeKey) return;
    const flush = () => {
      const serialized = JSON.stringify(state);
      if (isBlank(state, serialized)) return;
      if (serialized && serialized !== lastSerializedRef.current && serialized !== "{}") {
        writeLocal(formKey, scopeKey, state);
        lastSerializedRef.current = serialized;
      }
    };

    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [enabled, formKey, scopeKey, state, isBlank]);

  const restore = useCallback((): T | null => {
    restoredRef.current = true;
    return draftPayload;
  }, [draftPayload]);

  const discard = useCallback(async () => {
    if (!scopeKey) return;
    removeLocal(formKey, scopeKey);
    setDraftPayload(null);
    setDraftMeta(null);
    lastSerializedRef.current = "";
    const uid = userIdRef.current;
    if (uid) {
      try {
        await (supabase as any)
          .from("form_drafts")
          .delete()
          .eq("user_id", uid)
          .eq("form_key", formKey)
          .eq("scope_key", scopeKey);
      } catch {
        /* noop */
      }
    }
  }, [formKey, scopeKey]);

  const flush = useCallback(async () => {
    if (!scopeKey) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const serialized = JSON.stringify(state);
    if (!serialized || serialized === "{}" || serialized === "null" || serialized === "undefined") return;
    if (isBlank(state, serialized)) return;

    lastSerializedRef.current = serialized;
    writeLocal(formKey, scopeKey, state);
    setLastSavedAt(new Date());

    const bytes = new Blob([serialized]).size;
    if (bytes > maxPayloadBytes) return;

    let uid = userIdRef.current;
    if (!uid) {
      try {
        const { data } = await supabase.auth.getUser();
        uid = data.user?.id ?? null;
        userIdRef.current = uid;
      } catch {
        return;
      }
    }
    if (!uid) return;

    setSaving(true);
    try {
      await (supabase as any).from("form_drafts").upsert(
        {
          user_id: uid,
          form_key: formKey,
          scope_key: scopeKey,
          payload: state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,form_key,scope_key" },
      );
    } catch {
      /* noop */
    } finally {
      setSaving(false);
    }
  }, [formKey, scopeKey, state, maxPayloadBytes, isBlank]);

  return {
    hasDraft: !!draftPayload && !restoredRef.current,
    draftMeta,
    draftPayload,
    restore,
    discard,
    flush,
    saving,
    lastSavedAt,
  };
}
