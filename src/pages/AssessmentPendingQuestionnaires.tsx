import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ClipboardList } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import QuestionnaireStep from "@/components/assessment/QuestionnaireStep";
import {
  getSpecialtyQuestionnaire,
  scoreSpecialtyQuestionnaire,
} from "@/data/specialtyQuestionnaires";
import ClinicBrandHeader, { type ClinicLinkBranding } from "@/components/ClinicBrandHeader";
import { clinicAssessmentTheme } from "@/lib/clinicAssessmentTheme";
import { useToast } from "@/hooks/use-toast";
import type { QuestionnaireResult } from "@/data/questionnaireData";

type PendingRow = {
  id: string;
  questionnaire_id: string;
  domain: string;
  status: string;
  suggested_reason?: string | null;
  completed_at?: string | null;
};

type Loaded = {
  branding?: ClinicLinkBranding;
  assessment: { id: string; pain_regions: string[]; patient_name: string };
  pending: PendingRow[];
};

export default function AssessmentPendingQuestionnaires() {
  const { assessmentId } = useParams();
  const { language } = useLanguage();
  const isPt = language === "pt";
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Loaded | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generalDone, setGeneralDone] = useState(false);

  const reload = async (afterSubmit = false) => {
    if (!assessmentId) return;
    if (!afterSubmit) setLoading(true);
    try {
      const { data: resp, error: err } = await supabase.functions.invoke(
        "assessment-pending-questionnaires",
        { body: { action: "load", assessmentId } },
      );
      if (err) throw err;
      if (resp?.error) throw new Error(resp.error);
      setData(resp);
    } catch (e: any) {
      // After a successful submit, keep the "all done" screen instead of an error.
      if (!afterSubmit) setError(e?.message || "not_found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, [assessmentId]);

  const generalPending = useMemo(
    () => (data?.pending || []).filter((p) => p.domain === "general" && p.status === "pending"),
    [data],
  );
  const specialtyPending = useMemo(
    () => (data?.pending || []).filter((p) => p.domain !== "general" && p.status === "pending"),
    [data],
  );
  const completedCount = useMemo(
    () => (data?.pending || []).filter((p) => p.status === "completed").length,
    [data],
  );
  const totalCount = data?.pending.length ?? 0;
  const allDone = totalCount > 0 && completedCount >= totalCount;

  const handleGeneralComplete = async (results: QuestionnaireResult[]) => {
    if (!assessmentId) return;
    setSubmitting(true);
    try {
      const { data: resp, error: err } = await supabase.functions.invoke(
        "assessment-pending-questionnaires",
        { body: { action: "submit_general", assessmentId, results } },
      );
      if (err) throw err;
      if (resp?.error) throw new Error(resp.error);
      setGeneralDone(true);
      toast({
        title: isPt ? "Respostas enviadas!" : "Answers submitted!",
        description: isPt
          ? "Seu profissional receberá os resultados automaticamente."
          : "Your professional will receive the results automatically.",
      });
      await reload(true);
    } catch (e: any) {
      toast({
        title: isPt ? "Erro ao enviar" : "Submission failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-base">
              {isPt ? "Link inválido ou expirado" : "Invalid or expired link"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isPt
              ? "Não conseguimos carregar seus questionários. Verifique com seu profissional."
              : "We couldn't load your questionnaires. Please contact your professional."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" style={clinicAssessmentTheme(data.branding?.clinic_brand_color)}>
      <div className="max-w-2xl mx-auto space-y-4">
        <ClinicBrandHeader {...data.branding} />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <ClipboardList className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">
                {isPt ? "Questionários da sua avaliação" : "Your assessment questionnaires"}
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {completedCount}/{totalCount}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isPt
                ? `Olá ${data.assessment.patient_name || ""}! Responda os questionários abaixo — eles ficam vinculados à sua avaliação atual.`
                : `Hi ${data.assessment.patient_name || ""}! Please answer the questionnaires below — they're tied to your current assessment.`}
            </p>
          </CardHeader>
        </Card>

        {totalCount === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="font-semibold text-sm">
                {isPt ? "Nenhum questionário pendente" : "No pending questionnaires"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPt
                  ? "Este link não tem questionários a responder no momento. Fale com seu profissional se acha que isso é um engano."
                  : "This link has no questionnaires to answer right now. Contact your professional if you believe this is a mistake."}
              </p>
            </CardContent>
          </Card>
        ) : allDone || (generalDone && specialtyPending.length === 0) ? (
          <Card>
            <CardContent className="pt-6 pb-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="font-semibold">{isPt ? "Tudo respondido!" : "All done!"}</p>
              <p className="text-sm text-muted-foreground">
                {isPt
                  ? "Obrigado. Seu profissional já recebeu os resultados."
                  : "Thanks! Your professional has already received the results."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {generalPending.length > 0 && !generalDone && (
              <Card>
                <CardContent className="pt-4">
                  <QuestionnaireStep
                    painRegions={data.assessment.pain_regions || []}
                    onComplete={handleGeneralComplete}
                    onBack={() => { /* noop — first screen for patient */ }}
                    onSkip={() => { /* noop */ }}
                  />
                  {submitting && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {isPt ? "Enviando…" : "Sending…"}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {specialtyPending.map((row) => (
              <SpecialtyForm
                key={row.id}
                row={row}
                assessmentId={data.assessment.id}
                isPt={isPt}
                onSubmitted={() => reload(true)}
              />
            ))}
          </>
        )}

        <p className="text-[10px] text-center text-muted-foreground">
          {isPt
            ? "Suas respostas são confidenciais e enviadas apenas ao seu profissional."
            : "Your answers are confidential and shared only with your professional."}
        </p>
      </div>
    </div>
  );
}

// --- Specialty (cardio/geri) inline form ----------------------------------
function SpecialtyForm({
  row,
  assessmentId,
  isPt,
  onSubmitted,
}: {
  row: PendingRow;
  assessmentId: string;
  isPt: boolean;
  onSubmitted: () => void;
}) {
  const { toast } = useToast();
  const q = useMemo(() => getSpecialtyQuestionnaire(row.questionnaire_id), [row.questionnaire_id]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!q) return null;

  const handleSubmit = async () => {
    const missing = q.items.find((it) => answers[it.id] === undefined);
    if (missing) {
      toast({
        title: isPt ? "Responda todas as perguntas" : "Please answer all questions",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const score = scoreSpecialtyQuestionnaire(q.id, answers);
      const { data: resp, error: err } = await supabase.functions.invoke(
        "assessment-pending-questionnaires",
        {
          body: {
            action: "submit_specialty",
            assessmentId,
            questionnaireId: q.id,
            answers,
            score,
          },
        },
      );
      if (err) throw err;
      if (resp?.error) throw new Error(resp.error);
      onSubmitted();
    } catch (e: any) {
      toast({
        title: isPt ? "Erro ao enviar" : "Submission failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          {isPt ? q.fullName_pt : q.fullName_en}
        </CardTitle>
        {row.suggested_reason && (
          <p className="text-[11px] italic text-muted-foreground">
            {isPt ? "Motivo: " : "Reason: "}{row.suggested_reason}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {q.items.map((it, idx) => (
          <div key={it.id} className="space-y-1.5 border-b border-border/40 last:border-0 pb-3 last:pb-0">
            <p className="text-sm leading-snug">
              <span className="text-muted-foreground mr-1">{idx + 1}.</span>
              {isPt ? it.text_pt : it.text_en}
            </p>
            {it.type === "choice" && it.options && (
              <div className="space-y-1">
                {it.options.map((op) => (
                  <label key={op.value} className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50">
                    <input
                      type="radio"
                      name={`${row.id}-${it.id}`}
                      checked={answers[it.id] === op.value}
                      onChange={() => setAnswers((a) => ({ ...a, [it.id]: op.value }))}
                    />
                    <span>{isPt ? op.label_pt : op.label_en}</span>
                  </label>
                ))}
              </div>
            )}
            {it.type === "number" && (
              <input
                type="number"
                min={it.min}
                max={it.max}
                value={answers[it.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [it.id]: Number(e.target.value) || 0 }))}
                className="h-9 w-32 rounded-md border border-input bg-background px-3 text-sm"
              />
            )}
          </div>
        ))}
        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isPt ? "Enviar respostas" : "Submit answers"}
        </Button>
      </CardContent>
    </Card>
  );
}
