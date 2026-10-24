import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";

interface Props {
  clinicId?: string;
  professionalId?: string;
}

interface DueRow {
  patient_id: string;
  patient_name: string | null;
  last_assessment_date: string | null;
  days_since: number;
  sessions_since: number;
}

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

const ReassessmentDueCard = ({ clinicId, professionalId }: Props) => {
  const [rows, setRows] = useState<DueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const t = (pt: string, en: string, es?: string) => (lang === "pt" ? pt : lang === "es" ? es ?? en : en);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_reassessment_due" as any, {
        _clinic_id: clinicId ?? null,
        _professional_id: professionalId ?? null,
      });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setRows(data as any);
      setLoading(false);
    };
    if (clinicId || professionalId) load();
    else setLoading(false);
    return () => { cancelled = true; };
  }, [clinicId, professionalId]);

  const infoContent = (
    <div className="space-y-2 text-sm">
      <p className="font-semibold">{t("Como é calculado", "How it's calculated")}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(
          "Entram na lista pacientes com 28 dias ou mais desde a última avaliação concluída, ou com 8+ evoluções registradas depois dela. Reavaliar documenta o progresso e atualiza o plano.",
          "Patients appear here 28+ days after their last completed assessment, or after 8+ logged session notes since it. Reassessing documents progress and refreshes the plan.",
        )}
      </p>
    </div>
  );

  return (
    <InsightCardShell
      id="reassessment"
      icon={<ClipboardCheck className="h-4 w-4 text-primary" />}
      title={t("Reavaliação programada", "Scheduled reassessment", "Reevaluación programada")}
      description={t(
        "Pacientes há 4+ semanas sem reavaliação ou com 8+ sessões desde a última.",
        "Patients 4+ weeks without reassessment or with 8+ sessions since the last one.",
      )}
      rightSlot={
        !loading && rows.length > 0 ? (
          <Badge variant="outline" className="text-xs">{rows.length}</Badge>
        ) : null
      }
      infoContent={infoContent}
    >
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t("Todas as avaliações estão em dia ✨", "All assessments are up to date ✨")}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.patient_id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.patient_name || t("Paciente", "Patient")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Última avaliação", "Last assessment")}: {fmtDate(r.last_assessment_date)}
                  {" · "}
                  {r.sessions_since > 0
                    ? t(`${r.sessions_since} sessões depois`, `${r.sessions_since} sessions since`)
                    : t(`${r.days_since} dias`, `${r.days_since} days`)}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] ${
                  r.days_since >= 42
                    ? "bg-red-500/10 text-red-700 border-red-500/30"
                    : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                }`}
              >
                {r.days_since}d
              </Badge>
            </div>
          ))}
        </div>
      )}
    </InsightCardShell>
  );
};

export default ReassessmentDueCard;
