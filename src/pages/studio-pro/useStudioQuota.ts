import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * COTA DE GERAÇÕES DO STUDIO PÚBLICO
 *
 * A cota do plano é contada em GERAÇÕES por período, não em artes: cada clique
 * em "Nova versão" custa 1 geração e entrega a versão inteira — que o usuário
 * navega de graça por público, visão 360°, objetivo, modelo e formato (dezenas
 * de artes por geração). Solo 10, Marca 40, Agência 120, grátis 2.
 *
 * O desconto é feito no banco (`consume_studio_generation`), nunca no cliente:
 * é a única fonte de verdade e o que garante o bloqueio.
 */
export const STUDIO_GENERATION_COST = 1;

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

/**
 * Resultado do consumo. Falha de rede/permissão NÃO é cota esgotada: o app
 * precisa distinguir os dois casos para não acusar upgrade sem motivo.
 */
export type ConsumeResult = "allowed" | "exhausted" | "error";

export const useStudioQuota = () => {
  const { user, loading: authLoading } = useAuth();
  const [quota, setQuota] = useState<StudioQuota | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setQuota(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("studio_credit_status");
    if (error) {
      console.error("[studio-pro] studio_credit_status", error);
      setError(error.message ?? "falha ao ler a cota");
      setLoading(false);
      return;
    }
    const row = first(data);
    if (row) {
      setQuota(toQuota(row));
      setError(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  /**
   * Tenta consumir uma geração. `exhausted` = cota do período acabou;
   * `error` = a chamada falhou (a UI deve avisar e permitir tentar de novo).
   */
  const consume = useCallback(
    async (amount = STUDIO_BATCH_SIZE): Promise<ConsumeResult> => {
      const { data, error } = await supabase.rpc("consume_studio_generation", { p_amount: amount });
      if (error) {
        console.error("[studio-pro] consume_studio_generation", error);
        setError(error.message ?? "falha ao confirmar a cota");
        return "error";
      }
      const row = first(data);
      if (!row) return "error";
      setQuota(toQuota(row));
      setError(null);
      return row.allowed ? "allowed" : "exhausted";
    },
    [],
  );

  return { quota, error, loading: loading || authLoading, refresh, consume };
};

