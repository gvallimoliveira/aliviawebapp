import { Copy, Eye, RefreshCw, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WORLD_IDS, WORLDS, type WorldId } from "./content";
import type { StudioFormat } from "./blocks/shared";

type StudioControlsProps = {
  world: WorldId;
  format: StudioFormat;
  seed: string;
  onWorld: (world: WorldId) => void;
  onFormat: (format: StudioFormat) => void;
  onNewVersion: () => void;
  onHide: () => void;
};

const FORMATS: { id: StudioFormat; label: string }[] = [
  { id: "9x16", label: "9:16" },
  { id: "1x1", label: "1:1" },
  { id: "free", label: "Livre" },
];

const StudioControls = ({ world, format, seed, onWorld, onFormat, onNewVersion, onHide }: StudioControlsProps) => {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link desta versão copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-3 print:hidden">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 p-2 shadow-[0_18px_50px_-24px_hsl(var(--foreground)/0.5)] backdrop-blur">
        <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
          {WORLD_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onWorld(id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                world === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {WORLDS[id].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFormat(f.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                format === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Button size="sm" className="h-8 gap-1.5 rounded-xl text-xs" onClick={onNewVersion}>
          <Shuffle className="h-3.5 w-3.5" />
          Nova landing preview
        </Button>

        <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl text-xs" onClick={copyLink}>
          <Copy className="h-3.5 w-3.5" />
          {seed}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 rounded-xl text-xs"
          onClick={onHide}
          title="Ocultar controles (tecla H)"
        >
          <Eye className="h-3.5 w-3.5" />
          Ocultar
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 rounded-xl p-0"
          onClick={() => window.location.reload()}
          title="Recarregar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default StudioControls;
