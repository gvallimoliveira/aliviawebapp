import { Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORLDS } from "./content";
import type { StudioFavorite } from "./useStudioFavorites";

type Props = {
  favorites: StudioFavorite[];
  onOpen: (fav: StudioFavorite) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

const StudioFavorites = ({ favorites, onOpen, onRemove, onClose }: Props) => (
  <div className="fixed right-3 top-3 z-50 w-[min(320px,90vw)] rounded-2xl border border-border bg-card/95 p-3 shadow-[0_18px_50px_-24px_hsl(var(--foreground)/0.5)] backdrop-blur print:hidden">
    <div className="mb-2 flex items-center justify-between">
      <p className="text-sm font-semibold text-foreground">Favoritos</p>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>

    {favorites.length === 0 ? (
      <p className="text-xs text-muted-foreground">
        Nenhum design favoritado ainda. Use a estrela na barra para salvar a versão atual — as novas
        composições passam a herdar parte do que você aprovou.
      </p>
    ) : (
      <ul className="max-h-[60svh] space-y-1.5 overflow-y-auto">
        {favorites.map((fav) => (
          <li key={fav.id} className="flex items-center gap-2 rounded-xl bg-muted/60 px-2.5 py-2">
            <button
              type="button"
              onClick={() => onOpen(fav)}
              className="flex-1 text-left text-xs text-foreground"
            >
              <span className="font-medium">{WORLDS[fav.world].label}</span>
              <span className="text-muted-foreground"> · {fav.seed} · {fav.format}</span>
            </button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={() => onRemove(fav.id)}
              title="Remover"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    )}

    {favorites.length > 0 && (
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
        “Evoluir favorito” mantém cerca de 60% da composição aprovada e sorteia o resto como novidade.
      </p>
    )}
  </div>
);

export default StudioFavorites;
