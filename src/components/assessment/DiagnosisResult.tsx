import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Info, ArrowLeft, Sparkles, Lock, Timer, FileText, Download, Share2, Loader2, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PREMIUM_PRICE_FORMATTED, PREMIUM_SINGLE_PRICE_FORMATTED } from "@/constants/pricing";
import EmergencyBanner from "@/components/EmergencyBanner";
import PainMechanismBadge from "@/components/assessment/PainMechanismBadge";



interface Diagnosis {
  hypothesis: string;
  confidence: "low" | "moderate" | "high";
  summary: string;
  explanation?: string;
  reasoning?: string;
  recommendations?: string[];
  disclaimer: string;
  /** Passo E1 — triagem de mecanismo de dor (jsonb), quando houve. */
  pain_mechanism?: unknown;
  hypothesisChange?: {
    previousHypothesis?: string;
    currentHypothesis?: string;
    reason?: string;
  } | null;
}

interface DiagnosisResultProps {
  diagnosis: Diagnosis;
  mode: "basic" | "premium";
  onBack: () => void;
  onNewAssessment: () => void;
  onGenerateTreatment?: () => void;
  assessmentId?: string | null;
  patientName?: string;
  patientEmail?: string;
  painRegions?: string[];
  painScore?: number;
  anamnesisData?: any;
  testResults?: any;
  hideFooterActions?: boolean;
  /** Probatory red-flag payload from this flow, carried into the premium upgrade. */
  redFlagPayload?: any;
}

