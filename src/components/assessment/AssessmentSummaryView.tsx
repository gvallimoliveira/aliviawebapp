import PreventiveAssessmentSummary from "./PreventiveAssessmentSummary";
import { isPreventiveAssessment } from "@/lib/assessmentPurpose";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, ShieldCheck, ShieldAlert, Activity, MapPin, ClipboardCheck, Target,
  FileText, Dumbbell, Calendar, Sparkles, CheckCircle2, AlertCircle, Info,
  Download, Share2, Loader2, ArrowLeft, RotateCcw, ChevronDown, ChevronRight,
} from "lucide-react";
import { regionsByView } from "./painMapData";
import { questionnaires, type QuestionnaireResult } from "@/data/questionnaireData";
import { functionalTests } from "@/data/functionalTestsData";
import { getSeverityColor } from "./QuestionnaireResultCard";
import DismissRedFlagDialog from "./DismissRedFlagDialog";
import RomTable, { sanitizeRomRows } from "./RomTable";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AssessmentSummaryViewProps {
  assessment: any;
  onBack?: () => void;
  onDownloadPdf: () => void;
  onShareWhatsApp: () => void;
  pdfLoading?: boolean;
  whatsappLoading?: boolean;
  embedded?: boolean;
  professionalContext?: boolean;
  onAssessmentUpdated?: () => void;
}

function getRegionLabel(id: string, isPt: boolean): string {
  for (const view of Object.values(regionsByView)) {
    const r = view.find((reg) => reg.id === id);
    if (r) return isPt ? r.label_pt : r.label_en;
  }
  return id;
}

function getPainColor(score: number) {
  if (score >= 7) return "text-destructive";
  if (score >= 4) return "text-amber-600";
  return "text-emerald-600";
}

function getOdiColor(pct: number) {
  if (pct >= 41) return "text-destructive";
  if (pct >= 21) return "text-amber-600";
  return "text-emerald-600";
}

