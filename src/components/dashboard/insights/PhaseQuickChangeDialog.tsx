import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { DISCHARGE_PHASE } from "@/lib/periodization";
import type { PeriodizationCycle } from "@/lib/periodizationData";
import { dischargePlan, fetchCycles, setCurrentMacroPhase } from "@/lib/periodizationData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  patientName: string;
  /** Chamada após uma mudança bem-sucedida para o card recarregar. */
  onChanged: () => void;
}

/**
 * Atalho do insight "Fase do tratamento (STEPS)": permite mudar a fase atual
 * do macrociclo (ou registrar a Alta) sem sair da aba Insights e abrir o
 * prontuário. Usa as mesmas funções do prontuário — nenhuma regra duplicada.
 */
const PhaseQuickChangeDialog = ({ open, onOpenChange, planId, patientName, onChanged }: Props) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const t = (pt: string, en: string, es?: string) => (lang === "pt" ? pt : lang === "es" ? es ?? en : en);

  const [macros, setMacros] = useState<PeriodizationCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmingDischarge, setConfirmingDischarge] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setConfirmingDischarge(false);
    fetchCycles(planId)
      .then((cycles) => {
        if (cancelled) return;
        setMacros(cycles.filter((c) => c.level === "macro").sort((a, b) => a.sort_order - b.sort_order));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, planId]);

  const pick = async (cycle: PeriodizationCycle) => {
    setSavingId(cycle.id);
    try {
      await setCurrentMacroPhase(planId, cycle.id);
      toast({
        title: t(`Fase atual: ${cycle.name}`, `Current phase: ${cycle.name}`, `Fase actual: ${cycle.name}`),
        description: t(
          "As datas das fases seguintes foram sugeridas a partir de hoje — ajuste no prontuário se precisar.",
          "The following phases' dates were suggested from today — adjust in the record if needed.",
          "Las fechas de las fases siguientes se sugirieron desde hoy — ajústalas en la ficha si es necesario.",
        ),
      });
      onChanged();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("Não foi possível mudar a fase", "Could not change the phase", "No se pudo cambiar la fase"), description: e?.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const discharge = async () => {
    setSavingId("discharge");
    try {
      await dischargePlan(planId);
      toast({
        title: t("Alta registrada", "Discharge recorded", "Alta registrada"),
        description: t(
          "O plano foi encerrado e o paciente sai da lista de fases em andamento.",
          "The plan was closed and the patient leaves the in-progress phase list.",
          "El plan se cerró y el paciente sale de la lista de fases en curso.",
        ),
      });
      onChanged();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("Não foi possível registrar a alta", "Could not record the discharge", "No se pudo registrar el alta"), description: e?.message, variant: "destructive" });
    } finally {
      setSavingId(null);
      setConfirmingDischarge(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {t("Alterar fase — ", "Change phase — ", "Cambiar fase — ")}
            {patientName}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t(
                "Toque na fase em que o paciente está agora. Se o tratamento terminou, registre a Alta para encerrar o plano.",
                "Tap the phase the patient is in now. If treatment is over, record Discharge to close the plan.",
                "Toca la fase en la que está el paciente ahora. Si el tratamiento terminó, registra el Alta para cerrar el plan.",
              )}
            </p>
            {macros.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-2">
                    {m.name}
                    {m.is_current && <Badge className="text-[10px]">{t("atual", "current", "actual")}</Badge>}
                  </p>
                  {m.goal && <p className="text-[11px] text-muted-foreground truncate">{m.goal}</p>}
                </div>
                {!m.is_current && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-xl text-[11px] shrink-0"
                    disabled={savingId !== null}
                    onClick={() => pick(m)}
                  >
                    {savingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {t("Marcar", "Mark", "Marcar")}
                  </Button>
                )}
              </div>
            ))}
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{DISCHARGE_PHASE.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t(DISCHARGE_PHASE.goal, "Criteria met — treatment cycle closure", "Criterios cumplidos — cierre del ciclo de tratamiento")}</p>
                </div>
              </div>
              {confirmingDischarge ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 rounded-xl text-[11px]"
                    disabled={savingId !== null}
                    onClick={discharge}
                  >
                    {savingId === "discharge" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    {t("Confirmar alta", "Confirm discharge", "Confirmar alta")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-xl text-[11px]"
                    onClick={() => setConfirmingDischarge(false)}
                  >
                    {t("Cancelar", "Cancel", "Cancelar")}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-xl text-[11px]"
                  disabled={savingId !== null}
                  onClick={() => setConfirmingDischarge(true)}
                >
                  {t("Registrar alta e encerrar plano", "Record discharge and close plan", "Registrar alta y cerrar plan")}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PhaseQuickChangeDialog;