const BlurredPreview = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="rounded-xl overflow-hidden relative">
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="relative">
      <div className="blur-[6px] select-none pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 rounded-full bg-background/90 border border-primary/30 px-4 py-2 shadow-lg">
          <Lock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Premium</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const DiagnosisResult = ({ diagnosis, mode, onBack, onNewAssessment, onGenerateTreatment, assessmentId, patientName, patientEmail, painRegions, painScore, anamnesisData, testResults, hideFooterActions, redFlagPayload }: DiagnosisResultProps) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  const reportUserName = patientName || user?.user_metadata?.full_name || "Paciente";

  const resolveBranding = async () => {
    if (!assessmentId) return {};
    try {
      const { data: a } = await supabase
        .from("assessments")
        .select("clinic_id, professional_id")
        .eq("id", assessmentId)
        .setHeader("x-assessment-id", assessmentId)
        .maybeSingle();
      if (!a) return {};
      const { resolveAssessmentBranding } = await import("@/lib/resolveAssessmentBranding");
      const branding = await resolveAssessmentBranding({
        clinicId: (a as any).clinic_id || null,
        professionalId: (a as any).professional_id || null,
        userId: user?.id || null,
      });
      return {
        professionalLogoUrl: branding.professionalLogoUrl,
        clinicLogoUrl: branding.clinicLogoUrl,
        clinicName: branding.clinicName,
        brandColor: branding.brandColor,
        responsibleProfessional: branding.responsibleProfessional,
      };
    } catch {
      return {};
    }
  };

  // Red-flag screening record, so the downloaded report always carries the
  // probatory answers from this very flow (not only when re-opened later).
  const redFlagPdfFields = redFlagPayload
    ? {
        redFlags: (redFlagPayload as any).detected || [],
        redFlagAnswers: (redFlagPayload as any).answers || [],
        redFlagsAnsweredAt: (redFlagPayload as any).answered_at,
      }
    : {};

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      const { generateAssessmentPdf } = await import("@/utils/generatePdf");
      const branding = await resolveBranding();
      await generateAssessmentPdf({
        diagnosis,
        language,
        userName: reportUserName,
        anamnesisData,
        painRegions,
        testResults,
        ...redFlagPdfFields,
        ...branding,
      } as any);
      toast({ title: t("pdf.success") });
    } catch (err) {
      console.error("PDF export error:", err);
      toast({ title: t("pdf.error"), variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setWhatsappLoading(true);
    try {
      const { sharePdfFile, shareTextOrOpenWhatsApp } = await import("@/lib/whatsappShare");
      const { generateAssessmentPdfBlob } = await import("@/utils/generatePdf");
      const branding = await resolveBranding();
      const pdfBlob = await generateAssessmentPdfBlob({
        diagnosis,
        language,
        userName: reportUserName,
        anamnesisData,
        painRegions,
        testResults,
        ...redFlagPdfFields,
        ...branding,
      } as any);

      const patientLabel = reportUserName || diagnosis.hypothesis || "Paciente";
      const nativeShareResult = await sharePdfFile({
        blob: pdfBlob,
        fileName: `AliviA_Relatorio_${patientLabel.replace(/\s+/g, "_")}.pdf`,
        title: "Aliv.iA",
        text: language === "pt" ? `Relatório em PDF de ${patientLabel}` : `PDF report for ${patientLabel}`,
      });
      if (nativeShareResult === "shared" || nativeShareResult === "cancelled") return;

      let publicUrl: string | null = null;
      const fileId = assessmentId || crypto.randomUUID();
      try {
        const filePath = user ? `${user.id}/${fileId}_hypothesis.pdf` : `${fileId}_hypothesis.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("assessment-reports")
          .upload(filePath, pdfBlob, { contentType: "application/pdf", upsert: true });
        if (uploadError) throw uploadError;
        publicUrl = supabase.storage.from("assessment-reports").getPublicUrl(filePath).data.publicUrl;
      } catch (uploadErr) {
        console.warn("Upload failed, downloading locally", uploadErr);
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `alivia_assessment_${fileId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: t("pdf.success") });
        return;
      }

      const { getPublicOrigin } = await import("@/lib/getPublicOrigin");
      const pdfLine = publicUrl ? `\n\n📄 ${language === "pt" ? "Relatório em PDF" : "PDF Report"}:\n${publicUrl}` : "";
      const text = `🩺 *Aliv.iA*\n\n📋 *${t("diagnosis.hypothesis")}:* ${diagnosis.hypothesis}${pdfLine}\n\n💡 ${language === "pt" ? "Faça sua avaliação" : "Start your assessment"}:\n${getPublicOrigin()}`;
      await shareTextOrOpenWhatsApp(text, "Aliv.iA");
    } catch (err) {
      console.error("WhatsApp share error:", err);
      toast({ title: t("pdf.error"), variant: "destructive" });
    } finally {
      setWhatsappLoading(false);
    }
  };


  // 5-minute countdown timer for basic mode urgency
  const [secondsLeft, setSecondsLeft] = useState(300);
  useEffect(() => {
    if (mode !== "basic") return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerText = secondsLeft > 0
    ? `⏳ ${t("diagnosis.timer_valid")} ${minutes}:${seconds.toString().padStart(2, "0")}`
    : `⏳ ${t("diagnosis.timer_expired")}`;

  const confidenceConfig = {
    low: { color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", icon: AlertTriangle, label: t("diagnosis.confidence.low") },
    moderate: { color: "text-primary", bg: "bg-primary/5 border-primary/20", icon: Info, label: t("diagnosis.confidence.moderate") },
    high: { color: "text-green-600", bg: "bg-green-50 border-green-200", icon: CheckCircle, label: t("diagnosis.confidence.high") },
  };

  const conf = confidenceConfig[diagnosis.confidence] || confidenceConfig.moderate;
  const ConfIcon = conf.icon;

  // Fake blurred content for basic mode preview
  const fakeExplanation = "Com base nos dados coletados durante sua avaliação, identificamos padrões consistentes que apontam para um quadro de origem mecânica. A região afetada apresenta sinais de sobrecarga crônica, possivelmente agravada por fatores posturais e de movimento repetitivo no dia a dia.";
  const fakeRecommendations = [
    "Exercícios de mobilidade articular diários por 10-15 minutos",
    "Fortalecimento progressivo da musculatura estabilizadora",
    "Ajustes ergonômicos no ambiente de trabalho",
    "Técnicas de auto-liberação miofascial antes de dormir",
  ];
  const fakeTreatment = "Plano personalizado em 3 fases com exercícios específicos, critérios de progressão e vídeos demonstrativos para cada etapa do seu tratamento.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          {t("diagnosis.title")}
        </div>
        <h2 className="text-2xl font-bold text-foreground">{diagnosis.hypothesis}</h2>
        {/* Passo E1 — mecanismo de dor em linguagem leiga */}
        {diagnosis.pain_mechanism && (
          <div className="flex justify-center">
            <PainMechanismBadge
              mechanism={diagnosis.pain_mechanism}
              variant="patient"
              language={(language === "en" || language === "es" ? language : "pt") as "pt" | "en" | "es"}
            />
          </div>
        )}
      </div>

      {/* Confidence Badge — only show for high confidence */}
      {diagnosis.confidence === "high" && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${conf.bg}`}>
          <ConfIcon className={`h-5 w-5 ${conf.color}`} />
          <span className={`text-sm font-medium ${conf.color}`}>
            {t("diagnosis.confidence_label")}: {conf.label}
          </span>
        </div>
      )}

      {/* Summary */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("diagnosis.summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{diagnosis.summary}</p>
        </CardContent>
      </Card>

      {/* Continuity: hypothesis refined/changed vs. the basic assessment */}
      {mode === "premium" && diagnosis.hypothesisChange?.reason && (
        <Card className="rounded-xl border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              {language === "en"
                ? "Your hypothesis was refined"
                : language === "es"
                ? "Tu hipótesis fue refinada"
                : "Sua hipótese foi refinada"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {diagnosis.hypothesisChange.previousHypothesis && (
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">
                  {language === "en" ? "Initial assessment" : language === "es" ? "Evaluación inicial" : "Avaliação inicial"}:
                </span>{" "}
                {diagnosis.hypothesisChange.previousHypothesis}
                {" → "}
                <span className="font-medium">
                  {diagnosis.hypothesisChange.currentHypothesis || diagnosis.hypothesis}
                </span>
              </p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {diagnosis.hypothesisChange.reason}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Premium-only sections (shown normally for premium, blurred for basic) */}
      {mode === "premium" && diagnosis.explanation && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("diagnosis.explanation")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{diagnosis.explanation}</p>
          </CardContent>
        </Card>
      )}

      {mode === "premium" && diagnosis.reasoning && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("diagnosis.reasoning")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{diagnosis.reasoning}</p>
          </CardContent>
        </Card>
      )}

      {mode === "premium" && diagnosis.recommendations && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("diagnosis.recommendations")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {diagnosis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Premium: Generate Treatment Plan CTA */}
      {mode === "premium" && onGenerateTreatment && (
        <Card className="rounded-xl border-primary/30 bg-primary/5">
          <CardContent className="py-4 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">{t("diagnosis.treatment_cta_text")}</p>
            <Button onClick={onGenerateTreatment} className="rounded-xl gap-2">
              <Sparkles className="h-4 w-4" />
              {t("diagnosis.generate_treatment")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Premium: report actions (PDF / WhatsApp) available already at this step */}
      {mode === "premium" && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {t("diagnosis.report_title") || "Laudo da avaliação"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {onGenerateTreatment
                ? t("diagnosis.report_hint_full") ||
                  "Você já pode baixar ou enviar o laudo com a hipótese clínica. Se gerar o plano de tratamento, um novo laudo completo (com exercícios e fases) ficará disponível na tela seguinte."
                : t("diagnosis.report_hint") || "Baixe ou envie o laudo com a hipótese clínica."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExportPdf} disabled={pdfLoading} className="rounded-xl gap-2">
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t("diagnosis.download_report") || "Baixar laudo em PDF"}
              </Button>

              <Button variant="outline" onClick={handleShareWhatsApp} disabled={whatsappLoading} className="rounded-xl gap-2">
                {whatsappLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Basic mode: blurred preview + unlock CTA */}
      {mode === "basic" && (
        <>
          <BlurredPreview title={t("diagnosis.explanation")}>
            <p className="text-sm text-muted-foreground leading-relaxed">{fakeExplanation}</p>
          </BlurredPreview>

          <BlurredPreview title={t("diagnosis.recommendations")}>
            <ul className="space-y-2">
              {fakeRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </BlurredPreview>

          <BlurredPreview title={t("treatment.title")}>
            <p className="text-sm text-muted-foreground leading-relaxed">{fakeTreatment}</p>
          </BlurredPreview>

          {/* Unlock CTA — Dual pricing */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {/* Primary: Single assessment */}
            <Card className="rounded-xl border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg shadow-primary/5 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2.5 py-1 rounded-full">
                  {t("diagnosis.recommended") || "Recomendado"}
                </span>
              </div>
              <CardContent className="py-6 text-center space-y-4">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("diagnosis.single_title") || "Avaliação Premium Avulsa"}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{PREMIUM_SINGLE_PRICE_FORMATTED}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("diagnosis.single_desc") || "Pagamento único — resultado completo agora"}</p>
                </div>
                {/* Urgency timer */}
                <div className={`flex items-center justify-center gap-1.5 text-sm font-semibold ${secondsLeft > 0 ? "text-amber-600 animate-pulse" : "text-muted-foreground"}`}>
                  <Timer className="h-4 w-4" />
                  {timerText}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                  {t("diagnosis.blurred_hint")}
                </p>
                <Button
                  size="lg"
                  onClick={() => {
                    // Save basic assessment data for upgrade continuity
                    const upgradeData = JSON.stringify({
                      anamnesisData: anamnesisData || null,
                      painRegions: painRegions || [],
                      painScore: painScore,
                      capturedName: patientName || "",
                      capturedEmail: patientEmail || "",
                      redFlagPayload: redFlagPayload || null,
                      basicDiagnosis: {
                        hypothesis: diagnosis.hypothesis,
                        confidence: diagnosis.confidence,
                        summary: diagnosis.summary,
                      },
                    });
                    sessionStorage.setItem("alivia-basic-upgrade-data", upgradeData);
                    localStorage.setItem("alivia-basic-upgrade-data", upgradeData);
                    localStorage.setItem("alivia-basic-upgrade-expiry", String(Date.now() + 30 * 60 * 1000));
                    navigate("/upgrade-welcome", { state: { redirectTo: "/assessment/premium", planType: "single" } });
                  }}
                  className="rounded-xl gap-2 px-8 py-6 text-base w-full"
                >
                  <Sparkles className="h-4 w-4" />
                  {t("diagnosis.unlock_single") || "Desbloquear por"} {PREMIUM_SINGLE_PRICE_FORMATTED}
                </Button>
              </CardContent>
            </Card>

            {/* Secondary: Monthly plan */}
            <Card className="rounded-xl border-border/50">
              <CardContent className="py-4 text-center space-y-3">
                <p className="text-sm font-medium text-foreground">{t("diagnosis.monthly_title") || "Ou assine o plano mensal"}</p>
                <p className="text-xl font-bold text-foreground">{PREMIUM_PRICE_FORMATTED}</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {t("diagnosis.monthly_desc") || "Inclui 2 avaliações/mês + diário de dor + histórico + comparação de métricas"}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    const upgradeData = JSON.stringify({
                      anamnesisData: anamnesisData || null,
                      painRegions: painRegions || [],
                      painScore: painScore,
                      capturedName: patientName || "",
                      capturedEmail: patientEmail || "",
                      redFlagPayload: redFlagPayload || null,
                      basicDiagnosis: {
                        hypothesis: diagnosis.hypothesis,
                        confidence: diagnosis.confidence,
                        summary: diagnosis.summary,
                      },
                    });
                    sessionStorage.setItem("alivia-basic-upgrade-data", upgradeData);
                    localStorage.setItem("alivia-basic-upgrade-data", upgradeData);
                    localStorage.setItem("alivia-basic-upgrade-expiry", String(Date.now() + 30 * 60 * 1000));
                    navigate("/upgrade-welcome", { state: { redirectTo: "/assessment/premium", planType: "monthly" } });
                  }}
                  className="rounded-xl gap-2"
                >
                  {t("diagnosis.subscribe_monthly") || "Assinar plano mensal"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* ExitIntentPopup is rendered by parent Assessment.tsx */}
        </>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-4 rounded-xl bg-muted/50 border border-border/50">
        <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">{diagnosis.disclaimer}</p>
      </div>

      {/* Emergency banner — always visible on patient-facing result */}
      <EmergencyBanner />


      {/* Actions */}
      {!hideFooterActions && (
        <div className="flex flex-wrap justify-between gap-2 pt-4">
          <Button variant="outline" onClick={onBack} className="gap-2 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
            {t("diagnosis.back")}
          </Button>
          <div className="flex flex-wrap gap-2">
            {user && (
              <Button variant="secondary" onClick={() => navigate("/dashboard")} className="rounded-xl gap-2">
                <LayoutDashboard className="h-4 w-4" />
                {t("diagnosis.back_to_dashboard") || "Voltar ao meu painel"}
              </Button>
            )}
            <Button onClick={onNewAssessment} className="rounded-xl">
              {t("diagnosis.new_assessment")}
            </Button>
          </div>

        </div>
      )}
    </motion.div>
  );
};

export default DiagnosisResult;
