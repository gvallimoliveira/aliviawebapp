import { useMemo, useState } from "react";
import { Download, RotateCcw, Target, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WORLDS, type WorldId } from "./content";
import { buildCoverage, buildCoverageReport, readExposureLog, resetExposure } from "./coverage";
import { exportTextFile } from "./exportText";
import type { TopicId, TopicWeight } from "./topics";

const WEIGHT_LABEL: Record<TopicWeight, string> = {
  pilar: "Pilar",
  diferencial: "Diferencial",
  subexposto: "Subexposto",
};

const WEIGHT_STYLE: Record<TopicWeight, string> = {
  pilar: "bg-primary/10 text-primary",
  diferencial: "bg-accent text-accent-foreground",
  subexposto: "bg-destructive/10 text-destructive",
};

type Props = {
  world: WorldId;
  forced?: TopicId;
  onForce: (topic: TopicId) => void;
  onClearForce: () => void;
  onClose: () => void;
};

/**
 * Estudo interno de cobertura editorial: o que já é muito divulgado e o que
 * precisa de palco. Consultado antes de decidir o conteúdo da próxima versão.
 */
const StudioCoveragePanel = ({ world, forced, onForce, onClearForce, onClose }: Props) => {
  const [version, setVersion] = useState(0);
  const content = WORLDS[world];

  const coverage = useMemo(
    () => buildCoverage(world, content, readExposureLog()),
    // `version` força releitura após reset
    [world, content, version],
  );

  const ranked = useMemo(() => [...coverage.topics].sort((a, b) => b.debt - a.debt), [coverage]);
  const never = ranked.filter((t) => t.exposures === 0).length;

  const download = async () => {
    try {
      await exportTextFile(
        buildCoverageReport(coverage, content.label),
        `alivia-studio-${world}-cobertura.txt`,
      );
      toast.success("Estudo de cobertura baixado");
    } catch {
      toast.error("Não foi possível baixar o estudo.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 p-3 backdrop-blur-sm print:hidden">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Cobertura editorial · {content.label}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {coverage.topics.length} funcionalidades monitoradas · {never} ainda sem nenhuma arte
              publicada · dívida 100 = falar primeiro
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>

        {forced && (
          <div className="flex items-center justify-between gap-2 border-b border-border bg-primary/5 px-4 py-2 text-[11px] text-primary">
            <span>Forçando cobertura de: {coverage.byId[forced]?.label ?? forced}</span>
            <button type="button" onClick={onClearForce} className="underline">
              remover
            </button>
          </div>
        )}

        <div className="max-h-[52vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/90 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
              <tr>
                <th className="px-4 py-2 font-medium">Funcionalidade</th>
                <th className="px-2 py-2 font-medium">Menções</th>
                <th className="px-2 py-2 font-medium">No ar</th>
                <th className="px-2 py-2 font-medium">Dívida</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {ranked.map((t) => (
                <tr key={t.id} className="border-t border-border/60">
                  <td className="px-4 py-2">
                    <span className="font-medium text-foreground">{t.label}</span>
                    <span
                      className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${WEIGHT_STYLE[t.weight]}`}
                    >
                      {WEIGHT_LABEL[t.weight]}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{t.mentions}</td>
                  <td className="px-2 py-2 text-muted-foreground">{t.exposures}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${t.debtScore}%` }} />
                      </div>
                      <span className="tabular-nums text-muted-foreground">{t.debtScore}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onForce(t.id)}
                      title="Gerar uma versão priorizando este assunto"
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Target className="h-3 w-3" />
                      Forçar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl text-xs" onClick={download}>
            <Download className="h-3.5 w-3.5" />
            Baixar estudo .txt
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 rounded-xl text-xs"
            onClick={() => {
              resetExposure(world);
              setVersion((v) => v + 1);
              toast.success("Histórico de exposição deste mundo zerado");
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Zerar histórico
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default StudioCoveragePanel;
