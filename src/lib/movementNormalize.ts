/**
 * Normalizes movement/joint labels so spelling variants, diacritics and common
 * physiotherapy abbreviations group into the same longitudinal series.
 *
 * Examples that map to the SAME key:
 *  - "Rot int quadril" / "Rotação Int. Quadril" / "rotação interna de quadril"
 *  - "Flexão de joelho" / "flexao joelho" / "Flex. Joelho"
 *
 * Context-aware abbreviations:
 *  - "ext" after a rotation token means "externa" (rot ext quadril);
 *    otherwise it means "extensao" (ext joelho → extensão de joelho).
 */

const STOPWORDS = new Set([
  "de", "do", "da", "dos", "das", "e", "com", "em", "no", "na", "a", "o",
  "adm", "amplitude", "movimento", "mov", "articular", "grauss", "graus",
]);

/** Diacritic-insensitive abbreviation map (tokens already stripped of accents). */
const ABBREV: Record<string, string> = {
  rot: "rotacao",
  rotac: "rotacao",
  int: "interna",
  intern: "interna",
  interno: "interna",
  internas: "interna",
  internos: "interna",
  extern: "externa",
  externo: "externa",
  externos: "externa",
  externas: "externa",
  flex: "flexao",
  flexoes: "flexao",
  extens: "extensao",
  extensoes: "extensao",
  abd: "abducao",
  abdut: "abducao",
  aduc: "aducao",
  adut: "aducao",
  quad: "quadril",
  quadris: "quadril",
  joelh: "joelho",
  joelhos: "joelho",
  torn: "tornozelo",
  tornoz: "tornozelo",
  tornozelos: "tornozelo",
  punh: "punho",
  punhos: "punho",
  coto: "cotovelo",
  cotovel: "cotovelo",
  cotovelos: "cotovelo",
  ombros: "ombro",
  med: "medial",
  lat: "lateral",
  horiz: "horizontal",
  vert: "vertical",
  bilat: "bilateral",
  unilat: "unilateral",
};

const ROTATION_TOKENS = new Set(["rotacao", "rotacional", "rotatorios"]);

/**
 * Returns a canonical grouping key for a movement label, or "" when the label
 * has no meaningful content.
 */
export const normalizeMovementKey = (label: string | undefined | null): string => {
  if (!label) return "";
  const stripped = String(label)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[°º]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!stripped) return "";

  let tokens = stripped.split(/\s+/).filter(Boolean);
  const hasRotation = tokens.some((t) =>
    ROTATION_TOKENS.has(ABBREV[t] || t) || t === "rot" || t === "rotac",
  );

  tokens = tokens.map((t) => {
    if (t === "ext") return hasRotation ? "externa" : "extensao";
    if (t === "int") return "interna";
    return ABBREV[t] || t;
  });

  const meaningful = tokens.filter((t) => !STOPWORDS.has(t));
  if (meaningful.length === 0) return "";
  return meaningful.sort().join(" ");
};

/**
 * Picks the best display label among variants of the same movement.
 * All variants share the same normalized key, so the fullest (longest) label
 * is the clearest for display; ties resolve to the most recent label.
 */
export const pickMovementLabel = (labels: string[]): string => {
  const clean = labels.map((l) => (l || "").trim()).filter(Boolean);
  if (clean.length === 0) return "";
  // labels arrive oldest → newest; on equal length prefer the latest one
  let best = clean[0];
  for (const l of clean) {
    if (l.length >= best.length) best = l;
  }
  return best;
};

/**
 * Parses a measurement value that may carry units/symbols ("23,5°", "17 kgf",
 * "35.2 (n=3)") into a plain number. Returns null when nothing numeric exists.
 */
export const parseMeasurementValue = (
  raw: string | number | undefined | null,
): number | null => {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw)
    .replace(/\(.*?\)/g, "") // drop annotations like "(n=3)"
    .replace(/[°º]|kgf?|kg|lbs?/gi, "")
    .trim();
  const match = cleaned.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
