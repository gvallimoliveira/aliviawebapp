import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, TrendingUp } from "lucide-react";
import RomTable, {
  sanitizeRomRows,
  createInitialRomRows,
  type RomRow,
} from "@/components/assessment/RomTable";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import MovementEvolutionChart from "./MovementEvolutionChart";
import { normalizeMovementKey, parseMeasurementValue, pickMovementLabel } from "@/lib/movementNormalize";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { anchorScroll } from "@/hooks/useScrollAnchor";

interface Props {
  patient: any;
  readOnly?: boolean;
  isDemo?: boolean;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });

/**
 * Joint mobility (ADM / ROM) section shown on the patient record.
 * Mirrors the dynamometry section: always renders so the therapist can review
 * or adjust values recorded in the latest assessment, and shows longitudinal
 * evolution per movement when 2+ assessments have data.
 */
export default function PatientRomSection({ patient, readOnly, isDemo }: Props) {
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

  const initialRows: RomRow[] = React.useMemo(() => {
    const existing = sanitizeRomRows(target?.anamnesis_data?.romTable);
    return existing.length > 0 ? existing : createInitialRomRows(1);
  }, [target?.id, target?.anamnesis_data?.romTable]);

  const [rows, setRows] = React.useState<RomRow[]>(initialRows);
  const [saving, setSaving] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  /** Keeps the section anchored while parents re-render after a save/reload. */
  const preserveScroll = () =>
    anchorScroll(() => cardRef.current || document.getElementById("sec-adm"));

  React.useEffect(() => setRows(initialRows), [initialRows]);

  if (!target) return null;

  const savedSerialized = JSON.stringify(
    sanitizeRomRows(target?.anamnesis_data?.romTable),
  );
  const currentSerialized = JSON.stringify(sanitizeRomRows(rows));
  const dirty = savedSerialized !== currentSerialized;

  const handleSave = async () => {
    if (!target?.id || isDemo) return;
    setSaving(true);
    try {
      const sanitized = sanitizeRomRows(rows);
      const nextAnamnesis = {
        ...(target.anamnesis_data || {}),
        romTable: sanitized,
      };
      const { error } = await supabase
        .from("assessments")
        .update({ anamnesis_data: nextAnamnesis })
        .eq("id", target.id);
      if (error) throw error;
      toast({
        title: "Mobilidade e flexibilidade salvas",
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

  // Longitudinal evolution (only across assessments that already have data).
  // Movement names are normalized so spelling variants/abbreviations
  // ("rot int quadril" vs "rotação interna de quadril") share one series.
  const assessmentsWithRom = assessments.filter(
    (a: any) => sanitizeRomRows(a?.anamnesis_data?.romTable).length > 0,
  );
  const hasMultiple = assessmentsWithRom.length >= 2;
  const movementSeries = new Map<
    string,
    { label: string; labels: string[]; series: Array<{ date: string; L: string; R: string; esq: number | null; dir: number | null }> }
  >();
  assessmentsWithRom.forEach((a: any) => {
    sanitizeRomRows(a.anamnesis_data.romTable).forEach((r) => {
      const key = normalizeMovementKey(r.joint) || r.joint.trim().toLowerCase();
      const entry = movementSeries.get(key) || { label: "", labels: [], series: [] };
      entry.labels.push(r.joint);
      entry.series.push({
        date: fmtDate(a.created_at),
        L: r.leftValue,
        R: r.rightValue,
        esq: parseMeasurementValue(r.leftValue),
        dir: parseMeasurementValue(r.rightValue),
      });
      movementSeries.set(key, entry);
    });
  });
  movementSeries.forEach((entry) => {
    entry.label = pickMovementLabel(entry.labels);
  });

  return (
    <Card ref={cardRef} id="adm">
      <CardContent className="space-y-4 pt-5">
        <RomTable
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
              Salvar medidas
            </Button>
          </div>
        )}
        {hasMultiple && (
          <CollapsibleSection
            storageKey={`patient:${patient?.email || patient?.groupKey}:rom-history`}
            defaultOpen={false}
            header={
              <div className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Evolução por movimento
              </div>
            }
          >
            <div className="space-y-3 pt-3">
              {Array.from(movementSeries.entries()).map(([movement, entry]) => {
                const numericCount = entry.series.filter(
                  (s) => s.esq != null || s.dir != null,
                ).length;
                return (
                <div key={movement} className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold text-foreground mb-2">{entry.label}</p>
                  {numericCount >= 2 && (
                    <MovementEvolutionChart
                      data={entry.series.map((s) => ({ date: s.date, esq: s.esq, dir: s.dir }))}
                      unit={entry.series.some((x) => /cm/i.test(`${x.L} ${x.R}`)) ? " cm" : "°"}
                    />
                  )}
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
                          <th className="py-1.5 pr-3 font-medium">Data</th>
                          <th className="py-1.5 px-2 font-medium text-center">Esq</th>
                          <th className="py-1.5 pl-2 font-medium text-center">Dir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.series.map((s, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-1.5 pr-3 text-muted-foreground">{s.date}</td>
                            <td className="py-1.5 px-2 text-center font-mono">{s.L || "—"}</td>
                            <td className="py-1.5 pl-2 text-center font-mono">{s.R || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}
      </CardContent>
    </Card>
  );
}
