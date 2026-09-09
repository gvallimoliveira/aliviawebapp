/**
 * BRIEFING DE IA DO DIRETOR CRIATIVO (leitura só do admin, aprendizado de todos).
 *
 * Regra do produto: o diretor criativo é 100% local e gratuito para TODOS os
 * usuários. Somente a conta admin pode LIGAR uma leitura de IA do kit da marca,
 * e ela acontece UMA VEZ por marca + versão do kit, nunca por arte.
 *
 * PERPETUAÇÃO: o briefing lido pela IA é guardado na marca (`studio_brand_briefs`).
 * A partir daí ele continua valendo nas gerações seguintes mesmo com a IA
 * DESLIGADA — é assim que a otimização feita na conta admin chega "em caixa
 * fechada" para o motor local, sem novo consumo de crédito.
 *
 * Qualquer erro cai no modo local, sem travar a geração.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VIP_FALLBACK_EMAILS } from "@/lib/vipEmails";
import type { BrandBrief } from "./director";

const FLAG_KEY = "studio-director-ai";

/** Assinatura do kit: muda o kit, muda o briefing; igual, reusa o guardado. */
const kitHash = (kit: unknown): string => {
  const text = JSON.stringify(kit ?? {});
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

export const useBrandBrief = ({ brandId, kit }: { brandId: string; kit: unknown }) => {
  const [email, setEmail] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(FLAG_KEY) === "on";
  });
  const [brief, setBrief] = useState<BrandBrief | null>(null);
  /** Versão do kit do briefing guardado — se for outra, a IA pode reler. */
  const [briefVersion, setBriefVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email?.toLowerCase() ?? null));
  }, []);

  const canUse = Boolean(email && VIP_FALLBACK_EMAILS.includes(email));
  const version = useMemo(() => kitHash(kit), [kit]);

  /**
   * 1) Aprendizado guardado: vale para qualquer usuário e com a IA desligada.
   */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from("studio_brand_briefs")
        .select("brief, kit_version")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      if (data?.brief) {
        setBrief(data.brief as BrandBrief);
        setBriefVersion(data.kit_version ?? null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [brandId]);

  /**
   * 2) Nova leitura de IA: só admin, só com o botão ligado e só quando o kit
   *    mudou desde o briefing guardado.
   */
  useEffect(() => {
    if (!canUse || !enabled) return;
    if (briefVersion === version) return;
    let alive = true;
    setLoading(true);
    void supabase.functions
      .invoke("studio-brand-brief", { body: { brandId, kit } })
      .then(async ({ data, error }) => {
        if (!alive) return;
        if (error || !data?.brief) return;
        const next = data.brief as BrandBrief;
        setBrief(next);
        setBriefVersion(version);
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        // Guarda o aprendizado: as próximas gerações usam isto sem chamar a IA.
        await supabase
          .from("studio_brand_briefs")
          .upsert(
            { user_id: auth.user.id, brand_id: brandId, kit_version: version, brief: next as never },
            { onConflict: "brand_id,kit_version" },
          );
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [canUse, enabled, brandId, kit, version, briefVersion]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") window.localStorage.setItem(FLAG_KEY, next ? "on" : "off");
      return next;
    });
  }, []);

  return {
    /** Briefing em uso — guardado na marca, valendo com a IA ligada ou não. */
    brief,
    /** Existe aprendizado de IA guardado para esta marca. */
    learned: Boolean(brief),
    enabled: enabled && canUse,
    canUse,
    loading,
    toggle,
  };
};
