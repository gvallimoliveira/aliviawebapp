import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";

interface Props {
  clinicId: string;
}

interface Row {
  professional_id: string;
  professional_name: string | null;
  active_patients: number;
  completed_30d: number;
  noshow_rate_30d: number;
}

const TherapistStatsCard = ({ clinicId }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const t = (pt: string, en: string, es?: string) => (lang === "pt" ? pt : lang === "es" ? es ?? en : en);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_clinic_therapist_stats" as any, { _clinic_id: clinicId });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setRows(data as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId]);

  const infoContent = (
    <div className="space-y-2 text-sm">
      <p className="font-semibold">{t("Como é calculado", "How it's calculated")}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(
          "Para cada profissional ativo da equipe: pacientes únicos atendidos nos últimos 30 dias, atendimentos concluídos no período e taxa de faltas sobre os horários encerrados (concluído + falta + cancelado).",
          "For each active team member: unique patients seen in the last 30 days, completed appointments in the period, and no-show rate over closed slots (completed + no-show + cancelled).",
        )}
      </p>
    </div>
  );

  return (
    <InsightCardShell
      id="therapist-stats"
      icon={<Users className="h-4 w-4 text-primary" />}
      title={t("Equipe: retenção por profissional", "Team: retention per professional", "Equipo: retención por profesional")}
      description={t(
        "Carteira ativa, volume e faltas de cada profissional (30 dias).",
        "Active roster, volume and no-shows per professional (30 days).",
      )}
      infoContent={infoContent}
    >
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t("Nenhum profissional ativo na equipe ainda.", "No active team professional yet.")}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.professional_id} className="p-3 rounded-lg border border-border/60 bg-background">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate flex-1">{r.professional_name || "—"}</p>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${
                    r.noshow_rate_30d > 20
                      ? "bg-red-500/10 text-red-700 border-red-500/30"
                      : r.noshow_rate_30d > 10
                      ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                  }`}
                >
                  {r.noshow_rate_30d}% {t("faltas", "no-shows", "faltas")}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                <div className="rounded-md bg-muted/50 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("Pacientes ativos", "Active patients", "Pacientes activos")}
                  </p>
                  <p className="text-sm font-semibold">{r.active_patients}</p>
                </div>
                <div className="rounded-md bg-muted/50 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("Atendimentos 30d", "Visits 30d", "Atenciones 30d")}
                  </p>
                  <p className="text-sm font-semibold">{r.completed_30d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </InsightCardShell>
  );
};

export default TherapistStatsCard;
