import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Info, ArrowLeft, Sparkles, Lock, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { PREMIUM_PRICE_FORMATTED } from "@/constants/pricing";

interface Diagnosis {
  hypothesis: string;
  confidence: "low" | "moderate" | "high";
  summary: string;
  explanation?: string;
  reasoning?: string;
  recommendations?: string[];
  disclaimer: string;
}

interface DiagnosisResultProps {
  diagnosis: Diagnosis;
  mode: "basic" | "premium";
  onBack: () => void;
  onNewAssessment: () => void;
  onGenerateTreatment?: () => void;
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

const DiagnosisResult = ({ diagnosis, mode, onBack, onNewAssessment, onGenerateTreatment }: DiagnosisResultProps) => {
  const { t } = useLanguage();

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
      </div>

      {/* Confidence Badge */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${conf.bg}`}>
        <ConfIcon className={`h-5 w-5 ${conf.color}`} />
        <span className={`text-sm font-medium ${conf.color}`}>
          {t("diagnosis.confidence_label")}: {conf.label}
        </span>
      </div>

      {/* Summary */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("diagnosis.summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{diagnosis.summary}</p>
        </CardContent>
      </Card>

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

          {/* Unlock CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="rounded-xl border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg shadow-primary/5">
              <CardContent className="py-6 text-center space-y-4">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                  {t("diagnosis.blurred_hint")}
                </p>
                <Button
                  size="lg"
                  onClick={() => window.location.href = "/assessment/premium"}
                  className="rounded-xl gap-2 px-8 py-6 text-base"
                >
                  <Sparkles className="h-4 w-4" />
                  {t("diagnosis.unlock_full")} {PREMIUM_PRICE_FORMATTED}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-4 rounded-xl bg-muted/50 border border-border/50">
        <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">{diagnosis.disclaimer}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-between gap-2 pt-4">
        <Button variant="outline" onClick={onBack} className="gap-2 rounded-xl">
          <ArrowLeft className="h-4 w-4" />
          {t("diagnosis.back")}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 rounded-xl text-emerald-600 border-emerald-300 hover:bg-emerald-50"
            onClick={() => {
              const text = `🩺 *Aliv.iA — ${t("diagnosis.result_title")}*\n\n📋 *${t("diagnosis.hypothesis")}:* ${diagnosis.hypothesis}\n📊 *${t("diagnosis.confidence_label")}:* ${conf.label}\n\n${diagnosis.summary}\n\n💡 ${t("diagnosis.whatsapp_cta")}\n${window.location.origin}`;
              const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
              window.open(url, "_blank");
            }}
          >
            <Share2 className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button onClick={onNewAssessment} className="rounded-xl">
            {t("diagnosis.new_assessment")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default DiagnosisResult;
