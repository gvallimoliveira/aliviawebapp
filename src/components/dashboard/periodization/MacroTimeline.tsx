import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarRange, CheckCircle2, GraduationCap, History, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { anchorScroll } from "@/hooks/useScrollAnchor";
import type { PeriodizationCycle } from "@/lib/periodizationData";
import { dischargePlan, setCurrentMacroPhase } from "@/lib/periodizationData";
import { DISCHARGE_PHASE, isOptionalMacroPhase } from "@/lib/periodization";


interface Props {
  cycles: PeriodizationCycle[];
  planId?: string | null;
  /** Status do plano: quando 'completed' (Alta), mostra o encerramento. */
  planStatus?: string | null;
  onChanged?: () => void;
  readOnly?: boolean;
}

const fmt = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";

const MacroTimeline = ({ cycles, planId, planStatus, onChanged, readOnly }: Props) => {
  const { toast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmingDischarge, setConfirmingDischarge] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const macros = cycles.filter((c) => c.level === "macro");
  if (macros.length === 0) return null;

  const hasCurrent = macros.some((m) => m.is_current);

  const mark = async (cycle: PeriodizationCycle) => {
    if (!planId) return;
    // Mantém a página exatamente onde está: o recarregamento da seção
    // encolhe/expande cards e o navegador empurrava a rolagem para cima.
    const keepAnchored = anchorScroll(() => cardRef.current, 1500);
    const keepLeft = railRef.current?.scrollLeft ?? 0;
    keepAnchored();
    setSavingId(cycle.id);
    try {
      await setCurrentMacroPhase(planId, cycle.id);
      onChanged?.();
      requestAnimationFrame(() => {
        if (railRef.current) railRef.current.scrollLeft = keepLeft;
      });
      toast({
        title: `Fase atual: ${cycle.name}`,
        description: "As datas das fases seguintes foram sugeridas a partir de hoje — ajuste se precisar.",
      });
    } catch (e: any) {
      toast({ title: "Não foi possível marcar a fase", description: e?.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const discharge = async () => {
    if (!planId) return;
    const keepAnchored = anchorScroll(() => cardRef.current, 1500);
    keepAnchored();
    setSavingId("discharge");
    try {
      await dischargePlan(planId);
      onChanged?.();
      toast({
        title: "Alta registrada",
        description: "O plano foi encerrado — o paciente sai do acompanhamento de fases em andamento.",
      });
    } catch (e: any) {
      toast({ title: "Não foi possível registrar a alta", description: e?.message, variant: "destructive" });
    } finally {
      setSavingId(null);
      setConfirmingDischarge(false);
    }
  };


  return (
    <Card ref={cardRef}>
      <CardHeader className="pb-2 periodization-card-header">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          Macrociclo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasCurrent && planStatus !== "completed" && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Nenhuma fase marcada. Marque em qual fase o paciente está — o sistema não decide isso por você.
          </p>
        )}
        <div ref={railRef} className="flex gap-2 overflow-x-auto pb-1" style={{ overflowAnchor: "none" }}>
          {macros.map((m, idx) => {
            const currentIndex = macros.findIndex((x) => x.is_current);
            const isPast = currentIndex !== -1 && idx < currentIndex;
            return (
              <div
                key={m.id}
                className={`min-w-[190px] rounded-xl border p-3 ${
                  m.is_current ? "border-primary bg-primary/5" : isPast ? "border-border bg-muted/30" : "border-border"
                } ${isOptionalMacroPhase(m.name) ? "border-dashed" : ""}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground">{m.name}</span>
                  {m.is_current && <Badge className="text-[10px]">Fase atual</Badge>}
                  {isPast && <Badge variant="secondary" className="text-[10px] gap-1"><History className="h-3 w-3" />Fase concluída</Badge>}
                </div>
                {isOptionalMacroPhase(m.name) && !isPast && (
                  <Badge variant="outline" className="text-[10px] mb-1">Opcional, caso aplicável</Badge>
                )}
                <p className="text-[11px] text-muted-foreground">{m.goal}</p>
                {!isPast && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {fmt(m.start_date)} → {fmt(m.end_date)}
                  </p>
                )}
                {!readOnly && planId && !m.is_current && !isPast && (
                  <Button type="button"
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 h-7 rounded-xl gap-1 text-[10px]"
                    disabled={savingId === m.id}
                    onClick={() => mark(m)}
                  >
                    {savingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Marcar como fase atual
                  </Button>
                )}
              </div>
            );
          })}
          {planId && (
            <div className={`min-w-[190px] rounded-xl border p-3 ${planStatus === "completed" ? "border-emerald-500/40 bg-emerald-500/10" : "border-border"}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                  {DISCHARGE_PHASE.name}
                </span>
                {planStatus === "completed" && <Badge className="text-[10px]">Alta registrada</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground">{DISCHARGE_PHASE.goal}</p>
              {!readOnly && planStatus !== "completed" && (
                confirmingDischarge ? (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Button type="button"
                      size="sm"
                      className="h-7 rounded-xl gap-1 text-[10px] flex-1"
                      disabled={savingId === "discharge"}
                      onClick={discharge}
                    >
                      {savingId === "discharge" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Confirmar alta
                    </Button>
                    <Button type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-xl text-[10px]"
                      onClick={() => setConfirmingDischarge(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button type="button"
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 h-7 rounded-xl gap-1 text-[10px]"
                    disabled={savingId !== null}
                    onClick={() => setConfirmingDischarge(true)}
                  >
                    <GraduationCap className="h-3 w-3" />
                    Registrar alta e encerrar
                  </Button>
                )
              )}
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          A fase atual é definida pelo profissional. Ao marcá-la, a fase começa hoje e o sistema sugere as datas das
          fases seguintes pela duração padrão do STEPS — sempre ajustável conforme a evolução do paciente.
          Potência e retorno ao esporte são opcionais: mantenha apenas se o objetivo exigir.
        </p>
      </CardContent>
    </Card>
  );
};

export default MacroTimeline;
