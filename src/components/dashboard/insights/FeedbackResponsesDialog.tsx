import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FEEDBACK_AREAS, filterResponses, type ResponseDetail, type ResponseFilter, type Sentiment } from "@/lib/feedbackMetrics";
import { answerLabel, areaLabel, commentAreaLabel, itemLabel, sentimentLabel, serviceLabel, type FbLang } from "@/lib/feedbackLabels";

const LIST_PAGE = 20;

export const SENTIMENT_STYLE: Record<Sentiment, string> = {
  promoter: "bg-emerald-100 text-emerald-800 border-emerald-200",
  passive: "bg-amber-100 text-amber-800 border-amber-200",
  detractor: "bg-red-100 text-red-800 border-red-200",
  unknown: "bg-muted text-muted-foreground border-border",
};

const tr = (l: FbLang, pt: string, en: string, es: string) => (l === "pt" ? pt : l === "es" ? es : en);
const dateOf = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export const ResponseFilterChips = ({ details, value, onChange, l }: { details: ResponseDetail[]; value: ResponseFilter; onChange: (f: ResponseFilter) => void; l: FbLang }) => (
  <div className="flex flex-wrap gap-1.5">
    {([["all", tr(l, "Todas", "All", "Todas")], ["comments", tr(l, "Com comentário", "With comment", "Con comentario")], ["low", tr(l, "Com nota baixa", "With a low rating", "Con nota baja")]] as const).map(([k, label]) => (
      <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${value === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
        {label} ({filterResponses(details, k).length})
      </button>
    ))}
  </div>
);

/** One compact line per response; the full answers open only on request. */
export const ResponseRow = ({ d, l, onOpen }: { d: ResponseDetail; l: FbLang; onOpen: () => void }) => {
  const low = d.ratings.filter((r) => !r.positive).length;
  return (
    <li>
      <button type="button" onClick={onOpen} data-testid="feedback-response"
        aria-label={`${tr(l, "Abrir avaliação de", "Open response from", "Abrir evaluación del")} ${dateOf(d.created_at)}`}
        className="flex w-full items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-left transition-colors hover:bg-muted/50">
        <Badge variant="outline" className={`shrink-0 text-[10px] font-medium ${SENTIMENT_STYLE[d.sentiment]}`}>{sentimentLabel(d.sentiment, l)}</Badge>
        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
          {dateOf(d.created_at)} · {serviceLabel(d.service, l)}{d.clinician_name ? ` · ${d.clinician_name}` : ""}
        </span>
        {low > 0 && <span className="shrink-0 rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{low} {tr(l, low === 1 ? "nota baixa" : "notas baixas", low === 1 ? "low rating" : "low ratings", low === 1 ? "nota baja" : "notas bajas")}</span>}
        {d.comments.length > 0 && <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-primary" aria-label={tr(l, "Tem comentário", "Has a comment", "Tiene comentario")} />}
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </li>
  );
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: ResponseDetail[];
  filter: ResponseFilter;
  onFilterChange: (f: ResponseFilter) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  scopeLabel: string;
  l: FbLang;
}

const FeedbackResponsesDialog = ({ open, onOpenChange, details, filter, onFilterChange, selectedId, onSelect, scopeLabel, l }: Props) => {
  const [shown, setShown] = useState(LIST_PAGE);
  useEffect(() => setShown(LIST_PAGE), [filter, open]);

  const list = filterResponses(details, filter);
  const index = selectedId ? list.findIndex((d) => d.id === selectedId) : -1;
  const current = index >= 0 ? list[index] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-3 rounded-lg p-4 sm:p-6" data-testid="feedback-responses-dialog">
        <DialogHeader className="space-y-1 pr-6 text-left">
          <DialogTitle className="text-base">
            {current ? tr(l, "Avaliação do paciente", "Patient response", "Evaluación del paciente") : tr(l, "Respostas individuais", "Individual responses", "Respuestas individuales")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {current
              ? `${dateOf(current.created_at)} · ${serviceLabel(current.service, l)}${current.clinician_name ? ` · ${current.clinician_name}` : ""}`
              : scopeLabel}
          </DialogDescription>
        </DialogHeader>

        {current ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onSelect(null)}>
                <ArrowLeft className="h-3.5 w-3.5" />{tr(l, "Lista", "List", "Lista")}
              </Button>
              <Badge variant="outline" className={`text-[10px] font-medium ${SENTIMENT_STYLE[current.sentiment]}`}>{sentimentLabel(current.sentiment, l)}</Badge>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" data-testid="feedback-response-detail">
              {FEEDBACK_AREAS.map((area) => {
                const ratings = current.ratings.filter((r) => r.item.area === area);
                const comment = current.comments.find((c) => c.area === area);
                if (!ratings.length && !comment) return null;
                return (
                  <section key={area} className="space-y-1.5 rounded-xl border border-border p-3">
                    <h4 className="text-xs font-semibold text-foreground">{areaLabel(area, l)}</h4>
                    {ratings.map((r) => (
                      <div key={r.item.key} className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">{itemLabel(r.item.key, l)}</span>
                        <span className={`shrink-0 font-medium ${r.positive ? "text-foreground" : "text-red-700 dark:text-red-300"}`}>{answerLabel(r.value, l)}</span>
                      </div>
                    ))}
                    {comment && <p className="whitespace-pre-wrap break-words border-t border-border pt-2 text-sm text-foreground">{comment.text}</p>}
                  </section>
                );
              })}
              {current.comments.filter((c) => c.area === "general").map((c) => (
                <section key={c.area} className="space-y-1.5 rounded-xl border border-border p-3">
                  <h4 className="text-xs font-semibold text-foreground">{commentAreaLabel(c.area, l)}</h4>
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">{c.text}</p>
                </section>
              ))}
              {current.ratings.length === 0 && current.comments.length === 0 && (
                <p className="text-xs text-muted-foreground">{tr(l, "Esta avaliação foi enviada sem respostas preenchidas.", "This response was sent with no answers filled in.", "Esta evaluación se envió sin respuestas.")}</p>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={index === 0} onClick={() => onSelect(list[index - 1].id)}>
                <ChevronLeft className="h-3.5 w-3.5" />{tr(l, "Anterior", "Previous", "Anterior")}
              </Button>
              <span className="text-[11px] tabular-nums text-muted-foreground">{index + 1} {tr(l, "de", "of", "de")} {list.length}</span>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={index === list.length - 1} onClick={() => onSelect(list[index + 1].id)}>
                {tr(l, "Próxima", "Next", "Siguiente")}<ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <ResponseFilterChips details={details} value={filter} onChange={onFilterChange} l={l} />
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tr(l, "Nenhuma resposta neste filtro.", "No responses for this filter.", "Ninguna respuesta en este filtro.")}</p>
              ) : (
                <ul className="space-y-1.5">
                  {list.slice(0, shown).map((d) => <ResponseRow key={d.id} d={d} l={l} onOpen={() => onSelect(d.id)} />)}
                </ul>
              )}
              {list.length > shown && (
                <Button type="button" variant="outline" size="sm" className="h-8 w-full text-xs" onClick={() => setShown((n) => n + LIST_PAGE)}>
                  {tr(l, "Mostrar mais", "Show more", "Mostrar más")} ({list.length - shown})
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackResponsesDialog;
