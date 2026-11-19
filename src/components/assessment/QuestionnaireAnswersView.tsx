import { questionnaires, psfsQuestionnaire, type QuestionnaireResult } from "@/data/questionnaireData";
import { cn } from "@/lib/utils";

/** Read-only replay of a patient's questionnaire answers, option by option. */
export default function QuestionnaireAnswersView({ result, isPt }: { result: QuestionnaireResult; isPt: boolean }) {
  const def = [...questionnaires, psfsQuestionnaire].find((q) => q.id === result.questionnaireId);
  if (!def) {
    return <p className="text-xs text-muted-foreground">{isPt ? "Detalhes indisponíveis para este questionário." : "Details unavailable."}</p>;
  }
  const subscales: string[] = [];
  def.questions.forEach((q) => { if (!subscales.includes(q.subscale)) subscales.push(q.subscale); });
  const answers = result.answers || {};
  return (
    <div className="space-y-4">
      {subscales.map((sub) => {
        const qs = def.questions.filter((q) => q.subscale === sub && (answers[q.id] !== undefined || !result.functionalOnly));
        if (qs.length === 0) return null;
        const label = (def as any).subscaleLabels?.[sub];
        return (
          <div key={sub} className="space-y-2">
            <h4 className="text-sm font-semibold">{label ? (isPt ? label.pt : label.en) : sub}</h4>
            {qs.map((q) => {
              const sel = answers[q.id];
              return (
                <div key={q.id} className="space-y-1">
                  <p className="text-xs font-medium">
                    {isPt ? q.text_pt : q.text_en}
                    {result.activityLabels?.[q.id] ? ` — ${result.activityLabels[q.id]}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {q.options.map((o) => (
                      <span
                        key={o.value}
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px]",
                          sel === o.value ? "border-primary bg-primary text-primary-foreground font-semibold" : "text-muted-foreground",
                        )}
                      >
                        {isPt ? o.label_pt : o.label_en}
                      </span>
                    ))}
                    {sel === undefined && <span className="text-[11px] italic text-muted-foreground">{isPt ? "sem resposta" : "no answer"}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
