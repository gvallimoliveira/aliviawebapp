import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Info, ArrowLeft, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

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

const DiagnosisResult = ({ diagnosis, mode, onBack, onNewAssessment, onGenerateTreatment }: DiagnosisResultProps) => {
  const { t } = useLanguage();

  const confidenceConfig = {
    low: { color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", icon: AlertTriangle, label: t("diagnosis.confidence.low") },
    moderate: { color: "text-primary", bg: "bg-primary/5 border-primary/20", icon: Info, label: t("diagnosis.confidence.moderate") },
    high: { color: "text-green-600", bg: "bg-green-50 border-green-200", icon: CheckCircle, label: t("diagnosis.confidence.high") },
  };

  const conf = confidenceConfig[diagnosis.confidence] || confidenceConfig.moderate;
  const ConfIcon = conf.icon;

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

      {/* Premium-only sections */}
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

      {/* Basic mode: tip + upsell */}
      {mode === "basic" && (
        <>
          <Card className="rounded-xl border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Olha a dica!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sabemos que a sua dor está te preocupando! Não deixe esse problema aumentar até se tornar uma limitação na sua vida, podemos te ajudar com nosso plano de tratamento na avaliação premium.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-primary/30 bg-primary/5">
            <CardContent className="py-4 text-center space-y-3">
              <p className="text-sm font-medium text-foreground">{t("diagnosis.upsell")}</p>
              <Button
                onClick={() => window.location.href = "/assessment/premium"}
                className="rounded-xl"
              >
                {t("diagnosis.upgrade_cta")}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-4 rounded-xl bg-muted/50 border border-border/50">
        <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">{diagnosis.disclaimer}</p>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="gap-2 rounded-xl">
          <ArrowLeft className="h-4 w-4" />
          {t("diagnosis.back")}
        </Button>
        <Button onClick={onNewAssessment} className="rounded-xl">
          {t("diagnosis.new_assessment")}
        </Button>
      </div>
    </motion.div>
  );
};

export default DiagnosisResult;
