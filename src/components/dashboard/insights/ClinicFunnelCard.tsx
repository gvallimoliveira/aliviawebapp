import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Filter, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { funnelStepPct } from "@/lib/insightFormat";

interface Props {
  clinicId: string;
}

interface FunnelRow {
  assessments_count: number;
  started_count: number;
  engaged_count: number;
  inactive_after_treatment: number;
}

const ClinicFunnelCard = ({ clinicId }: Props) => {
  const [row, setRow] = useState<FunnelRow | null>(null);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const t = (pt: string, en: string, es?: string) => (lang === "pt" ? pt : lang === "es" ? es ?? en : en);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_clinic_funnel" as any, { _clinic_id: clinicId });
      if (cancelled) return;
      if (!error && Array.isArray(data) && data[0]) setRow(data[0] as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId]);

  const infoContent = (
    <div className="space-y-2 text-sm">
      <p className="font-semibold">{t("Como é calculado", "How it's calculated")}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(
          "Últimos 90 dias: avaliações concluídas → pacientes com pelo menos 1 evolução registrada (iniciaram tratamento) → pacientes com 4+ evoluções (engajados) → engajados há 30+ dias sem atendimento (esfriando depois de tratar).",
          "Last 90 days: completed assessments → patients with at least 1 session note (started treatment) → patients with 4+ notes (engaged) → engaged patients 30+ days without a visit (cooling after treatment).",
        )}
      </p>
    </div>
  );

  const steps = row
    ? [
        { label: t("Avaliações concluídas", "Completed assessments", "Evaluaciones completadas"), value: row.assessments_count, pct: 100 },
        { label: t("Iniciaram tratamento", "Started treatment", "Iniciaron tratamiento"), value: row.started_count, pct: funnelStepPct(row.started_count, row.assessments_count) },
        { label: t("Engajados (4+ sessões)", "Engaged (4+ sessions)", "Comprometidos (4+ sesiones)"), value: row.engaged_count, pct: funnelStepPct(row.engaged_count, row.assessments_count) },
        { label: t("Esfriando após tratar", "Cooling after treatment", "Enfriando tras tratar"), value: row.inactive_after_treatment, pct: funnelStepPct(row.inactive_after_treatment, row.assessments_count), warn: true },
      ]
    : [];

  return (
    <InsightCardShell
      id="clinic-funnel"
      icon={<Filter className="h-4 w-4 text-primary" />}
      title={t("Funil avaliação → tratamento", "Assessment → treatment funnel", "Embudo evaluación → tratamiento")}
      description={t("Últimos 90 dias.", "Last 90 days.", "Últimos 90 días.")}
      infoContent={infoContent}
    >
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !row || row.assessments_count === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t("Sem avaliações concluídas no período.", "No completed assessments in the period.")}
        </p>
      ) : (
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={s.warn ? "text-amber-700 font-medium" : "text-muted-foreground"}>{s.label}</span>
                <span className="font-semibold tabular-nums">
                  {s.value} <span className="text-muted-foreground font-normal">({s.pct}%)</span>
                </span>
              </div>
              <Progress value={s.pct} className="h-2" />
            </div>
          ))}
        </div>
      )}
    </InsightCardShell>
  );
};

export default ClinicFunnelCard;
