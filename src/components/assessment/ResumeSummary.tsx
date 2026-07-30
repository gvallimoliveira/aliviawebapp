import { motion } from "framer-motion";
import { ChevronRight, RotateCcw, CheckCircle2, Smartphone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AnamnesisData } from "@/components/assessment/AnamnesisForm";
import type { QuestionnaireResult } from "@/data/questionnaireData";

export interface ResumeConflictInfo {
  /** true quando o preenchimento exibido veio de outro aparelho. */
  fromOtherDevice: boolean;
  otherDeviceLabel?: string | null;
  chosenSavedAt: number;
  /** Existe um preenchimento mais antigo que será substituído ao continuar. */
  alternativeSavedAt?: number | null;
  onUseAlternative?: () => void;
}

interface ResumeSummaryProps {
  patientName?: string;
  patientEmail?: string;
  anamnesisData: AnamnesisData | null;
  questionnaireResults: QuestionnaireResult[];
  nextStepLabel?: string;
  conflict?: ResumeConflictInfo | null;
  onContinue: () => void;
  onRestart?: () => void;
}

const ResumeSummary = ({
  patientName,
  patientEmail,
  anamnesisData,
  questionnaireResults,
  nextStepLabel,
  conflict,
  onContinue,
  onRestart,
}: ResumeSummaryProps) => {

  const { language } = useLanguage();
  const isPt = language === "pt";

  const hasAnamnesis = !!anamnesisData;
  const completedQuestionnaires = questionnaireResults?.length || 0;
  const complaints =
    anamnesisData?.chiefComplaints ||
    (anamnesisData?.chiefComplaint ? [anamnesisData.chiefComplaint] : []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto">
          <RotateCcw className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {isPt ? "Continuar de onde parou" : "Continue where you left off"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {isPt
            ? "Revise abaixo o que já foi preenchido. Se estiver tudo certo, continue de onde parou."
            : "Review what was already filled in below. If it looks right, continue from where you left off."}
        </p>
      </div>

      <Card className="rounded-xl">
        <CardContent className="pt-6 space-y-4">
          {(patientName || patientEmail) && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {isPt ? "Identificação" : "Identification"}
              </p>
              {patientName && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-foreground">{patientName}</span>
                </div>
              )}
              {patientEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-muted-foreground">{patientEmail}</span>
                </div>
              )}
            </div>
          )}

          {hasAnamnesis && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {isPt ? "Anamnese" : "Anamnesis"}
              </p>

              {anamnesisData?.painRegions && anamnesisData.painRegions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {isPt ? "Regiões de dor:" : "Pain regions:"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {anamnesisData.painRegions.map((r) => (
                      <Badge key={r} variant="secondary" className="text-xs">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {typeof anamnesisData?.painScore === "number" && (
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">
                    {isPt ? "Intensidade da dor: " : "Pain intensity: "}
                  </span>
                  <strong>{anamnesisData.painScore}/10</strong>
                </p>
              )}

              {complaints.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {isPt ? "Queixas principais:" : "Chief complaints:"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {complaints.slice(0, 4).map((c, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {anamnesisData?.onset && (
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">
                    {isPt ? "Início: " : "Onset: "}
                  </span>
                  {anamnesisData.onset}
                </p>
              )}
            </div>
          )}

          {completedQuestionnaires > 0 && (
            <div className="space-y-1 pt-2 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {isPt ? "Questionários" : "Questionnaires"}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-foreground">
                  {completedQuestionnaires}{" "}
                  {isPt
                    ? `questionário${completedQuestionnaires > 1 ? "s" : ""} respondido${completedQuestionnaires > 1 ? "s" : ""}`
                    : `questionnaire${completedQuestionnaires > 1 ? "s" : ""} completed`}
                </span>
              </div>
            </div>
          )}

          <div className="bg-primary/5 rounded-lg p-3 mt-2">
            <p className="text-xs text-muted-foreground">
              {isPt ? "Próxima etapa: " : "Next step: "}
              <strong className="text-foreground">
                {nextStepLabel ||
                  (hasAnamnesis
                    ? isPt
                      ? "Questionários clínicos"
                      : "Clinical questionnaires"
                    : isPt
                    ? "Anamnese"
                    : "Anamnesis")}
              </strong>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={onContinue} className="flex-1 rounded-xl gap-2" size="lg">
          {isPt ? "Continuar avaliação" : "Continue assessment"}
          <ChevronRight className="h-4 w-4" />
        </Button>
        {onRestart && (
          <Button onClick={onRestart} variant="outline" className="rounded-xl" size="lg">
            {isPt ? "Recomeçar" : "Restart"}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default ResumeSummary;
