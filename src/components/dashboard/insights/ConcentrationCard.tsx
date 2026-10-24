import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { PieChart, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { concentrationTone } from "@/lib/insightFormat";

interface Props {
  clinicId: string;
}

interface Row {
  total_patients: number;
  total_sessions: number;
  top5_sessions: number;
  top5_share_pct: number;
}

const ConcentrationCard = ({ clinicId }: Props) => {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const t = (pt: string, en: string, es?: string) => (lang === "pt" ? pt : lang === "es" ? es ?? en : en);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_clinic_patient_concentration" as any, { _clinic_id: clinicId });
      if (cancelled) return;
      if (!error && Array.isArray(data) && data[0]) setRow(data[0] as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId]);

  const share = row?.top5_share_pct ?? 0;
  const toneKey = concentrationTone(share);
  const tone = toneKey === "high" ? "text-red-700" : toneKey === "medium" ? "text-amber-700" : "text-emerald-700";

  const infoContent = (
    <div className="space-y-2 text-sm">
      <p className="font-semibold">{t("Como é calculado", "How it's calculated")}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(
          "Participação dos 5 pacientes com mais atendimentos no total de sessões concluídas (90 dias). Acima de 60% indica dependência alta de poucos pacientes — diversificar a carteira reduz o risco de receita.",
          "Share of the top 5 most-seen patients in total completed sessions (90 days). Above 60% means high dependence on a few patients — diversifying the roster lowers revenue risk.",
        )}
      </p>
    </div>
  );

  return (
    <InsightCardShell
      id="concentration"
      icon={<PieChart className="h-4 w-4 text-primary" />}
      title={t("Concentração da carteira", "Roster concentration", "Concentración de la cartera")}
      description={t(
        "Quanto da operação depende dos 5 pacientes mais frequentes.",
        "How much of the operation depends on the 5 most frequent patients.",
      )}
      infoContent={infoContent}
    >
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !row || row.total_sessions === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t("Sem atendimentos concluídos no período.", "No completed visits in the period.")}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="text-center">
            <p className={`text-3xl font-bold ${tone}`}>{share}%</p>
            <p className="text-xs text-muted-foreground">
              {t(
                `dos atendimentos vêm dos 5 pacientes mais frequentes`,
                `of visits come from the 5 most frequent patients`,
              )}
            </p>
          </div>
          <Progress value={Math.min(100, share)} className="h-2" />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-muted/50 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Pacientes", "Patients", "Pacientes")}</p>
              <p className="text-sm font-semibold">{row.total_patients}</p>
            </div>
            <div className="rounded-md bg-muted/50 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Sessões 90d", "Sessions 90d", "Sesiones 90d")}</p>
              <p className="text-sm font-semibold">{row.total_sessions}</p>
            </div>
            <div className="rounded-md bg-muted/50 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Top 5</p>
              <p className="text-sm font-semibold">{row.top5_sessions}</p>
            </div>
          </div>
        </div>
      )}
    </InsightCardShell>
  );
};

export default ConcentrationCard;
