import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Heart, Footprints } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getSpecialtyQuestionnaire,
  scoreSpecialtyQuestionnaire,
  type SpecQuestionnaire,
} from "@/data/specialtyQuestionnaires";
import ClinicBrandHeader, { type ClinicLinkBranding } from "@/components/ClinicBrandHeader";
import { clinicAssessmentTheme } from "@/lib/clinicAssessmentTheme";
import { useToast } from "@/hooks/use-toast";

export default function PendingQuestionnaire() {
  const { token } = useParams();
  const { language } = useLanguage();
  const isPt = language === "pt";
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [branding, setBranding] = useState<ClinicLinkBranding | null>(null);

  const q: SpecQuestionnaire | null = useMemo(
    () => (pending ? getSpecialtyQuestionnaire(pending.questionnaire_id) ?? null : null),
    [pending],
  );

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error: err } = await supabase.functions.invoke("submit-pending-questionnaire", {
          body: { action: "load", token },
        });
        if (err) throw err;
        if (data?.error) throw new Error(data.error);
        setPending(data.pending);
        setBranding(data.branding);
        if (data.pending?.status === "completed") setDone(true);
      } catch (e: any) {
        setError(e?.message || "not_found");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!q || !pending) return;
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
      const { data, error: err } = await supabase.functions.invoke("submit-pending-questionnaire", {
        body: { action: "submit", token, answers, score },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      setDone(true);
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

  if (error || !pending || !q) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" style={clinicAssessmentTheme(branding?.clinic_brand_color)}>
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-base">
              {isPt ? "Link inválido ou expirado" : "Invalid or expired link"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isPt
              ? "Não conseguimos carregar este questionário. Verifique com o profissional."
              : "We couldn't load this questionnaire. Please contact your professional."}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" style={clinicAssessmentTheme(branding?.clinic_brand_color)}>
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6 pb-6 space-y-3">
            <ClinicBrandHeader {...branding} />
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="font-semibold">{isPt ? "Resposta enviada!" : "Submitted!"}</p>
            <p className="text-sm text-muted-foreground">
              {isPt
                ? "Obrigado. Seu profissional receberá os resultados automaticamente."
                : "Thank you. Your professional will receive the results automatically."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = q.domain === "cardio" ? Heart : Footprints;

  return (
    <div className="min-h-screen bg-background py-8 px-4" style={clinicAssessmentTheme(branding?.clinic_brand_color)}>
      <div className="max-w-xl mx-auto space-y-4">
        <ClinicBrandHeader {...branding} />
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Icon className={`h-4 w-4 ${q.domain === "cardio" ? "text-rose-500" : "text-amber-600"}`} />
              <CardTitle className="text-base">{isPt ? q.fullName_pt : q.fullName_en}</CardTitle>
              <Badge variant="outline" className="text-[10px]">~{q.avgMinutes} min</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isPt ? q.description_pt : q.description_en}
            </p>
            {pending.suggested_reason && (
              <p className="text-[11px] italic text-muted-foreground mt-1">
                {isPt ? "Motivo: " : "Reason: "}{pending.suggested_reason}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {q.items.map((it, idx) => (
              <div key={it.id} className="space-y-2 border-b border-border/40 last:border-0 pb-3 last:pb-0">
                <Label className="text-sm leading-snug block">
                  <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                  {isPt ? it.text_pt : it.text_en}
                </Label>
                {it.type === "choice" && it.options && (
                  <div className="space-y-1">
                    {it.options.map((op) => (
                      <label
                        key={op.value}
                        className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50"
                      >
                        <input
                          type="radio"
                          name={it.id}
                          checked={answers[it.id] === op.value}
                          onChange={() => setAnswers((a) => ({ ...a, [it.id]: op.value }))}
                        />
                        <span>{isPt ? op.label_pt : op.label_en}</span>
                      </label>
                    ))}
                  </div>
                )}
                {it.type === "number" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={it.min}
                      max={it.max}
                      value={answers[it.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [it.id]: Number(e.target.value) || 0 }))
                      }
                      className="h-9 w-32"
                    />
                    <span className="text-xs text-muted-foreground">
                      {isPt ? it.unit_pt : it.unit_en}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isPt ? "Enviar respostas" : "Submit answers"}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              {isPt
                ? "Suas respostas são confidenciais e enviadas apenas ao seu profissional."
                : "Your answers are confidential and shared only with your professional."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
