import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Loader2, Save, TrendingUp } from "lucide-react";
import StrengthTable, {
  sanitizeStrengthRows,
  createInitialStrengthRows,
  computeAsymmetry,
  computeSideStats,
  computeRowAsymmetry,
  type StrengthRow,
} from "@/components/assessment/StrengthTable";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  patient: any;
  readOnly?: boolean;
  isDemo?: boolean;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });

/**
 * Dynamometry section shown on the patient record.
 * Always renders (even when no strength was recorded yet) so the therapist can
 * attach a report (PDF/photo) or type values directly into the latest
 * assessment — without needing to re-open the manual assessment flow.
 */
export default function PatientStrengthSection({ patient, readOnly, isDemo }: Props) {
  const { toast } = useToast();

  const assessments = React.useMemo(
    () =>
      (patient?.assessments || [])
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
    [patient?.assessments],
  );
  const target = assessments[assessments.length - 1]; // newest assessment receives new data

  const initialRows: StrengthRow[] = React.useMemo(() => {
    const existing = sanitizeStrengthRows(target?.anamnesis_data?.strengthTable);
    return existing.length > 0 ? existing : createInitialStrengthRows(2);
  }, [target?.id, target?.anamnesis_data?.strengthTable]);

  const [rows, setRows] = React.useState<StrengthRow[]>(initialRows);
  const [saving, setSaving] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  /** Keeps the section anchored while parents re-render after a save/reload. */
  const preserveScroll = () =>
    anchorScroll(() => cardRef.current || document.getElementById("dinamometria"));


  React.useEffect(() => setRows(initialRows), [initialRows]);

  if (!target) return null;


  const savedSerialized = JSON.stringify(
    sanitizeStrengthRows(target?.anamnesis_data?.strengthTable),
  );
  const currentSerialized = JSON.stringify(sanitizeStrengthRows(rows));
  const dirty = savedSerialized !== currentSerialized;

  const handleSave = async () => {
    if (!target?.id || isDemo) return;
    setSaving(true);
    try {
      const sanitized = sanitizeStrengthRows(rows);
      const nextAnamnesis = {
        ...(target.anamnesis_data || {}),
        strengthTable: sanitized,
      };
      const { error } = await supabase
        .from("assessments")
        .update({ anamnesis_data: nextAnamnesis })
        .eq("id", target.id);
      if (error) throw error;
      toast({
        title: "Dinamometria salva",
        description: `Registrada na avaliação de ${fmtDate(target.created_at)}.`,
      });
      const restoreScroll = preserveScroll();
      window.dispatchEvent(new CustomEvent("reload-pro-patients"));
      restoreScroll();

    } catch (e: any) {
      toast({
        title: "Não foi possível salvar",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Build longitudinal evolution (only across assessments that already have data).
  const assessmentsWithStrength = assessments.filter(
    (a: any) => sanitizeStrengthRows(a?.anamnesis_data?.strengthTable).length > 0,
  );
  const hasMultiple = assessmentsWithStrength.length >= 2;
  const movementSeries = new Map<
    string,
    Array<{ date: string; L: string; R: string; asym: number | null }>
  >();
  assessmentsWithStrength.forEach((a: any) => {
    sanitizeStrengthRows(a.anamnesis_data.strengthTable).forEach((r) => {
      const arr = movementSeries.get(r.movement) || [];
      arr.push({
        date: fmtDate(a.created_at),
        L: (() => {
          const st = computeSideStats(r.leftValue, r.leftTrials);
          return st.count > 1 ? `${st.mean} (n=${st.count})` : r.leftValue;
        })(),
        R: (() => {
          const st = computeSideStats(r.rightValue, r.rightTrials);
          return st.count > 1 ? `${st.mean} (n=${st.count})` : r.rightValue;
        })(),
        asym: computeRowAsymmetry(r),
      });
      movementSeries.set(r.movement, arr);
    });
  });

  return (
    <Card ref={cardRef} id="dinamometria">

      <CardContent className="space-y-4 pt-5">
        <StrengthTable
          value={rows}
          onChange={readOnly ? undefined : setRows}
          readOnly={!!readOnly}
          bare
          lang="pt"
          disableImport={isDemo}
        />
        {!readOnly && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Salvo na avaliação de {fmtDate(target.created_at)}.
            </p>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving || isDemo}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Salvar dinamometria
            </Button>
          </div>
        )}
        {hasMultiple && (
          <CollapsibleSection
            storageKey={`patient:${patient?.email || patient?.groupKey}:strength-history`}
            defaultOpen={false}
            header={
              <div className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Evolução por movimento
              </div>
            }
          >
            <div className="space-y-3 pt-3">
              {Array.from(movementSeries.entries()).map(([movement, series]) => (
                <div key={movement} className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold text-foreground mb-2">{movement}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
                          <th className="py-1.5 pr-3 font-medium">Data</th>
                          <th className="py-1.5 px-2 font-medium text-center">Esq (kgf)</th>
                          <th className="py-1.5 px-2 font-medium text-center">Dir (kgf)</th>
                          <th className="py-1.5 pl-2 font-medium text-center">Assim.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {series.map((s, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-1.5 pr-3 text-muted-foreground">{s.date}</td>
                            <td className="py-1.5 px-2 text-center font-mono">{s.L || "—"}</td>
                            <td className="py-1.5 px-2 text-center font-mono">{s.R || "—"}</td>
                            <td className="py-1.5 pl-2 text-center font-mono">
                              {s.asym == null ? "—" : `${s.asym}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </CardContent>
    </Card>
  );
}
