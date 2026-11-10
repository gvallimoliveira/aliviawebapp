import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PRO_TREATMENT_PRICE_FORMATTED } from "@/constants/pricing";
import { mockClinicalImpressions } from "@/data/mockPatientData";
import { useEffect, useState } from "react";
import { Brain, FileCheck, Loader2, Lock, RefreshCw, Sparkles } from "lucide-react";

export function normalizeTestResults(tr: any): any[] {
  if (Array.isArray(tr)) return tr;
  if (tr && typeof tr === "object" && Object.keys(tr).length > 0) return [tr];
  return [];
}

const ASSESSMENT_TREATMENT_FIELDS = "id, anamnesis_data, test_results, diagnosis, treatment_plan, payment_status";

export const TreatmentUnlockCTA = ({ assessmentId, lifetimeTreatment, clinicMode, compact, conditionLabel, onUnlocked }: {
  assessmentId: string;
  lifetimeTreatment?: boolean;
  clinicMode?: boolean;
  /** Linha discreta (dentro do card de hipótese) em vez do bloco promocional. */
  compact?: boolean;
  conditionLabel?: string | null;
  onUnlocked: (treatmentPlan: any) => void;
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);


  const handleUnlock = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pro-treatment-payment", {
        body: { assessment_id: assessmentId },
      });
      if (error) throw error;

      if (data?.free) {
        const { data: assessment } = await supabase
          .from("assessments")
          .select(ASSESSMENT_TREATMENT_FIELDS)
          .eq("id", assessmentId)
          .single();

        if (!assessment) throw new Error("Assessment not found");

        const { data: genData, error: genError } = await supabase.functions.invoke("generate-treatment", {
          body: {
            anamnesisData: assessment.anamnesis_data,
            testResults: assessment.test_results,
            questionnaireResults: Array.isArray(assessment.test_results) ? assessment.test_results : [],
            diagnosis: assessment.diagnosis,
            mode: "professional",
            language: document.documentElement.lang === "en" ? "en" : "pt",
          },
        });
        if (genError) throw genError;

        await supabase
          .from("assessments")
          .update({ treatment_plan: genData.treatmentPlan, payment_status: "treatment_paid" })
          .eq("id", assessmentId);

        toast({ title: t("pro.treatment_generated") || "Plano de tratamento gerado!" });
        onUnlocked(genData?.treatmentPlan || true);
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: t("payment.error_title"), description: err?.message || t("payment.error_desc"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    const priceSuffix = clinicMode || lifetimeTreatment ? "" : ` — ${PRO_TREATMENT_PRICE_FORMATTED}`;
    return (
      <div className="pt-2 mt-2 border-t border-border/60 flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground flex-1 min-w-[180px]">
          Gerar plano de tratamento{conditionLabel ? <> para <span className="italic text-foreground">{conditionLabel}</span></> : null}?
        </p>
        <Button onClick={handleUnlock} disabled={loading} size="sm" variant="outline" className="h-7 gap-1.5 text-xs rounded-lg">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Gerando…" : `Gerar plano${priceSuffix}`}
        </Button>
      </div>
    );
  }


  return (
    <div className="border-t border-primary/20 pt-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">
              {clinicMode ? "Gerar plano de tratamento" : t("pro.unlock_treatment_cta")}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {clinicMode
                ? "Incluído no plano da clínica — geração ilimitada e gratuita."
                : t("pro.unlock_treatment_desc")}
            </p>
          </div>
        </div>
        <Button onClick={handleUnlock} disabled={loading} size="sm" className="w-full rounded-xl gap-1.5 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : clinicMode ? <Sparkles className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {clinicMode
            ? "Gerar plano de tratamento"
            : lifetimeTreatment
              ? t("pro.unlock_treatment_cta")
              : `${t("pro.unlock_treatment_cta")} — ${PRO_TREATMENT_PRICE_FORMATTED}`}
        </Button>
      </div>
    </div>
  );
};

