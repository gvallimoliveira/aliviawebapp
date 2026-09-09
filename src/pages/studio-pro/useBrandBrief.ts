/**
 * BRIEFING DE IA DO DIRETOR CRIATIVO (exclusivo admin).
 *
 * Regra do produto: o diretor criativo é 100% local e gratuito para TODOS os
 * usuários. Somente a conta admin pode ligar uma leitura de IA do kit da marca,
 * e ela acontece UMA VEZ POR LOTE/marca (cache por marca + versão do kit),
 * nunca por arte. Qualquer erro cai no modo local, sem travar a geração.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VIP_FALLBACK_EMAILS } from "@/lib/vipEmails";
import type { BrandBrief } from "./director";

const FLAG_KEY = "studio-director-ai";

/** Assinatura do kit: muda o kit, muda o briefing; igual, usa o cache. */
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email?.toLowerCase() ?? null));
  }, []);

  const canUse = Boolean(email && VIP_FALLBACK_EMAILS.includes(email));
  const version = useMemo(() => kitHash(kit), [kit]);
  const cacheKey = `${FLAG_KEY}:${brandId}:${version}`;

  useEffect(() => {
    if (!canUse || !enabled) {
      setBrief(null);
      return;
    }
    const cached = typeof window !== "undefined" ? window.localStorage.getItem(cacheKey) : null;
    if (cached) {
      try {
        setBrief(JSON.parse(cached) as BrandBrief);
        return;
      } catch {
        /* cache inválido: refaz */
      }
    }
    let alive = true;
    setLoading(true);
    void supabase.functions
      .invoke("studio-brand-brief", { body: { brandId, kit } })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data?.brief) {
          setBrief(null);
          return;
        }
        setBrief(data.brief as BrandBrief);
        try {
          window.localStorage.setItem(cacheKey, JSON.stringify(data.brief));
        } catch {
          /* sem cache local: segue */
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [canUse, enabled, cacheKey, brandId, kit]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") window.localStorage.setItem(FLAG_KEY, next ? "on" : "off");
      return next;
    });
  }, []);

  return { brief, enabled: enabled && canUse, canUse, loading, toggle };
};
