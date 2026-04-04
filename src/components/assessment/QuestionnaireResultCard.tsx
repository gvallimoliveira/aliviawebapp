import { Card, CardContent } from "@/components/ui/card";
import { questionnaires, type QuestionnaireResult } from "@/data/questionnaireData";

interface QuestionnaireResultCardProps {
  result: QuestionnaireResult;
  language: string;
  compact?: boolean;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "minimal": return "text-primary";
    case "mild": return "text-blue-500";
    case "moderate": return "text-yellow-600";
    default: return "text-destructive";
  }
};

const QuestionnaireResultCard = ({ result, language, compact = false }: QuestionnaireResultCardProps) => {
  const isPt = language === "pt";
  const qDef = questionnaires.find((q) => q.id === result.questionnaireId);
  const severityColor = getSeverityColor(result.severity);

  return (
    <Card className="rounded-xl">
      <CardContent className={compact ? "py-3 px-3 space-y-2" : "py-4 space-y-3"}>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-3">
            <p className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>
              {result.questionnaireName || result.questionnaireId?.toUpperCase()}
            </p>
            {qDef && (
              <p className={`text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
                {isPt ? qDef.fullName_pt : qDef.fullName_en}
              </p>
            )}
          </div>
          <p className={`font-bold ${severityColor} ${compact ? "text-xl" : "text-2xl"} shrink-0`}>
            {result.percentageScore}%
          </p>
        </div>

        <p className={`font-medium ${severityColor} ${compact ? "text-[11px]" : "text-sm"}`}>
          {isPt ? result.interpretation_pt : result.interpretation_en}
        </p>

        {result.subscaleScores && Object.keys(result.subscaleScores).length > 1 && (
          <div className={`grid grid-cols-2 gap-2 ${compact ? "pt-0.5" : "pt-1"}`}>
            {Object.entries(result.subscaleScores).map(([key, score]) => (
              <div key={key} className={compact ? "text-[10px]" : "text-xs"}>
                <span className="text-muted-foreground">
                  {qDef?.subscaleLabels[key]?.[isPt ? "pt" : "en"] || key}:
                </span>{" "}
                <span className="font-medium">{score}%</span>
              </div>
            ))}
          </div>
        )}

        {qDef && (
          <p className={`text-muted-foreground/60 italic ${compact ? "text-[9px]" : "text-[10px]"}`}>
            {qDef.scoringDirection === "higher_better"
              ? (isPt ? "Escala: 100% = melhor | 0% = pior" : "Scale: 100% = best | 0% = worst")
              : (isPt ? "Escala: 0% = melhor | 100% = pior" : "Scale: 0% = best | 100% = worst")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default QuestionnaireResultCard;
export { getSeverityColor };
