import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, ChevronRight, FileText } from "lucide-react";

interface Assessment {
  id: string;
  created_at: string;
  pain_score: number | null;
  pain_regions: string[] | null;
  diagnosis?: any;
  status?: string;
  type?: string;
  archived_at?: string | null;
}

interface Props {
  assessments: Assessment[];
  onSelect?: (assessmentId: string) => void;
  onOpenReport?: (assessmentId: string) => void;
  selectedId?: string | null;
}

const REGION_SHORT: Record<string, string> = {
  head: "Cabeça", neck: "Pescoço", lower_back: "Lombar", upper_back: "Torácica",
  chest: "Tórax", abdomen: "Abdômen",
  right_shoulder: "Ombro D.", left_shoulder: "Ombro E.",
  right_knee: "Joelho D.", left_knee: "Joelho E.",
  right_hip: "Quadril D.", left_hip: "Quadril E.",
  right_ankle: "Tornoz. D.", left_ankle: "Tornoz. E.",
  right_elbow: "Cotov. D.", left_elbow: "Cotov. E.",
  right_wrist: "Punho D.", left_wrist: "Punho E.",
  right_hand: "Mão D.", left_hand: "Mão E.",
  right_foot: "Pé D.", left_foot: "Pé E.",
  right_gluteal: "Glúteo D.", left_gluteal: "Glúteo E.",
  right_hamstring: "Post. Coxa D.", left_hamstring: "Post. Coxa E.",
  right_quadriceps: "Ant. Coxa D.", left_quadriceps: "Ant. Coxa E.",
  right_calf: "Pant. D.", left_calf: "Pant. E.",
};

const painColor = (score: number | null) => {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score <= 3) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (score <= 6) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-destructive/15 text-destructive";
};

const AssessmentTimeline = ({ assessments, onSelect, onOpenReport, selectedId }: Props) => {
  const items = useMemo(() => {
    return assessments
      .filter((a) => !a.archived_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
      // Mais recente (atual) primeiro, à esquerda
  }, [assessments]);

  if (items.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Linha do Tempo
        </CardTitle>
        <CardDescription className="text-xs">
          Últimas {items.length} avaliações — da atual para a mais antiga. Toque para ver o ciclo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile: horizontal scroll. Desktop: grid */}
        <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-5 sm:overflow-visible sm:snap-none">
          {items.map((a, idx) => {
            const date = new Date(a.created_at);
            const regions = (a.pain_regions || []).slice(0, 3);
            const extra = (a.pain_regions || []).length - regions.length;
            const hypothesis = a.diagnosis?.hypothesis;
            const isLatest = idx === 0;
            const isSelected = selectedId ? selectedId === a.id : isLatest;

            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => onSelect?.(a.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(a.id); } }}
                className={`group relative shrink-0 snap-start w-44 sm:w-auto text-left rounded-xl border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm ${
                  isSelected ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border/60"
                }`}
              >
                {isLatest && (
                  <Badge className="absolute -top-2 right-2 text-[9px] px-1.5 bg-primary text-primary-foreground border-0">
                    Atual
                  </Badge>
                )}
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
                </div>
                <div className={`mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${painColor(a.pain_score)}`}>
                  Dor {a.pain_score ?? "—"}/10
                </div>
                {hypothesis && (
                  <p className="mt-2 text-[11px] text-foreground/80 line-clamp-2 leading-snug">
                    {hypothesis}
                  </p>
                )}
                {regions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {regions.map((r) => (
                      <span
                        key={r}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {REGION_SHORT[r] || r}
                      </span>
                    ))}
                    {extra > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        +{extra}
                      </span>
                    )}
                  </div>
                )}
                {onOpenReport ? (
                  <button type="button" aria-label="Abrir avaliação completa" title="Abrir avaliação completa" onClick={(e) => { e.stopPropagation(); onOpenReport(a.id); }} className="absolute bottom-1.5 right-1.5 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-primary">
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                ) : <ChevronRight className="absolute bottom-2 right-2 h-3.5 w-3.5 text-muted-foreground/40" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentTimeline;
