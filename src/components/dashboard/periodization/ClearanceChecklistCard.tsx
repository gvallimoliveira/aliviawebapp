import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ListChecks, Minus, XCircle } from "lucide-react";
import type { ClearanceItem } from "@/lib/periodizationData";
import { updateClearance } from "@/lib/periodizationData";

interface Props {
  items: ClearanceItem[];
  onChanged: () => void;
  readOnly?: boolean;
}

const STATUS_CYCLE: Record<string, string> = { pending: "met", met: "not_met", not_met: "pending" };

const ClearanceChecklistCard = ({ items, onChanged, readOnly }: Props) => {
  if (items.length === 0) return null;
  const met = items.filter((i) => i.status === "met").length;
  const pct = Math.round((met / items.length) * 100);

  const toggle = async (item: ClearanceItem) => {
    if (readOnly) return;
    await updateClearance(item.id, { status: STATUS_CYCLE[item.status] || "met" });
    onChanged();
  };

  return (
    <Card>
      <CardHeader className="pb-2 periodization-card-header">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          Critérios de liberação (fisio → academia → esporte)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Progress value={pct} className="h-2" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{met}/{items.length}</span>
        </div>
        <div className="space-y-1.5">
          {items.map((item) => (
            <button type="button"
              key={item.id}
              onClick={() => toggle(item)}
              disabled={readOnly}
              className="w-full flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-left hover:bg-muted/50 transition disabled:cursor-default"
            >
              {item.status === "met" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : item.status === "not_met" ? (
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-xs text-foreground flex-1">{item.label}</span>
              {item.status !== "pending" && (
                <Badge variant="outline" className="text-[10px]">
                  {item.status === "met" ? "Atingido" : "Não atingido"}
                </Badge>
              )}
            </button>
          ))}
        </div>
        {!readOnly && (
          <p className="text-[10px] text-muted-foreground">
            Toque em um critério para alternar entre pendente, atingido e não atingido.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ClearanceChecklistCard;
