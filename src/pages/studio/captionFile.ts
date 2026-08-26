import { createRng } from "./rng";
import { composePage } from "./composePage";
import { buildCaption } from "./caption";
import { WORLDS, type WorldId } from "./content";
import { personaForSeed } from "./personas";
import type { StudioFavorite } from "./useStudioFavorites";

/**
 * As legendas são determinísticas (mundo + seed + tipo do bloco + índice), então
 * um favorito sempre reconstrói exatamente a mesma legenda — mesmo depois de
 * atualizar a landing várias vezes.
 */
export const captionFor = (world: WorldId, seed: string, index: number, kind: string) =>
  buildCaption(WORLDS[world], kind as never, createRng(`${world}:${seed}:caption:${kind}:${index}`));

/** Descobre o tipo de bloco de um índice a partir da composição da seed. */
export const kindAt = (world: WorldId, seed: string, index: number) => {
  const blocks = composePage(createRng(`${world}:${seed}:layout`), personaForSeed(seed));
  return blocks[index]?.kind;
};

export const captionFileName = (world: WorldId, seed: string, index: number, kind: string) =>
  `alivia-studio-${world}-${seed}-${String(index + 1).padStart(2, "0")}-${kind}.txt`;

const separator = (title: string) => `\n\n${"=".repeat(46)}\n${title}\n${"=".repeat(46)}\n\n`;

/** Arquivo único com as legendas de todas as artes da versão atual. */
export const buildPageCaptions = (
  world: WorldId,
  seed: string,
  blocks: { kind: string }[],
) =>
  blocks
    .map(
      ({ kind }, i) =>
        separator(`ARTE ${String(i + 1).padStart(2, "0")} · ${kind.toUpperCase()} · ${WORLDS[world].label} · ${seed}`) +
        captionFor(world, seed, i, kind),
    )
    .join("\n")
    .trim();

/** Arquivo único com as legendas de todos os favoritos salvos. */
export const buildFavoritesCaptions = (favorites: StudioFavorite[]) =>
  favorites
    .map((fav) => {
      const index = fav.blockIndex ?? 0;
      const kind = fav.blockKind ?? kindAt(fav.world, fav.seed, index);
      if (!kind) return "";
      return (
        separator(
          `FAVORITO · ${WORLDS[fav.world].label} · ${fav.seed} · arte ${String(index + 1).padStart(2, "0")} (${kind})`,
        ) + captionFor(fav.world, fav.seed, index, kind)
      );
    })
    .filter(Boolean)
    .join("\n")
    .trim();
