import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * MEMÓRIA DE COBERTURA DE PÚBLICOS (por marca, salva na conta)
 *
 * A Visão 360° sorteia o assunto de cada lote. Sem memória, o sorteio cego
 * concentrava a criação em dois ou três nichos e deixava o resto da marca
 * parado. Aqui cada público que vai ao ar deixa marca: quem apareceu há pouco
 * pesa menos no sorteio, quem está há mais tempo sem aparecer entra na frente.
 *
 * Reaproveita a tabela de memória do motor (`kind = 'segment'`), então trocar
 * de dispositivo não zera a cobertura já feita. Decaimento de ~30 dias: nicho
 * antigo volta a circular normalmente.
 */

const DECAY_DAYS = 30;
const PREFIX = "seg:";

type Row = { signature: string; uses: number; last_used_at: string };

export type SegmentMemory = {
  /** Peso do público no sorteio: 1 = inédito, mínimo 0.08 (recém-usado). */
  weights: Record<string, number>;
  /** Registra que este público foi ao ar neste lote. */
  record: (segmentId: string) => void;
};

export const useSegmentMemory = (brandId?: string): SegmentMemory => {
  const [rows, setRows] = useState<Row[]>([]);
  const written = useRef<Set<string>>(new Set());

  useEffect(() => {
    written.current = new Set();
    if (!brandId) {
      setRows([]);
      return;
    }
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from("studio_phrase_memory")
        .select("signature, uses, last_used_at")
        .eq("brand_id", brandId)
        .eq("kind", "segment")
        .limit(300);
      if (alive) setRows((data as Row[]) ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [brandId]);

  const weights = useMemo(() => {
    const map: Record<string, number> = {};
    const now = Date.now();
    rows.forEach((row) => {
      if (!row.signature.startsWith(PREFIX)) return;
      const ageDays = (now - new Date(row.last_used_at).getTime()) / 86_400_000;
      const decay = Math.max(0, 1 - ageDays / DECAY_DAYS);
      const penalty = Math.min(0.92, 0.5 * row.uses * decay);
      map[row.signature.slice(PREFIX.length)] = Math.max(0.08, 1 - penalty);
    });
    return map;
  }, [rows]);

  const record = useCallback(
    (segmentId: string) => {
      if (!brandId || !segmentId) return;
      const signature = `${PREFIX}${segmentId}`;
      // Um lote conta uma vez: sem isso o re-render inflaria a penalidade.
      const stamp = `${brandId}:${signature}`;
      if (written.current.has(stamp)) return;
      written.current.add(stamp);
      void (async () => {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) return;
        const previous = rows.find((r) => r.signature === signature);
        const next = {
          user_id: userId,
          brand_id: brandId,
          signature,
          kind: "segment",
          uses: (previous?.uses ?? 0) + 1,
          last_used_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("studio_phrase_memory")
          .upsert(next, { onConflict: "brand_id,signature" });
        if (!error) {
          setRows((prev) => {
            const map = new Map(prev.map((r) => [r.signature, r] as const));
            map.set(signature, { signature, uses: next.uses, last_used_at: next.last_used_at });
            return Array.from(map.values());
          });
        }
      })();
    },
    [brandId, rows],
  );

  return useMemo(() => ({ weights, record }), [weights, record]);
};

export default useSegmentMemory;