export const TreatmentPaidRetry = ({ assessmentId, onGenerated }: {
  assessmentId: string;
  onGenerated: (treatmentPlan: any) => void;
}) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const { data: assessment } = await supabase
        .from("assessments")
        .select(ASSESSMENT_TREATMENT_FIELDS)
        .eq("id", assessmentId)
        .single();

      if (!assessment) throw new Error("Assessment not found");

      const { data: treatmentData, error } = await supabase.functions.invoke("generate-treatment", {
        body: {
          anamnesisData: assessment.anamnesis_data,
          testResults: assessment.test_results,
          questionnaireResults: Array.isArray(assessment.test_results) ? assessment.test_results : [],
          diagnosis: assessment.diagnosis,
          mode: "professional",
          language,
        },
      });

      if (error) throw error;

      await supabase
        .from("assessments")
        .update({ treatment_plan: treatmentData.treatmentPlan })
        .eq("id", assessmentId);

      toast({ title: t("pro.treatment_generated") || "Plano de tratamento gerado!" });
      onGenerated(treatmentData.treatmentPlan);
    } catch (err: any) {
      toast({ title: "Erro ao gerar tratamento", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-primary/20 pt-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
            <FileCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Pagamento confirmado!</p>
            <p className="text-[10px] text-muted-foreground">Clique para gerar o plano de tratamento.</p>
          </div>
        </div>
        <Button onClick={handleRetry} disabled={loading} size="sm" className="w-full rounded-xl gap-1.5 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Gerando tratamento..." : "Gerar Plano de Tratamento"}
        </Button>
      </div>
    </div>
  );
};