function getConfidenceBadge(conf: string | undefined, isPt: boolean) {
  switch (conf) {
    case "high":
      return { label: isPt ? "Alta" : "High", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-200" };
    case "low":
      return { label: isPt ? "Baixa" : "Low", cls: "bg-destructive/10 text-destructive border-destructive/20" };
    default:
      return { label: isPt ? "Moderada" : "Moderate", cls: "bg-amber-500/10 text-amber-700 border-amber-300/40" };
  }
}

const AssessmentSummaryView = ({
  assessment, onBack, onDownloadPdf, onShareWhatsApp, pdfLoading, whatsappLoading, embedded,
  professionalContext, onAssessmentUpdated,
}: AssessmentSummaryViewProps) => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const isPt = language === "pt";
  const [dismissOpen, setDismissOpen] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [showTriage, setShowTriage] = useState(false);

  const diagnosis = assessment.diagnosis || {};
  const displayHypothesis = assessment.final_hypothesis?.trim() || diagnosis.hypothesis;
  const confidence = getConfidenceBadge(diagnosis.confidence, isPt);

  const painRegions: string[] = assessment.pain_regions || [];
  const anamnesis = (assessment.anamnesis_data || {}) as any;
  const perRegionScore: Record<string, number> | undefined =
    anamnesis.painScoresPerRegion || anamnesis.pain_scores_per_region;

  const testResults: any[] = Array.isArray(assessment.test_results) ? assessment.test_results : [];
  const funcTests = testResults.filter((r) => r.testId && !r.questionnaireId);
  const qResults: QuestionnaireResult[] = testResults.filter((r: any) => r.questionnaireId);

  const rawRf = assessment.red_flags as any;
  const rfFromDiagnosis = (diagnosis as any).redFlags ?? (diagnosis as any).red_flags;
  let redFlagsList: string[] = [];
  if (Array.isArray(rfFromDiagnosis)) {
    redFlagsList = rfFromDiagnosis.filter((x: any) => typeof x === "string");
  }
  // Shape A: { detected: string[] } (manual flow / pro-clinic links)
  if (redFlagsList.length === 0 && rawRf && typeof rawRf === "object" && Array.isArray(rawRf.detected)) {
    redFlagsList = rawRf.detected
      .filter((x: any) => typeof x === "string")
      .map((k: string) => (k.startsWith("redflags.") ? t(k) || k : k));
  }
  // Shape B: { key: true } (legacy patient flow)
  if (redFlagsList.length === 0 && rawRf && typeof rawRf === "object" && !Array.isArray(rawRf) && !("detected" in rawRf)) {
    redFlagsList = Object.entries(rawRf)
      .filter(([, v]) => v === true)
      .map(([k]) => t(k) || k);
  }
  // Full screening Q&A (probatory record) — normalized from both shapes.
  type TriageEntry = { key: string; question: string; positive: boolean };
  const triageAnswers: TriageEntry[] = (() => {
    if (!rawRf || typeof rawRf !== "object" || Array.isArray(rawRf)) return [];
    // Shape A (payload v1): stored question text in the answer-time locale
    if (Array.isArray((rawRf as any).answers)) {
      return (rawRf as any).answers
        .filter((a: any) => a && typeof a === "object" && typeof a.key === "string")
        .map((a: any) => ({
          key: a.key as string,
          question:
            typeof a.question === "string" && a.question.trim()
              ? a.question
              : t(a.key) || a.key,
          positive: a.answer === "yes",
        }));
    }
    // Shape B (legacy): plain { "redflags.x": boolean } map
    if (!("detected" in rawRf)) {
      return Object.entries(rawRf as Record<string, unknown>)
        .filter(([k, v]) => typeof v === "boolean" && k.startsWith("redflags."))
        .map(([k, v]) => ({ key: k, question: t(k) || k, positive: v === true }));
    }
    return [];
  })();
  const redFlagsDetected =
    redFlagsList.length > 0 ||
    (rawRf && typeof rawRf === "object" && !Array.isArray(rawRf)
      ? (Array.isArray(rawRf.detected) ? rawRf.detected.length > 0 : Object.values(rawRf).some((v) => v === true))
      : !!rawRf);
  const isDismissed = !!assessment.red_flags_dismissed_at;
  const dismissedByName = assessment.red_flags_dismissed_by_name as string | undefined;
  const dismissedAt = assessment.red_flags_dismissed_at as string | undefined;
  const dismissedReason = assessment.red_flags_dismissed_reason as string | undefined;
  const hypothesisSuppressed = redFlagsDetected && !isDismissed;

  const handleRevert = async () => {
    if (!confirm(isPt ? "Reverter a dispensa desta red flag?" : "Revert this red flag dismissal?")) return;
    setReverting(true);
    const { error } = await (supabase.rpc as any)("revert_assessment_red_flags_dismissal", {
      _assessment_id: assessment.id,
    });
    setReverting(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: isPt ? "Dispensa revertida" : "Dismissal reverted" });
    onAssessmentUpdated?.();
  };

  // Translate a raw value (e.g. "neck_pain", "one_month", "anamnesis.pain_type.throbbing")
  // by trying i18n with candidate prefixes. Falls back to a humanized version.
  const tryT = (val: string, prefixes: string[]): string => {
    const raw = String(val).trim();
    if (!raw) return raw;
    const candidates = raw.includes(".") ? [raw] : prefixes.map((p) => `${p}.${raw}`);
    for (const key of candidates) {
      const out = t(key);
      if (out && out !== key) return out;
    }
    // humanize fallback: "one_month" -> "One month"
    const humanized = raw.replace(/^.*\./, "").replace(/_/g, " ");
    return humanized.charAt(0).toUpperCase() + humanized.slice(1);
  };
  const tList = (vals: string[] | string, prefixes: string[]): string => {
    const arr = Array.isArray(vals) ? vals : String(vals).split(",");
    return arr.map((v) => tryT(v, prefixes)).join(", ");
  };

  const anamnesisLines: Array<[string, string]> = [];
  const cc = anamnesis.chiefComplaints || (anamnesis.chiefComplaint ? [anamnesis.chiefComplaint] : []);
  if (cc.length) anamnesisLines.push([isPt ? "Queixa principal" : "Chief complaint", tList(cc, ["anamnesis.complaint"])]);
  if (anamnesis.customComplaint) anamnesisLines.push([isPt ? "Detalhes" : "Details", anamnesis.customComplaint]);
  if (anamnesis.painDuration) anamnesisLines.push([isPt ? "Duração" : "Duration", tryT(anamnesis.painDuration, ["anamnesis.duration"])]);
  if (anamnesis.onset) anamnesisLines.push([isPt ? "Início" : "Onset", tryT(anamnesis.onset, ["anamnesis.onset"])]);
  if (anamnesis.painTypes?.length) anamnesisLines.push([isPt ? "Caráter da dor" : "Pain character", tList(anamnesis.painTypes, ["anamnesis.pain_type"])]);
  if (anamnesis.evolution) anamnesisLines.push([isPt ? "Evolução" : "Evolution", tryT(anamnesis.evolution, ["anamnesis.evolution"])]);
  if (anamnesis.aggravatingFactors) anamnesisLines.push([isPt ? "Fatores de piora" : "Aggravators", anamnesis.aggravatingFactors]);
  if (anamnesis.relievingFactors) anamnesisLines.push([isPt ? "Fatores de alívio" : "Relievers", anamnesis.relievingFactors]);
  if (anamnesis.activityLevel) anamnesisLines.push([isPt ? "Nível de atividade" : "Activity level", tryT(anamnesis.activityLevel, ["anamnesis.activity"])]);

  const treatmentPhases: any[] = assessment.treatment_plan?.phases || [];

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">
            <Sparkles className="h-3 w-3 mr-1" />
            {assessment.type === "premium" ? "Premium" : assessment.type === "professional" ? "Pro" : (isPt ? "Básica" : "Basic")}
          </Badge>
          {assessment.status === "completed" && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1" /> {isPt ? "Concluída" : "Completed"}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(assessment.created_at).toLocaleDateString(isPt ? "pt-BR" : "en-US", {
              day: "2-digit", month: "long", year: "numeric",
            })}
          </span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground leading-tight">
            {isPt ? "Resumo da avaliação" : "Assessment summary"}
          </h1>
          {assessment.patient_name && (
            <p className="text-sm text-muted-foreground mt-0.5">{assessment.patient_name}</p>
          )}
        </div>
      </div>

      {/* Hypothesis */}
      {displayHypothesis && (
        <section className={`rounded-2xl border p-4 space-y-2 ${
          hypothesisSuppressed
            ? "border-amber-300/60 bg-amber-50/50"
            : "border-primary/20 bg-primary/[0.03]"
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <Brain className={`h-4 w-4 ${hypothesisSuppressed ? "text-amber-700" : "text-primary"}`} />
            <h4 className="text-sm font-semibold text-foreground">
              {isPt ? "Hipótese clínica preliminar (IA)" : "Preliminary clinical hypothesis (AI)"}
            </h4>
            {hypothesisSuppressed ? (
              <Badge variant="outline" className="text-[10px] ml-auto bg-amber-100 text-amber-800 border-amber-300">
                {isPt ? "Sob ressalva — requer aval médico" : "Under reservation — requires medical clearance"}
              </Badge>
            ) : (
              <Badge variant="outline" className={`text-[10px] ml-auto ${confidence.cls}`}>
                {isPt ? "Confiança" : "Confidence"}: {confidence.label}
              </Badge>
            )}
          </div>
          {hypothesisSuppressed && (
            <p className="text-[11px] text-amber-900 bg-amber-100/60 rounded p-2 leading-relaxed">
              {isPt
                ? "A hipótese abaixo NÃO deve ser usada para definir conduta enquanto o sinal de alerta não for avaliado por um médico. Após liberação médica, dispense a red flag no botão abaixo para liberar o uso clínico."
                : "The hypothesis below MUST NOT guide treatment until the warning sign is evaluated by a physician. Once cleared, dismiss the red flag with the button below to release it for clinical use."}
            </p>
          )}
          <p className="text-sm text-foreground leading-relaxed">{displayHypothesis}</p>
          {diagnosis.summary && (
            <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-primary/10">
              {diagnosis.summary}
            </p>
          )}
        </section>
      )}

      {/* Red flags */}
      <section
        className={`rounded-2xl border p-3 ${
          redFlagsDetected
            ? (isDismissed
                ? "border-sky-300/60 bg-sky-50/60"
                : "border-amber-300/60 bg-amber-50/60")
            : "border-emerald-200 bg-emerald-50/50"
        }`}
      >
        <div className="flex items-start gap-2">
          {redFlagsDetected ? (
            <ShieldAlert className={`h-4 w-4 shrink-0 mt-0.5 ${isDismissed ? "text-sky-600" : "text-amber-600"}`} />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <p className={`text-xs ${redFlagsDetected ? (isDismissed ? "text-sky-900" : "text-amber-900") : "text-emerald-800"}`}>
            <strong>Red flags:</strong>{" "}
            {redFlagsDetected
              ? (isPt
                  ? "sinais de alerta identificados durante a avaliação."
                  : "warning signs identified during the assessment.")
              : (isPt
                  ? "nenhuma detectada. Caso liberado para abordagem fisioterapêutica."
                  : "none detected. Case cleared for physiotherapy.")}
          </p>
        </div>
        {redFlagsList.length > 0 && (
          <ul className={`mt-2 ml-6 list-disc text-xs space-y-0.5 ${isDismissed ? "text-sky-900" : "text-amber-900"}`}>
            {redFlagsList.map((rf, i) => (
              <li key={i}>{rf}</li>
            ))}
          </ul>
        )}
        {redFlagsDetected && isDismissed && (
          <div className="mt-2 ml-6 text-[11px] text-sky-900 leading-relaxed">
            <p>
              <strong>{isPt ? "Dispensada em" : "Dismissed on"}</strong>{" "}
              {dismissedAt ? new Date(dismissedAt).toLocaleDateString(isPt ? "pt-BR" : "en-US") : ""}{" "}
              {isPt ? "por" : "by"} <strong>{dismissedByName || "—"}</strong>.
            </p>
            {dismissedReason && (
              <p className="mt-1 italic">"{dismissedReason}"</p>
            )}
            {professionalContext && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 h-7 px-2 text-[11px] text-sky-700 hover:text-sky-900"
                onClick={handleRevert}
                disabled={reverting}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {isPt ? "Reverter dispensa" : "Revert dismissal"}
              </Button>
            )}
          </div>
        )}
        {redFlagsDetected && !isDismissed && (
          <>
            <p className="mt-2 ml-6 text-[11px] text-amber-800/80 leading-relaxed">
              {isPt
                ? "Hipótese fisioterapêutica fica sob ressalva até avaliação médica do(s) item(ns) acima. Após liberação, dispense para uso clínico."
                : "Physiotherapy hypothesis is held under reservation until medical evaluation of the item(s) above. Dismiss after clearance."}
            </p>
            {professionalContext && (
              <div className="mt-2 ml-6">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-amber-400 text-amber-800 hover:bg-amber-100"
                  onClick={() => setDismissOpen(true)}
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  {isPt ? "Dispensar red flag" : "Dismiss red flag"}
                </Button>
              </div>
            )}
          </>
        )}
        {triageAnswers.length > 0 && (
          <div className="mt-3 ml-6">
            <button
              type="button"
              onClick={() => setShowTriage((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showTriage ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {isPt ? "Respostas da triagem de segurança" : "Safety screening answers"}
            </button>
            {showTriage && (
              <ul className="mt-2 space-y-1.5">
                {triageAnswers.map((a) => (
                  <li
                    key={a.key}
                    className="flex items-start justify-between gap-3 text-[11px] bg-background/70 rounded-lg px-2.5 py-1.5 border border-border/50"
                  >
                    <span className="text-foreground leading-snug">{a.question}</span>
                    <span className={`shrink-0 font-semibold ${a.positive ? "text-amber-700" : "text-emerald-700"}`}>
                      {a.positive ? (isPt ? "Sim" : "Yes") : isPt ? "Não" : "No"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {professionalContext && (
        <DismissRedFlagDialog
          open={dismissOpen}
          onOpenChange={setDismissOpen}
          assessmentId={assessment.id}
          onDismissed={onAssessmentUpdated}
        />
      )}

      {/* Metrics */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          {isPt ? "Métricas principais" : "Key metrics"}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {!isPreventiveAssessment(anamnesis) && assessment.pain_score != null && (
            <div className="rounded-xl border p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">EVA</p>
              <p className={`text-xl font-bold ${getPainColor(assessment.pain_score)}`}>
                {assessment.pain_score}/10
              </p>
            </div>
          )}
          {qResults.slice(0, 4).map((q) => (
            <div key={q.questionnaireId} className="rounded-xl border p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                {q.questionnaireName || q.questionnaireId?.toUpperCase()}
              </p>
              <p className={`text-xl font-bold ${getSeverityColor(q.severity)}`}>{q.percentageScore}%</p>
            </div>
          ))}
        </div>
      </section>

      <PreventiveAssessmentSummary data={anamnesis} />

      {/* Pain regions */}
      {painRegions.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {isPt ? "Regiões de dor" : "Pain regions"}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {painRegions.map((r) => {
              const s = perRegionScore?.[r];
              return (
                <span
                  key={r}
                  className={`text-xs px-2.5 py-1 rounded-full border bg-muted/40 ${
                    s != null ? getPainColor(s) : "text-foreground"
                  }`}
                >
                  {getRegionLabel(r, isPt)}
                  {s != null ? ` · ${s}/10` : ""}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Anamnesis */}
      {anamnesisLines.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            {isPt ? "Anamnese resumida" : "Anamnesis summary"}
          </h4>
          <div className="rounded-xl border divide-y text-sm overflow-hidden">
            {anamnesisLines.map(([k, v]) => (
              <div key={k} className="px-3 py-2 grid grid-cols-[130px_1fr] gap-2">
                <span className="text-xs text-muted-foreground">{k}</span>
                <span className="text-xs text-foreground break-words">{v}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Functional tests */}
      {funcTests.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            {isPt ? "Testes funcionais" : "Functional tests"}
          </h4>
          <div className="rounded-xl border divide-y overflow-hidden">
            {funcTests.map((r: any, i: number) => {
              const def = functionalTests.find((ft) => ft.id === r.testId);
              const name = def ? t(def.nameKey) : r.testId;
              const positive = !!r.painful;
              const Icon = positive ? AlertCircle : CheckCircle2;
              const color = positive ? "text-destructive" : "text-emerald-600";
              return (
                <div key={`${r.testId}-${i}`} className="px-3 py-2 flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color} shrink-0`} />
                  <span className="text-xs text-foreground flex-1">{name}</span>
                  <span className={`text-xs font-medium ${color}`}>
                    {positive
                      ? (isPt ? "Positivo / com dor" : "Positive / painful")
                      : (isPt ? "Negativo / sem dor" : "Negative / no pain")}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Joint mobility (ADM / ROM) — manual assessments */}
      {sanitizeRomRows(anamnesis?.romTable).length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            {isPt ? "Mobilidade articular (ADM)" : language === "es" ? "Movilidad articular (ADM)" : "Joint mobility (ROM)"}
          </h4>
          <RomTable value={anamnesis.romTable} readOnly bare lang={language} />
        </section>
      )}

      {/* Questionnaires */}
      {qResults.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {isPt ? "Questionários validados" : "Validated questionnaires"}
          </h4>
          <div className="grid sm:grid-cols-2 gap-2">
            {qResults.map((q) => {
              const qDef = questionnaires.find((d) => d.id === q.questionnaireId);
              const color = getSeverityColor(q.severity);
              return (
                <div key={q.questionnaireId} className="rounded-xl border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {q.questionnaireName || qDef?.fullName_pt}
                    </p>
                    <p className={`text-base font-bold ${color} shrink-0`}>{q.percentageScore}%</p>
                  </div>
                  <p className={`text-[11px] ${color}`}>
                    {isPt ? q.interpretation_pt : q.interpretation_en}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Treatment plan */}
      {treatmentPhases.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            {isPt ? "Plano de tratamento" : "Treatment plan"}
          </h4>
          <ul className="rounded-xl border divide-y text-sm overflow-hidden">
            {treatmentPhases.map((p: any, i: number) => (
              <li key={i} className="px-3 py-2 flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
                  {i + 1}
                </span>
                <div className="text-xs text-foreground">
                  <span className="font-semibold">{p.duration || `${isPt ? "Fase" : "Phase"} ${i + 1}`}</span>
                  {p.goal && <span className="text-muted-foreground"> — {p.goal}</span>}
                  {p.focus && <p className="text-[11px] text-muted-foreground mt-0.5">{p.focus}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Disclaimer */}
      {diagnosis.disclaimer && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-50/40 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-900/80 leading-relaxed">{diagnosis.disclaimer}</p>
        </div>
      )}

      {/* Footer actions */}
      <div className={`rounded-2xl border bg-muted/30 p-3 flex flex-col sm:flex-row gap-2 ${embedded ? "" : "sticky bottom-2"}`}>
        {!embedded && onBack && (
          <Button variant="outline" onClick={onBack} className="rounded-xl gap-1.5 sm:flex-none">
            <ArrowLeft className="h-4 w-4" /> {isPt ? "Voltar" : "Back"}
          </Button>
        )}
        {assessment.diagnosis && (
          <>
            <Button
              variant="secondary"
              className="rounded-xl gap-2 flex-1 font-semibold"
              onClick={onDownloadPdf}
              disabled={pdfLoading}
            >
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isPt ? "Baixar relatório PDF" : "Download PDF report"}
            </Button>
            <Button
              className="rounded-xl gap-2 flex-1 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onShareWhatsApp}
              disabled={whatsappLoading}
            >
              {whatsappLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              {isPt ? "Enviar por WhatsApp" : "Share via WhatsApp"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AssessmentSummaryView;
