import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isSharedBrand, type BrandOwnership } from "./brandSharing";

/**
 * TETO DE FOTOS DA MARCA
 *
 * O acervo pertence à MARCA, então o teto é o do plano de quem a criou. Numa
 * marca compartilhada o convidado envia, edita e usa fotos sem precisar de
 * plano próprio (mesma regra já valida para a cota de gerações).
 *
 * Marca própria usa direto o limite do plano da conta — sem ida ao banco.
 */
export const useBrandPhotoLimit = (
  brand: BrandOwnership | null | undefined,
  ownLimit: number,
  userId?: string | null,
): number => {
  const shared = isSharedBrand(brand, userId);
  const [limit, setLimit] = useState(ownLimit);

  useEffect(() => {
    if (!brand || !shared) {
      setLimit(ownLimit);
      return;
    }
    let alive = true;
    void (async () => {
      const { data, error } = await supabase.rpc("studio_brand_photo_limit", { p_brand_id: brand.id });
      if (!alive) return;
      if (error) {
        console.error("[studio-pro] studio_brand_photo_limit", error);
        setLimit(ownLimit);
        return;
      }
      setLimit(Math.max(ownLimit, Number(data ?? 0)));
    })();
    return () => {
      alive = false;
    };
  }, [brand?.id, shared, ownLimit]);

  return limit;
};
