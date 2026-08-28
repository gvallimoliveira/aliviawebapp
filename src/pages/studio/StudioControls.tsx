import { BarChart3, Camera, Copy, EyeOff, FileText, Images, Loader2, PenTool, RefreshCw, Shuffle, Sparkles, Star, StarOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WORLD_IDS, WORLDS, type WorldId } from "./content";
import type { StudioFormat } from "./blocks/shared";
import type { StudioPersona } from "./personas";
import VariationControl from "./VariationControl";
import type { VariationProfile } from "./variation";

type StudioControlsProps = {
  world: WorldId;
  format: StudioFormat;
  seed: string;
  /** Autor criativo desta versão (derivado da seed). */
  persona: StudioPersona;
  favorited: boolean;
  favoritesCount: number;
  canEvolve: boolean;
  onWorld: (world: WorldId) => void;
  onFormat: (format: StudioFormat) => void;
  onNewVersion: () => void;
  onEvolveFavorite: () => void;
  onToggleFavorite: () => void;
  onOpenFavorites: () => void;
  /** Abre o estudo de cobertura editorial (o que está muito e pouco divulgado). */
  onOpenCoverage: () => void;
  /** Abre o acervo privado de fotos da conta. */
  onOpenPhotos: () => void;
  photosCount: number;
  /** Nome da funcionalidade que está sendo forçada nesta versão, se houver. */
  forcedTopicLabel?: string;
  onHide: () => void;
  /** Exporta todas as artes da versão atual em PNG, uma a uma. */
  onExportAllPng: () => void;
  /** Baixa um único .txt com as legendas de todas as artes da versão. */
  onExportAllCaptions: () => void;
  /** Indica progresso do lote de PNGs ("3/8") ou null quando parado. */
  batchProgress: string | null;
  variation: VariationProfile;
  onVariation: (value: VariationProfile) => void;
};


const FORMATS: { id: StudioFormat; label: string }[] = [
  { id: "9x16", label: "9:16" },
  { id: "1x1", label: "1:1" },
  { id: "free", label: "Livre" },
];

const StudioControls = ({
  world,
  format,
  seed,
  persona,
  favorited,
  favoritesCount,
  canEvolve,
  onWorld,
  onFormat,
  onNewVersion,
  onEvolveFavorite,
  onToggleFavorite,
  onOpenFavorites,
  onOpenCoverage,
  onOpenPhotos,
  photosCount,
  forcedTopicLabel,
  onHide,

  onExportAllPng,
  onExportAllCaptions,
  batchProgress,
  variation,
  onVariation,
}: StudioControlsProps) => {
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
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-border bg-card/95 p-2 shadow-[0_18px_50px_-24px_hsl(var(--foreground)/0.5)] backdrop-blur">
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

        <VariationControl
          value={variation}
          onChange={onVariation}
          register="tecnico"
          previewSeed={`internal:${seed}`}
          compact
        />

        {canEvolve && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 rounded-xl text-xs"
            onClick={onEvolveFavorite}
            title="Nova versão herdando parte de um favorito"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Evoluir favorito
          </Button>
        )}

        <Button
          size="sm"
          variant={favorited ? "default" : "outline"}
          className="h-8 gap-1.5 rounded-xl text-xs"
          onClick={onToggleFavorite}
          title={favorited ? "Remover dos favoritos" : "Favoritar esta versão"}
        >
          {favorited ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
          {favorited ? "Favoritado" : "Favoritar"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-xl text-xs"
          onClick={onExportAllPng}
          disabled={!!batchProgress}
          title="Baixar todas as artes desta versão em PNG"
        >
          {batchProgress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Images className="h-3.5 w-3.5" />}
          {batchProgress ? `PNGs ${batchProgress}` : "Baixar todas"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-xl text-xs"
          onClick={onExportAllCaptions}
          title="Baixar um .txt com todas as legendas desta versão"
        >
          <FileText className="h-3.5 w-3.5" />
          Legendas .txt
        </Button>

        <Button
          size="sm"
          variant={forcedTopicLabel ? "default" : "outline"}
          className="h-8 max-w-[15rem] gap-1.5 rounded-xl text-xs"
          onClick={onOpenCoverage}
          title="Estudo de cobertura: o que já é muito divulgado e o que precisa de palco"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="truncate">{forcedTopicLabel ? `Foco: ${forcedTopicLabel}` : "Cobertura"}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-xl text-xs"
          onClick={onOpenPhotos}
          title="Acervo de fotos da conta: entram nas artes fotográficas"
        >
          <Camera className="h-3.5 w-3.5" />
          Fotos ({photosCount})
        </Button>

        <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-xl text-xs" onClick={onOpenFavorites}>
          Favoritos ({favoritesCount})
        </Button>


        <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl text-xs" onClick={copyLink}>
          <Copy className="h-3.5 w-3.5" />
          {seed}
        </Button>

        <span
          className="hidden items-center gap-1.5 rounded-xl border border-border bg-muted px-2.5 py-1.5 text-xs text-muted-foreground sm:inline-flex"
          title={`Arte por ${persona.name} — ${persona.role} · ${persona.signature}`}
        >
          <PenTool className="h-3.5 w-3.5 text-primary" />
          {persona.name}
        </span>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 rounded-xl text-xs"
          onClick={onHide}
          title="Ocultar controles (tecla H)"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Ocultar
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 rounded-xl p-0"
          onClick={onNewVersion}
          title="Renovar conteúdo e criativos (nova seed)"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>

      </div>
    </div>
  );
};

export default StudioControls;
