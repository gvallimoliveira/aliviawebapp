import { WORLDS, type WorldId } from "./content";
import { captionFor, kindAt } from "./captionFile";
import type { StudioFavorite } from "./useStudioFavorites";

/**
 * Cronograma sugerido de postagem para os favoritos do Studio.
 *
 * Regras editoriais (determinísticas, custo zero de créditos):
 * - 3 posts por semana: segunda 19h (gancho), quarta 12h30 (prova) e sexta 18h (oferta);
 * - alternância de mundos (Profissional → Paciente → Acadêmico → Clínica) para
 *   não queimar o mesmo público em sequência;
 * - o papel do post vem do tipo de bloco, e o formato sugerido do papel.
 */

export type PostRole = "Gancho" | "Prova" | "Conteúdo" | "Oferta";

const ROLE_BY_KIND: Record<string, PostRole> = {
  hero: "Gancho",
  kinetic: "Gancho",
  marquee: "Conteúdo",
  feature: "Conteúdo",
  journey: "Conteúdo",
  metrics: "Prova",
  compare: "Prova",
  quote: "Prova",
  closing: "Oferta",
};

const FORMAT_BY_ROLE: Record<PostRole, string> = {
  Gancho: "Reels (vídeo de tela, 7-12s)",
  Prova: "Carrossel (1-3 artes)",
  Conteúdo: "Post único + legenda longa",
  Oferta: "Story com link + post único",
};

const SLOTS: { weekday: number; time: string; role: PostRole }[] = [
  { weekday: 1, time: "19:00", role: "Gancho" },
  { weekday: 3, time: "12:30", role: "Prova" },
  { weekday: 5, time: "18:00", role: "Oferta" },
];

const WEEKDAY_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type ScheduledPost = {
  favorite: StudioFavorite;
  index: number;
  kind: string;
  world: WorldId;
  worldLabel: string;
  role: PostRole;
  suggestedFormat: string;
  date: Date;
  time: string;
  week: number;
  dateLabel: string;
  caption: string;
};

/** Intercala os favoritos por mundo para variar o público a cada post. */
const interleaveByWorld = (favorites: StudioFavorite[]) => {
  const order: WorldId[] = ["pro", "patient", "academic", "clinic"];
  const buckets = new Map<WorldId, StudioFavorite[]>();
  favorites.forEach((fav) => {
    const list = buckets.get(fav.world) ?? [];
    list.push(fav);
    buckets.set(fav.world, list);
  });
  const out: StudioFavorite[] = [];
  let remaining = favorites.length;
  while (remaining > 0) {
    for (const world of order) {
      const list = buckets.get(world);
      if (list?.length) {
        out.push(list.shift()!);
        remaining--;
      }
    }
    // Mundos fora da lista canônica (segurança contra dados antigos).
    for (const [world, list] of buckets) {
      if (!order.includes(world) && list.length) {
        out.push(list.shift()!);
        remaining--;
      }
    }
  }
  return out;
};

/** Próxima data (>= amanhã) que cai no dia da semana pedido. */
const nextDate = (from: Date, weekday: number) => {
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  const diff = (weekday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + (diff === 0 ? 7 : diff));
  return date;
};

export const buildSchedule = (favorites: StudioFavorite[], start = new Date()): ScheduledPost[] => {
  const ordered = interleaveByWorld(favorites);

  return ordered
    .map((favorite, position) => {
      const index = favorite.blockIndex ?? 0;
      const kind = favorite.blockKind ?? kindAt(favorite.world, favorite.seed, index) ?? "feature";
      const slot = SLOTS[position % SLOTS.length];
      const week = Math.floor(position / SLOTS.length);
      const base = nextDate(start, slot.weekday);
      base.setDate(base.getDate() + week * 7);
      const role = ROLE_BY_KIND[kind] ?? slot.role;

      return {
        favorite,
        index,
        kind,
        world: favorite.world,
        worldLabel: WORLDS[favorite.world]?.label ?? favorite.world,
        role,
        suggestedFormat: FORMAT_BY_ROLE[role],
        date: base,
        time: slot.time,
        week: week + 1,
        dateLabel: `${WEEKDAY_LABEL[base.getDay()]} ${base.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        })}`,
        caption: captionFor(favorite.world, favorite.seed, index, kind),
      } satisfies ScheduledPost;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};

const line = (char: string) => char.repeat(52);

/** Arquivo .txt com o cronograma completo, já com as legendas de cada post. */
export const buildScheduleFile = (posts: ScheduledPost[]) => {
  const header = [
    "CRONOGRAMA SUGERIDO DE POSTAGEM · ALIV.IA STUDIO",
    line("="),
    "Ritmo: 3 posts por semana (segunda 19h · quarta 12h30 · sexta 18h)",
    "Sequência alternando mundos para não saturar o mesmo público.",
    "",
  ].join("\n");

  const body = posts
    .map((post, i) => {
      const meta = [
        line("-"),
        `POST ${String(i + 1).padStart(2, "0")} · SEMANA ${post.week}`,
        `${post.dateLabel} às ${post.time}`,
        `Mundo: ${post.worldLabel}`,
        `Papel: ${post.role} · Formato: ${post.suggestedFormat}`,
        `Arte: ${String(post.index + 1).padStart(2, "0")} (${post.kind}) · seed ${post.favorite.seed}`,
        line("-"),
        "",
      ].join("\n");
      return `${meta}${post.caption}\n`;
    })
    .join("\n");

  return `${header}${body}`.trim();
};
