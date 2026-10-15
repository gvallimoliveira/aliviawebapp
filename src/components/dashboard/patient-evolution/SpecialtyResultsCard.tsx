import { useMemo } from "react";
import { Brain, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSpecialtyQuestionnaire } from "@/data/specialtyQuestionnaires";
import MeasurementReportButton from "./MeasurementReportButton";

interface AppliedResult {
  questionnaireId: string;
  questionnaireName?: string;
  domain?: string;
  score?: {
    total: number;
    max: number;
    interpretation_pt?: string;
    interpretation_en?: string;
    severity?: string;
    subscores?: { id: string; label_pt: string; label_en: string; total: number; max: number; cutoff?: number; high?: boolean }[];
  };
}

interface Props {
  assessments: any[];
  patientName: string;
  clinicId?: string;
  professionalId?: string;
}

/**
 * Questionários complementares (cardio / geriatria / psicossocial — FABQ).
 * Interpretação e semáforo aparecem SOMENTE aqui, no prontuário do profissional;
 * o PDF do paciente mostra apenas a pontuação bruta.
 */
const SpecialtyResultsCard = ({ assessments, patientName, clinicId, professionalId }: Props) => {
  const { language } = useLanguage();
  const isPt = language === "pt";
  const isEs = language === "es";
  const tl = (pt: string, en: string, es?: string) => (isPt ? pt : isEs ? es || en : en);

  const entries = useMemo(() => {
    return (assessments || [])
      .map((a: any) => {
        const results: AppliedResult[] = Array.isArray(a?.anamnesis_data?.specialtyResults)
          ? a.anamnesis_data.specialtyResults
          : [];
        return { id: a.id, date: a.created_at, results: results.filter((r) => r?.score) };
      })
      .filter((e) => e.results.length > 0);
  }, [assessments]);

  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          {tl("Questionários complementares", "Complementary questionnaires", "Cuestionarios complementarios")}
        </CardTitle>
        <CardDescription className="text-xs">
          {tl(
            "Instrumentos especializados e perfil psicossocial (yellow flags). A interpretação abaixo é de uso clínico interno — o PDF do paciente mostra apenas a pontuação.",
            "Specialized instruments and psychosocial profile (yellow flags). The interpretation below is for internal clinical use — the patient PDF shows scores only.",
            "Instrumentos especializados y perfil psicosocial (yellow flags). La interpretación es de uso clínico interno.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {new Date(entry.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
            {entry.results.map((r) => {
              const def = getSpecialtyQuestionnaire(r.questionnaireId);
              const domain = r.domain || def?.domain;
              const isPsy = domain === "psychosocial";
              const score = r.score;
              if (!score) return null;
              const anyHigh = (score.subscores || []).some((s) => s.high);
              return (
                <div
                  key={r.questionnaireId}
                  className="rounded-xl border bg-muted/25 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        {isPsy && <Brain className="h-3.5 w-3.5 text-violet-500 shrink-0" />}
                        {r.questionnaireName || def?.name || r.questionnaireId}
                      </p>
                      {def && (
                        <p className="text-[11px] text-muted-foreground">{isPt ? def.fullName_pt : def.fullName_en}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {score.severity && (
                        <Badge
                          variant="outline"
                          className={
                            score.severity === "severe" || score.severity === "extreme"
                              ? "text-[10px] border-destructive/40 text-destructive bg-destructive/5"
                              : score.severity === "moderate"
                              ? "text-[10px] border-amber-400/50 text-amber-700 dark:text-amber-400 bg-amber-500/5"
                              : "text-[10px] border-emerald-400/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5"
                          }
                        >
                          {tl(
                            { minimal: "Impacto mínimo", mild: "Impacto leve", moderate: "Impacto moderado", severe: "Impacto importante", extreme: "Impacto muito importante" }[score.severity] || score.severity,
                            { minimal: "Minimal impact", mild: "Mild impact", moderate: "Moderate impact", severe: "Major impact", extreme: "Very major impact" }[score.severity] || score.severity,
                            { minimal: "Impacto mínimo", mild: "Impacto leve", moderate: "Impacto moderado", severe: "Impacto importante", extreme: "Impacto muy importante" }[score.severity] || score.severity,
                          )}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          anyHigh
                            ? "text-[11px] border-destructive/40 text-destructive bg-destructive/5"
                            : "text-[11px]"
                        }
                      >
                        {score.total}/{score.max}
                      </Badge>
                    </div>
                  </div>

                  {(score.subscores || []).map((s) => {
                    const pct = s.max > 0 ? Math.round((s.total / s.max) * 100) : 0;
                    return (
                      <div key={s.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-muted-foreground">{isPt ? s.label_pt : s.label_en}</span>
                          <span
                            className={
                              s.high ? "font-semibold text-destructive" : "font-medium text-foreground"
                            }
                          >
                            {s.total}/{s.max}
                            {s.cutoff != null && (
                              <span className="ml-1 font-normal text-muted-foreground">
                                ({tl("corte", "cut-off", "corte")} {s.cutoff})
                              </span>
                            )}
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}

                  <MeasurementReportButton kind="questionnaires" assessments={assessments.filter((a) => a.id === entry.id)} patientName={patientName} clinicId={clinicId} professionalId={professionalId} questionnaireId={r.questionnaireId} />

                  <p
                    className={`text-xs leading-snug ${anyHigh ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {isPt ? score.interpretation_pt : score.interpretation_en}
                  </p>

                  {isPsy && anyHigh && (
                    <p className="text-[11px] leading-snug rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300 px-2.5 py-1.5">
                      {tl(
                        "Acima do corte: priorize educação em dor, reasseguramento e exposição gradual antes de progressão agressiva de carga.",
                        "Above cut-off: prioritize pain education, reassurance and graded exposure before aggressive load progression.",
                        "Por encima del corte: priorice educación en dolor, tranquilización y exposición gradual.",
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SpecialtyResultsCard;
