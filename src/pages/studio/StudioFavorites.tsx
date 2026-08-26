import { useMemo, useState } from "react";
import { CalendarDays, FileText, ImageIcon, LayoutGrid, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORLDS } from "./content";
import { buildSchedule } from "./schedule";
import { useStudioThumbs } from "./useStudioThumbs";
import type { StudioFavorite } from "./useStudioFavorites";

type Props = {
  favorites: StudioFavorite[];
  onOpen: (fav: StudioFavorite) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  /** Baixa um único .txt com as legendas de todos os favoritos. */
  onExportCaptions: () => void;
  /** Baixa o cronograma sugerido (datas + legendas) em .txt. */
  onExportSchedule: () => void;
};

const labelOf = (fav: StudioFavorite) =>
  `${WORLDS[fav.world]?.label ?? fav.world}${
    fav.blockKind ? ` · arte ${String((fav.blockIndex ?? 0) + 1).padStart(2, "0")}` : " · landing inteira"
  }`;

const ROLE_TONE: Record<string, string> = {
  Gancho: "bg-primary/15 text-primary",
  Prova: "bg-emerald-500/15 text-emerald-600",
  Conteúdo: "bg-sky-500/15 text-sky-600",
  Oferta: "bg-amber-500/20 text-amber-700",
};

const StudioFavorites = ({
  favorites,
  onOpen,
  onRemove,
  onClose,
  onExportCaptions,
  onExportSchedule,
}: Props) => {
  const [tab, setTab] = useState<"gallery" | "schedule">("gallery");
  const thumbs = useStudioThumbs();
  const schedule = useMemo(() => buildSchedule(favorites), [favorites]);

  const Thumb = ({ fav, className = "" }: { fav: StudioFavorite; className?: string }) => {
    const src = thumbs[fav.id];
    return src ? (
      <img
        src={src}
        alt={`Miniatura da arte ${labelOf(fav)}`}
        loading="lazy"
        className={`h-full w-full object-cover object-top ${className}`}
      />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground">
        <ImageIcon className="h-4 w-4" />
        <span className="px-1 text-center text-[9px] leading-tight">sem miniatura</span>
      </div>
    );
  };

  return (
    <div className="fixed right-3 top-3 z-50 w-[min(420px,92vw)] rounded-2xl border border-border bg-card/95 p-3 shadow-[0_18px_50px_-24px_hsl(var(--foreground)/0.5)] backdrop-blur print:hidden">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          Favoritos {favorites.length > 0 && <span className="text-muted-foreground">({favorites.length})</span>}
        </p>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {favorites.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum design favoritado ainda. Use a estrela na arte para salvar — a miniatura é capturada
          no momento em que você favorita, e as novas composições herdam parte do que você aprovou.
        </p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(
              [
                ["gallery", "Galeria", LayoutGrid],
                ["schedule", "Cronograma", CalendarDays],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                  tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {tab === "gallery" ? (
            <ul className="grid max-h-[58svh] grid-cols-2 gap-2 overflow-y-auto pr-1">
              {favorites.map((fav) => (
                <li
                  key={fav.id}
                  className="group relative overflow-hidden rounded-xl border border-border bg-muted/50"
                >
                  <button
                    type="button"
                    onClick={() => onOpen(fav)}
                    className="block w-full text-left"
                    title="Abrir esta arte"
                  >
                    <span className="block aspect-[9/12] w-full overflow-hidden">
                      <Thumb fav={fav} />
                    </span>
                    <span className="block px-2 py-1.5">
                      <span className="block truncate text-[11px] font-medium text-foreground">
                        {labelOf(fav)}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {fav.blockKind ?? "landing"} · {fav.seed}
                      </span>
                    </span>
                  </button>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full p-0 opacity-80"
                    onClick={() => onRemove(fav.id)}
                    title="Remover dos favoritos"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <ol className="max-h-[58svh] space-y-2 overflow-y-auto pr-1">
              {schedule.map((post, i) => (
                <li key={post.favorite.id} className="flex gap-2 rounded-xl border border-border bg-muted/40 p-2">
                  <button
                    type="button"
                    onClick={() => onOpen(post.favorite)}
                    className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-border"
                    title="Abrir esta arte"
                  >
                    <Thumb fav={post.favorite} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-foreground">
                        {String(i + 1).padStart(2, "0")} · {post.dateLabel} {post.time}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                          ROLE_TONE[post.role] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {post.role}
                      </span>
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">
                      Semana {post.week} · {post.worldLabel} · {post.suggestedFormat}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-foreground/80">
                      {post.caption.split("\n")[0]}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-2 grid gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full gap-1.5 rounded-xl text-xs"
              onClick={onExportSchedule}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Baixar cronograma com legendas (.txt)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-full gap-1.5 rounded-xl text-xs"
              onClick={onExportCaptions}
            >
              <FileText className="h-3.5 w-3.5" />
              Só as legendas dos favoritos (.txt)
            </Button>
          </div>

          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
            Ritmo sugerido: 3 posts por semana (seg 19h · qua 12h30 · sex 18h), alternando mundos.
          </p>
        </>
      )}

      {/* Backup do acervo: favoritos + miniaturas em um único JSON. */}
      <div className="mt-3 grid gap-1.5 border-t border-border pt-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-full gap-1.5 rounded-xl text-xs"
          onClick={downloadBackup}
          disabled={favorites.length === 0}
        >
          <Download className="h-3.5 w-3.5" />
          Backup do acervo (.json)
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-full gap-1.5 rounded-xl text-xs"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          Restaurar backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleRestore}
        />
      </div>
    </div>
  );
};


export default StudioFavorites;
