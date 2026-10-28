/**
 * FEED PRINCIPAL (preset de favoritos) + CALENDÁRIO MENSAL
 *
 * Cinco pilares fixos dão repetição visual ao feed. A ordem de rotação é
 * determinística: Dor do nicho → Software na prática → Clean → Solução
 * completa → Educativo. Posts saem em segunda/quarta/sexta; vídeos com a
 * cara do dono são "extras" e não ocupam vaga da rotação.
 */

export type FeedPillar = "dor" | "software" | "clean" | "solucao" | "educativo";

export const FEED_PILLARS: { id: FeedPillar; label: string; models: string[]; kinds: string[] }[] = [
  { id: "dor", label: "Para quem é (dor do nicho)", models: ["recado", "tweet"], kinds: ["notice", "tweet"] },
  { id: "software", label: "Software na prática", models: ["tutorial", "ladoalado"], kinds: ["tutorial", "phoneSide"] },
  { id: "clean", label: "Clean / posicionamento", models: ["minimal", "citacaoassinada"], kinds: ["mono", "echo", "pullQuote"] },
  { id: "solucao", label: "Solução completa", models: ["hub"], kinds: ["hub"] },
  { id: "educativo", label: "Educativo / método", models: ["carrossel", "passos"], kinds: ["carousel", "journey", "list"] },
];

export const FEED_ROTATION: FeedPillar[] = FEED_PILLARS.map((p) => p.id);
export const FEED_PRESET_MODELS: string[] = FEED_PILLARS.flatMap((p) => p.models);
/** Dias da semana com post (0 = domingo). */
export const FEED_WEEKDAYS = [1, 3, 5];

export const pillarLabel = (id: string | null | undefined) =>
  FEED_PILLARS.find((p) => p.id === id)?.label ?? "Fora dos pilares";

export const pillarOfKind = (kind: string | null | undefined): FeedPillar | null =>
  FEED_PILLARS.find((p) => p.kinds.includes(kind ?? ""))?.id ?? null;

/** O preset está ativo quando a seleção de modelos é exatamente a do feed. */
export const isFeedPreset = (models: string[]) =>
  models.length === FEED_PRESET_MODELS.length && FEED_PRESET_MODELS.every((m) => models.includes(m));

export type FeedEntry = {
  id: string;
  kind: "art" | "video";
  pillar: string | null;
  created_at: string;
  scheduled_date: string | null;
  posted_at: string | null;
};

export type PlacedEntry<T extends FeedEntry> = { entry: T; date: string; slot: number | null; extra: boolean };

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Próximas datas de post a partir de `from` (inclusive), pulando datas já ocupadas. */
const postDates = (from: string, taken: Set<string>) => {
  const cursor = parse(from);
  return () => {
    for (;;) {
      const key = iso(cursor);
      const ok = FEED_WEEKDAYS.includes(cursor.getDay()) && !taken.has(key);
      cursor.setDate(cursor.getDate() + 1);
      if (ok) {
        taken.add(key);
        return key;
      }
    }
  };
};

/**
 * Distribui as artes na ordem da rotação. Postadas ficam na data em que foram
 * postadas; datas fixadas à mão são respeitadas; o restante entra na fila a
 * partir de `today`, sempre buscando o próximo pilar da rotação (se faltar
 * arte daquele pilar, usa o próximo pilar disponível — a ordem nunca trava).
 */
export const placeFeed = <T extends FeedEntry>(entries: T[], today: string): PlacedEntry<T>[] => {
  const out: PlacedEntry<T>[] = [];
  const taken = new Set<string>();
  const arts = entries.filter((e) => e.kind === "art");
  arts.forEach((e) => {
    const fixed = e.posted_at ?? e.scheduled_date;
    if (fixed) {
      taken.add(fixed);
      out.push({ entry: e, date: fixed, slot: null, extra: false });
    }
  });
  const queue = arts
    .filter((e) => !e.posted_at && !e.scheduled_date)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const next = postDates(today, taken);
  let turn = 0;
  let slot = 1;
  while (queue.length) {
    let picked = -1;
    for (let k = 0; k < FEED_ROTATION.length && picked < 0; k++) {
      const pillar = FEED_ROTATION[(turn + k) % FEED_ROTATION.length];
      picked = queue.findIndex((e) => e.pillar === pillar);
      if (picked >= 0) turn = (turn + k + 1) % FEED_ROTATION.length;
    }
    if (picked < 0) picked = 0;
    const [e] = queue.splice(picked, 1);
    out.push({ entry: e, date: next(), slot: slot++, extra: false });
  }
  entries
    .filter((e) => e.kind === "video")
    .forEach((e) => out.push({ entry: e, date: e.posted_at ?? e.scheduled_date ?? today, slot: null, extra: true }));
  return out.sort((a, b) => a.date.localeCompare(b.date) || Number(a.extra) - Number(b.extra));
};

export const localToday = () => iso(new Date());