export const ClinicalImpressionCard = ({ assessment, existingImpression, allAssessments, isDemo }: {
  assessment: any;
  existingImpression?: { overview: string; therapeuticObjectives: string[] } | null;
  allAssessments?: any[];
  isDemo?: boolean;
}) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [impression, setImpression] = useState<{ overview: string; therapeuticObjectives: string[] } | null>(existingImpression || null);
  // Reconcile saved edits and patient changes without another AI request.
  useEffect(() => {
    setImpression(existingImpression?.overview ? existingImpression : null);
  }, [assessment?.id, existingImpression]);

  const buildTimeline = () => {
    if (!allAssessments || allAssessments.length === 0) return undefined;
    const withDiagnosis = allAssessments
      .filter((a: any) => a.diagnosis)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (withDiagnosis.length === 0) return undefined;
    return withDiagnosis.map((a: any) => {
      const results = normalizeTestResults(a.test_results);
      const questionnaires = results
        .filter((r: any) => r.questionnaireId && r.percentageScore != null)
        .map((r: any) => ({ name: r.questionnaireId, score: `${Math.round(r.percentageScore)}%` }));
      return {
        date: new Date(a.created_at).toLocaleDateString("pt-BR"),
        pain_score: a.pain_score,
        pain_regions: a.pain_regions || [],
        hypothesis: a.diagnosis?.hypothesis || null,
        questionnaires,
      };
    });
  };

  const fetchSessionNotes = async () => {
    const email = assessment?.patient_email || assessment?.email;
    if (!email) return undefined;
    try {
      const { data } = await supabase
        .from("session_notes")
        .select("session_date, content")
        .eq("patient_email", email)
        .order("session_date", { ascending: true })
        .limit(12);
      const notes = (data || []).filter((n: any) => (n.content || "").trim().length > 0);
      return notes.length > 0 ? notes : undefined;
    } catch (e) {
      console.warn("session notes fetch failed", e);
      return undefined;
    }
  };

  // Voice notes (anamnesis interview recordings) linked to ANY of this patient's
  // assessments — the transcripts/summaries are a rich first-person source for
  // the clinical impression.
  const fetchVoiceNotes = async () => {
    try {
      const ids = Array.from(
        new Set(
          [assessment?.id, ...(allAssessments || []).map((a: any) => a?.id)].filter(Boolean),
        ),
      ) as string[];
      if (ids.length === 0) return undefined;
      const { data } = await supabase
        .from("assessment_voice_notes")
        .select("created_at, transcript, summary")
        .eq("status", "ready")
        .in("assessment_id", ids)
        .order("created_at", { ascending: true })
        .limit(5);
      const notes = (data || []).filter(
        (n: any) => (n.transcript || "").trim().length > 0 || (n.summary && Object.keys(n.summary).length > 0),
      );
      return notes.length > 0 ? notes : undefined;
    } catch (e) {
      console.warn("voice notes fetch failed", e);
      return undefined;
    }
  };

  const generate = async (forceRefresh = false) => {
    setLoading(true);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 1200));
        const mockCI = mockClinicalImpressions[assessment.id];
        if (mockCI) {
          setImpression(mockCI);
        } else {
          setImpression({
            overview: "Impressão clínica simulada para demonstração. Em dados reais, a IA analisará todos os dados clínicos do paciente.",
            therapeuticObjectives: ["Objetivo terapêutico simulado 1", "Objetivo terapêutico simulado 2"],
          });
        }
      } else {
        // Session notes are intentionally not used in the clinical impression.
        const sessionNotes: never[] = [];
        const voiceNotes = await fetchVoiceNotes();
        // Optional PhysioTech exams: any failure falls back to the existing flow.
        let physiotechReports: unknown[] | undefined;
        try {
          const email = String((assessment as any).patient_email || "").trim().toLowerCase();
          const { data: pats } = email
            ? await supabase.from("patients").select("id").ilike("email", email).limit(5)
            : { data: null };
          const ids = (pats || []).map((p: any) => p.id);
          if (ids.length) {
            const { data: reps } = await supabase.from("physiotech_reports")
              .select("exam_type, exam_title, exam_date, conclusion, metrics")
              .in("patient_id", ids).order("exam_date", { ascending: false }).limit(5);
            if (reps?.length) physiotechReports = reps;
          }
        } catch { physiotechReports = undefined; }
        const { data, error } = await supabase.functions.invoke("generate-clinical-impression", {
          body: {
            anamnesisData: assessment.anamnesis_data,
            painRegions: assessment.pain_regions,
            painScore: assessment.pain_score,
            questionnaireResults: assessment.test_results,
            diagnosis: assessment.diagnosis,
            language,
            assessmentTimeline: buildTimeline(),
            sessionNotes,
            voiceNotes,
            physiotechReports,
            forceRefresh,
          },
        });
        if (error) throw error;
        const ci = data?.clinicalImpression;
        if (!ci?.overview) throw new Error("Empty response");
        const updatedDiagnosis = { ...(assessment.diagnosis || {}), clinicalImpression: ci };
        const { error: saveError } = await supabase.from("assessments")
          .update({ diagnosis: updatedDiagnosis as any, needs_reimpression: false }).eq("id", assessment.id);
        if (saveError) throw saveError;
        assessment.diagnosis = updatedDiagnosis;
        assessment.needs_reimpression = false;
        setImpression(ci);
      }
    } catch (err: any) {
      console.error("Clinical impression error:", err);
      toast({ title: "Erro", description: "Não foi possível gerar a impressão clínica.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  // New data does not silently spend credits or replace the saved impression.


  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Impressão Clínica
          </CardTitle>
          <div className="flex items-center gap-2">
            {impression && (
              <Button variant="ghost" size="sm" onClick={() => generate(true)} disabled={loading} className="h-7 px-2 text-xs gap-1">
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Regenerar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {assessment?.needs_reimpression && impression && (
          <p className="mb-3 text-xs text-muted-foreground">
            {language === "pt" ? "Há novos dados na avaliação. A impressão salva foi preservada; você pode regenerá-la se necessário."
              : language === "es" ? "Hay nuevos datos en la evaluación. La impresión guardada se conserva; puede regenerarla si es necesario."
              : "New assessment data is available. The saved impression is preserved; you can regenerate it if needed."}
          </p>
        )}
        {!impression && !loading && (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">Gere uma visão integrativa do quadro clínico baseada nos dados da avaliação.</p>
            <Button onClick={() => generate()} size="sm" className="rounded-xl gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Gerar Impressão Clínica
            </Button>
          </div>
        )}
        {loading && !impression && (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analisando dados clínicos...</span>
          </div>
        )}
        {impression && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground italic leading-relaxed whitespace-pre-line">{impression.overview}</p>
            {impression.therapeuticObjectives?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Objetivos Terapêuticos Principais:</p>
                <div className="flex flex-wrap gap-2">
                  {impression.therapeuticObjectives.map((obj, i) => (
                    <Badge key={i} variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      {obj}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};