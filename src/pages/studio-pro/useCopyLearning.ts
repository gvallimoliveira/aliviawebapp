/**
 * APRENDIZADO DE TEXTO POR MARCA (guardado na conta).
 *
 * Lê as correções que o dono da marca já fez nas artes e devolve:
 *  - `rewrites`: índice que substitui a frase recusada pela frase aprovada em
 *    todas as gerações seguintes (fim do retrabalho);
 *  - `voice`: as palavras que ele escolheu, usadas pelo diretor criativo para
 *    puxar o lote para o jeito de falar da marca;
 *  - `learn`: registra novas correções.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildRewrites, buildVocabularyRewrites, learnedKey, type LearnedRewrite } from "@/pages/studio/copyLearning";

type Row = { signature: string; original_text: string; edited_text: string; uses: number };

/** Assinatura curta e estável do texto original (chave da correção). */
const signatureOf = (text: string): string => {
  const key = learnedKey(text).slice(0, 200);
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

export const useCopyLearning = (brandId?: string, protectedLiterals: string[] = []) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(!brandId);

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
        .from("studio_copy_learning")
        .select("signature, original_text, edited_text, uses")
        .eq("brand_id", brandId)
        .order("updated_at", { ascending: false })
        .limit(600);
      if (alive) {
        setRows((data as Row[]) ?? []);
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [brandId]);

  const rewrites = useMemo(
    () => buildRewrites(rows.map((r) => ({ original: r.original_text, edited: r.edited_text })), { protectedLiterals }),
    [rows, protectedLiterals],
  );
  const vocabulary = useMemo(
    () => buildVocabularyRewrites(rows.map((r) => ({ original: r.original_text, edited: r.edited_text })), { protectedLiterals }),
    [rows, protectedLiterals],
  );

  /**
   * Vocabulário aprendido: exclui edições feitas sobre a assinatura/nome da
   * marca. Elas são ajustes pontuais de layout, não direção de voz nem tema.
   */
  const voice = useMemo(() => {
    const protectedKeys = protectedLiterals.map(learnedKey).filter((key) => key.length >= 3);
    return rows
      .filter((row) => {
        const original = learnedKey(row.original_text);
        return !protectedKeys.some((key) => original.includes(key) || key.includes(original));
      })
      .map((r) => r.edited_text)
      .slice(0, 80);
  }, [rows, protectedLiterals]);

  const learn = useCallback(
    async (pairs: LearnedRewrite[]) => {
      if (!brandId || pairs.length === 0) return;
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;
      const known = new Map(rows.map((r) => [r.signature, r] as const));
      const payload = pairs.filter((pair) => {
        const current = known.get(signatureOf(pair.original));
        return !current || learnedKey(current.edited_text) !== learnedKey(pair.edited);
      }).map((pair) => {
        const signature = signatureOf(pair.original);
        return {
          user_id: userId,
          brand_id: brandId,
          signature,
          original_text: pair.original.slice(0, 600),
          edited_text: pair.edited.slice(0, 600),
          uses: (known.get(signature)?.uses ?? 0) + 1,
          updated_at: new Date().toISOString(),
        };
      });
      if (payload.length === 0) return;
      const { error } = await supabase
        .from("studio_copy_learning")
        .upsert(payload, { onConflict: "brand_id,signature" });
      if (error) {
        console.warn("[studio-pro] copy learning", error);
        return;
      }
      setRows((prev) => {
        const next = new Map(prev.map((r) => [r.signature, r] as const));
        payload.forEach((p) =>
          next.set(p.signature, {
            signature: p.signature,
            original_text: p.original_text,
            edited_text: p.edited_text,
            uses: p.uses,
          }),
        );
        return Array.from(next.values());
      });
    },
    [brandId, rows],
  );

  return { rewrites, vocabulary, voice, learn, count: rows.length, ready };
};
