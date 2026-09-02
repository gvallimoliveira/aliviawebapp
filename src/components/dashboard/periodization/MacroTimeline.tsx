import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange } from "lucide-react";
import type { PeriodizationCycle } from "@/lib/periodizationData";

interface Props {
  cycles: PeriodizationCycle[];
}

const fmt = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";

const isCurrent = (c: PeriodizationCycle) => {
  const today = new Date().toISOString().slice(0, 10);
  return !!c.start_date && !!c.end_date && c.start_date <= today && today <= c.end_date;
};

const MacroTimeline = ({ cycles }: Props) => {
  const macros = cycles.filter((c) => c.level === "macro");
  const mesos = cycles.filter((c) => c.level === "meso");
  if (macros.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          Macrociclo e mesociclos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {macros.map((m) => (
            <div
              key={m.id}
              className={`min-w-[190px] rounded-xl border p-3 ${
                isCurrent(m) ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-foreground">{m.name}</span>
                {isCurrent(m) && <Badge className="text-[10px]">Fase atual</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground">{m.goal}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {fmt(m.start_date)} → {fmt(m.end_date)}
              </p>
              {mesos.filter((x) => x.parent_id === m.id).length > 0 && (
                <div className="mt-2 space-y-1">
                  {mesos
                    .filter((x) => x.parent_id === m.id)
                    .map((x) => (
                      <div key={x.id} className="rounded-lg bg-muted/60 px-2 py-1">
                        <p className="text-[11px] font-medium text-foreground">{x.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {fmt(x.start_date)} → {fmt(x.end_date)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Fases herdadas do STEPS. Ajuste datas e objetivos conforme a evolução do paciente.
        </p>
      </CardContent>
    </Card>
  );
};

export default MacroTimeline;
