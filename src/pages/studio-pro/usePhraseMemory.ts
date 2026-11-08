import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PhraseMemory } from "@/pages/studio/picker";

/**
 * MEMÓRIA ANTI-REPETIÇÃO DE FRASES (por marca, salva na conta)
 *
 * O motor gera muitas variações, mas sem memória o sorteio pode reincidir nas
 * mesmas frases. Aqui cada frase que vai ao ar deixa uma assinatura na conta —
 * então trocar de dispositivo não zera o repertório já usado.
 *
 * Frase usada recentemente pesa menos no sorteio, com DECAIMENTO: depois de
 * ~30 dias o peso volta ao normal (repertório aprovado pode voltar a circular).
 */

const DECAY_DAYS = 30;

type Row = { signature: string; uses: number; last_used_at: string };

export const usePhraseMemory = (brandId?: string) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(!brandId);
  const pending = useRef<Map<string, number>>(new Map());
  /**
   * DESCONTO IMEDIATO (dentro do mesmo lote). Gravar no banco leva 2,5s, então
   * sem isso a frase que a arte anterior acabou de usar continuava com peso
   * cheio na arte seguinte — era parte da repetição percebida.
   */
  const optimistic = useRef<Map<string, number>>(new Map());
  const batchKey = useRef<string>("");
  const flushTimer = useRef<number | null>(null);


  useEffect(() => {
    if (!brandId) {
      setRows([]);
      setReady(true);
      return;
    }
    let alive = true;
    setReady(false);
    void (async () => {
      const { data } = await supabase
        .from("studio_phrase_memory")
        .select("signature, uses, last_used_at")
        .eq("brand_id", brandId)
        .order("last_used_at", { ascending: false })
        .limit(1500);
      if (alive) {
        setRows((data as Row[]) ?? []);
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [brandId]);

  /** Peso por assinatura: 1 = inédito; frases recentes/repetidas pesam menos. */
  const weights = useMemo(() => {
    const map = new Map<string, number>();
    const now = Date.now();
    rows.forEach((row) => {
      // Hook coverage is a repertoire cycle, not a 30-day popularity contest.
      // Every unused hook must get a turn before already circulated hooks.
      if (row.signature.startsWith("hook:")) {
        map.set(row.signature, 1 / (1 + row.uses));
        return;
      }
      const ageDays = (now - new Date(row.last_used_at).getTime()) / 86_400_000;
      const decay = Math.max(0, 1 - ageDays / DECAY_DAYS); // 1 = agora, 0 = esquecido
      const penalty = Math.min(0.9, 0.35 * row.uses * decay);
      map.set(row.signature, Math.max(0.1, 1 - penalty));
    });
    return map;
  }, [rows]);

  const flush = useCallback(async () => {
    flushTimer.current = null;
    if (!brandId || pending.current.size === 0) return;
    const batch = Array.from(pending.current.entries());
    pending.current.clear();

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;

    const known = new Map(rows.map((r) => [r.signature, r] as const));
    const payload = batch.map(([signature, count]) => ({
      user_id: userId,
      brand_id: brandId,
      signature,
      kind: "copy",
      uses: (known.get(signature)?.uses ?? 0) + count,
      last_used_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("studio_phrase_memory")
      .upsert(payload, { onConflict: "brand_id,signature" });
    if (!error) {
      batch.forEach(([signature, count]) => {
        if (!signature.startsWith("hook:")) return;
        const remaining = (optimistic.current.get(signature) ?? 0) - count;
        if (remaining > 0) optimistic.current.set(signature, remaining);
        else optimistic.current.delete(signature);
      });
      setRows((prev) => {
        const next = new Map(prev.map((r) => [r.signature, r] as const));
        payload.forEach((p) => next.set(p.signature, { signature: p.signature, uses: p.uses, last_used_at: p.last_used_at }));
        return Array.from(next.values());
      });
    }
  }, [brandId, rows]);

  const memory: PhraseMemory = useMemo(
    () => ({
      weightOf: (signature) => {
        const persisted = weights.get(signature) ?? 1;
        const justUsed = optimistic.current.get(signature) ?? 0;
        if (justUsed === 0) return persisted;
        if (signature.startsWith("hook:")) return 1 / (1 / persisted + justUsed);
        // Frase já usada nesta leva praticamente sai do sorteio.
        return Math.max(0.02, persisted * Math.pow(0.15, justUsed));
      },
      startBatch: (key) => {
        if (batchKey.current === key) return;
        batchKey.current = key;
        // Unflushed hook exposure must survive rapid consecutive generations.
        for (const signature of optimistic.current.keys()) {
          if (!signature.startsWith("hook:")) optimistic.current.delete(signature);
        }
      },
      record: (signatures) => {
        signatures.forEach((sig) => optimistic.current.set(sig, (optimistic.current.get(sig) ?? 0) + 1));
        if (!brandId) return;
        signatures.forEach((sig) => pending.current.set(sig, (pending.current.get(sig) ?? 0) + 1));
        if (flushTimer.current === null && typeof window !== "undefined") {
          // Escrita em lote: a renderização de uma versão inteira gera dezenas
          // de assinaturas; uma única ida ao banco resolve.
          flushTimer.current = window.setTimeout(() => void flush(), 2500);
        }
      },
    }),
    [weights, brandId, flush],
  );


  useEffect(
    () => () => {
      if (flushTimer.current !== null && typeof window !== "undefined") window.clearTimeout(flushTimer.current);
    },
    [],
  );

  return Object.assign(memory, { ready });
};
