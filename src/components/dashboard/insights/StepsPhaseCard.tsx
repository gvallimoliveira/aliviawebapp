import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers, Loader2, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { useInsightDismissals } from "./useInsightDismissals";

interface Props {
  clinicId?: string;
  professionalId?: string;
}

interface PhaseRow {
  patient_id: string;
  patient_name: string | null;
  plan_title: string | null;
  phase_name: string | null;
  phase_goal: string | null;
  weeks_in_phase: number;
  sort_order: number;
  total_phases: number;
}

const StepsPhaseCard = ({ clinicId, professionalId }: Props) => {
  const [rows, setRows] = useState<PhaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const t = (pt: string, en: string, es?: string) => (lang === "pt" ? pt : lang === "es" ? es ?? en : en);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_steps_phase_overview" as any, {
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

  const stalled = useMemo(() => rows.filter((r) => r.weeks_in_phase >= 4), [rows]);

  const infoContent = (
    <div className="space-y-2 text-sm">
      <p className="font-semibold">{t("Como é calculado", "How it's calculated")}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(
          "Mostra a fase atual (macrociclo) de cada plano de periodização ativo e há quantas semanas o paciente está nela. Quem passa de 4 semanas na mesma fase aparece destacado — vale revisar os critérios de saída da fase.",
          "Shows the current phase (macrocycle) of each active periodization plan and how many weeks the patient has been in it. Anyone over 4 weeks in the same phase is highlighted — worth reviewing the phase exit criteria.",
        )}
      </p>
    </div>
  );

  return (
    <InsightCardShell
      id="steps-phase"
      icon={<Layers className="h-4 w-4 text-primary" />}
      title={t("Fase do tratamento (STEPS)", "Treatment phase (STEPS)", "Fase del tratamiento (STEPS)")}
      description={t(
        "Distribuição dos planos ativos por fase e tempo em cada uma.",
        "Distribution of active plans by phase and time in each.",
      )}
      rightSlot={
        !loading && stalled.length > 0 ? (
          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/30">
            {stalled.length} {t("parado(s)", "stalled", "estancado(s)")}
          </Badge>
        ) : null
      }
      infoContent={infoContent}
    >
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t(
            "Nenhum plano de periodização ativo. Monte o macrociclo na seção Periodização do prontuário.",
            "No active periodization plan. Build the macrocycle in the Periodization section of the record.",
          )}
        </p>
      ) : (
        <div className="space-y-2 max-h-[384px] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
          {rows.map((r) => {
            const pct = r.total_phases > 0 ? Math.round(((r.sort_order + 1) / r.total_phases) * 100) : 0;
            const isStalled = r.weeks_in_phase >= 4;
            return (
              <div key={r.patient_id} className="p-3 rounded-lg border border-border/60 bg-background space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate flex-1">{r.patient_name || t("Paciente", "Patient")}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      isStalled
                        ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                    }`}
                  >
                    {r.weeks_in_phase} {t("sem", "w", "sem")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {r.phase_name || "—"}
                  {r.phase_goal ? ` · ${r.phase_goal}` : ""}
                </p>
                <div className="flex items-center gap-2">
                  <Progress value={pct} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {t("fase", "phase", "fase")} {r.sort_order + 1}/{r.total_phases}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </InsightCardShell>
  );
};

export default StepsPhaseCard;
