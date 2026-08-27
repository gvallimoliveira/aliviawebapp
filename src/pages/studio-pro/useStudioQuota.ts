import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * COTA DE GERAÇÕES DO STUDIO PÚBLICO
 *
 * A cota do plano é contada em artes, mas o usuário compra "gerações": cada
 * clique em "Nova versão" entrega um lote fixo (6 artes) e desconta 6 da cota.
 * Assim o plano Solo (60 artes/mês) vale 10 gerações, Marca 33 e Agência 133.
 *
 * O desconto é feito no banco (`consume_studio_generation`), nunca no cliente:
 * é a única fonte de verdade e o que garante o bloqueio.
 */
export const STUDIO_BATCH_SIZE = 6;

export type StudioQuota = {
  plan: string;
  unlimited: boolean;
  batchSize: number;
  allowance: number;
  used: number;
  remaining: number;
  generationsLeft: number;
  periodStart: string | null;
};

type Row = {
  plan: string;
  unlimited: boolean;
  batch_size: number;
  allowance: number;
  used_this_period: number;
  remaining: number;
  generations_left: number;
  period_start: string | null;
  allowed?: boolean;
};

const toQuota = (row: Row): StudioQuota => ({
  plan: row.plan,
  unlimited: !!row.unlimited,
  batchSize: row.batch_size ?? STUDIO_BATCH_SIZE,
  allowance: row.allowance ?? 0,
  used: row.used_this_period ?? 0,
  remaining: row.remaining ?? 0,
  generationsLeft: row.generations_left ?? 0,
  periodStart: row.period_start ?? null,
});

const first = (data: unknown): Row | null => {
  const row = Array.isArray(data) ? data[0] : data;
  return (row as Row) ?? null;
};

export const useStudioQuota = () => {
  const { user, loading: authLoading } = useAuth();
  const [quota, setQuota] = useState<StudioQuota | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setQuota(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("studio_credit_status");
    if (error) console.error("[studio-pro] studio_credit_status", error);
    const row = first(data);
    if (row) setQuota(toQuota(row));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  /**
   * Tenta consumir uma geração. Retorna `false` quando a cota do período acabou
   * — a UI então mostra o bloqueio amigável em vez de gerar as artes.
   */
  const consume = useCallback(
    async (amount = STUDIO_BATCH_SIZE): Promise<boolean> => {
      const { data, error } = await supabase.rpc("consume_studio_generation", { p_amount: amount });
      if (error) {
        console.error("[studio-pro] consume_studio_generation", error);
        return false;
      }
      const row = first(data);
      if (row) setQuota(toQuota(row));
      return !!row?.allowed;
    },
    [],
  );

  return { quota, loading: loading || authLoading, refresh, consume };
};
