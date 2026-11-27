/**
 * Pure metrics for the clinic satisfaction survey (clinic_feedback_surveys).
 * Every question the patient answers is represented here, so the Insights
 * card, the CSV and the printable report read the same numbers.
 */

export type FeedbackArea = "service" | "professional" | "clinic";
export type CommentArea = FeedbackArea | "general";
export type Sentiment = "promoter" | "passive" | "detractor" | "unknown";

export interface FeedbackRow {
  id: string;
  created_at: string;
  service_type: string;
  professional_id?: string | null;
  clinician_member_id?: string | null;
  clinician_name?: string | null;
  service_answers?: Record<string, unknown> | null;
  professional_answers?: Record<string, unknown> | null;
  clinic_answers?: Record<string, unknown> | null;
  general_observations?: string | null;
}

export interface FeedbackItem {
  key: string;
  area: FeedbackArea;
  /** Answer values from best to worst, exactly as the public form stores them. */
  scale: string[];
  /** Values counted as a favourable answer. */
  positive: string[];
}

const QUALITY = ["excelente", "bom", "regular", "ruim"];
const QUALITY_POS = ["excelente", "bom"];

export const FEEDBACK_ITEMS: FeedbackItem[] = [
  { key: "quality", area: "service", scale: QUALITY, positive: QUALITY_POS },
  { key: "result", area: "service", scale: ["superou", "atendeu", "parcialmente", "nao_atendeu"], positive: ["superou", "atendeu"] },
  { key: "communication", area: "professional", scale: QUALITY, positive: QUALITY_POS },
  { key: "punctuality", area: "professional", scale: ["sempre", "geralmente", "as_vezes", "frequentemente"], positive: ["sempre", "geralmente"] },
  { key: "empathy", area: "professional", scale: QUALITY, positive: QUALITY_POS },
  { key: "cleanliness", area: "clinic", scale: QUALITY, positive: QUALITY_POS },
  { key: "scheduling", area: "clinic", scale: ["muito_facil", "facil", "dificil", "muito_dificil"], positive: ["muito_facil", "facil"] },
  { key: "environment", area: "clinic", scale: QUALITY, positive: QUALITY_POS },
];

export const FEEDBACK_AREAS: FeedbackArea[] = ["service", "professional", "clinic"];

/** Below this many answers a percentage is shown but never raised as an alert. */
export const MIN_ANSWERS_FOR_ALERT = 5;
/** Share of unfavourable answers that turns an item into an attention point. */
export const ATTENTION_THRESHOLD_PCT = 15;

const answersOf = (row: FeedbackRow, area: FeedbackArea): Record<string, unknown> => {
  const raw = area === "service" ? row.service_answers : area === "professional" ? row.professional_answers : row.clinic_answers;
  return raw && typeof raw === "object" ? raw : {};
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export const answerOf = (row: FeedbackRow, item: FeedbackItem): string => text(answersOf(row, item.area)[item.key]);

export const sentimentOf = (row: FeedbackRow): Sentiment => {
  const rec = text(answersOf(row, "service").recommend);
  return rec === "sim" ? "promoter" : rec === "talvez" ? "passive" : rec === "nao" ? "detractor" : "unknown";
};

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : null);

/** Rows inside the last `days` days; `offsetDays` shifts the window back (previous period). */
export const filterByPeriod = (rows: FeedbackRow[], days: number | null, now: Date = new Date(), offsetDays = 0): FeedbackRow[] => {
  if (days === null) return rows;
  const end = now.getTime() - offsetDays * 86_400_000;
  const start = end - days * 86_400_000;
  return rows.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t > start && t <= end;
  });
};

export interface NpsSummary {
  responses: number;
  /** Responses that answered the recommendation question. */
  answered: number;
  promoters: number;
  passives: number;
  detractors: number;
  promoterPct: number | null;
  passivePct: number | null;
  detractorPct: number | null;
  /** null when nobody answered the recommendation question. */
  nps: number | null;
}

/**
 * NPS from the 3-option recommendation question (Sim / Talvez / Não):
 * % promoters − % detractors over those who answered it. Blank answers are
 * left out instead of diluting the score.
 */
export const npsSummary = (rows: FeedbackRow[]): NpsSummary => {
  let promoters = 0, passives = 0, detractors = 0;
  rows.forEach((r) => {
    const s = sentimentOf(r);
    if (s === "promoter") promoters++;
    else if (s === "passive") passives++;
    else if (s === "detractor") detractors++;
  });
  const answered = promoters + passives + detractors;
  return {
    responses: rows.length, answered, promoters, passives, detractors,
    promoterPct: pct(promoters, answered), passivePct: pct(passives, answered), detractorPct: pct(detractors, answered),
    nps: answered > 0 ? Math.round(((promoters - detractors) / answered) * 100) : null,
  };
};

export interface ItemScore {
  item: FeedbackItem;
  answered: number;
  positive: number;
  negative: number;
  positivePct: number | null;
  negativePct: number | null;
  /** Count per answer value, in the item's best → worst order. */
  counts: { value: string; count: number }[];
}

export const itemScore = (rows: FeedbackRow[], item: FeedbackItem): ItemScore => {
  const tally: Record<string, number> = {};
  rows.forEach((r) => {
    const a = answerOf(r, item);
    if (item.scale.includes(a)) tally[a] = (tally[a] || 0) + 1;
  });
  const counts = item.scale.map((value) => ({ value, count: tally[value] || 0 }));
  const answered = counts.reduce((s, c) => s + c.count, 0);
  const positive = counts.filter((c) => item.positive.includes(c.value)).reduce((s, c) => s + c.count, 0);
  const negative = answered - positive;
  return { item, answered, positive, negative, positivePct: pct(positive, answered), negativePct: pct(negative, answered), counts };
};

export interface AreaScore {
  area: FeedbackArea;
  items: ItemScore[];
  /** Favourable share over every answer given in the area; null with no answers. */
  positivePct: number | null;
  answered: number;
}

export const areaScores = (rows: FeedbackRow[]): AreaScore[] =>
  FEEDBACK_AREAS.map((area) => {
    const items = FEEDBACK_ITEMS.filter((i) => i.area === area).map((i) => itemScore(rows, i));
    const answered = items.reduce((s, i) => s + i.answered, 0);
    const positive = items.reduce((s, i) => s + i.positive, 0);
    return { area, items, answered, positivePct: pct(positive, answered) };
  });

/** Items with enough answers and a relevant share of unfavourable ones, worst first. */
export const attentionPoints = (areas: AreaScore[]): ItemScore[] =>
  areas
    .flatMap((a) => a.items)
    .filter((i) => i.answered >= MIN_ANSWERS_FOR_ALERT && (i.negativePct ?? 0) >= ATTENTION_THRESHOLD_PCT)
    .sort((a, b) => (b.negativePct ?? 0) - (a.negativePct ?? 0));

export interface TrendPoint { key: string; label: string; responses: number; nps: number | null; satisfaction: number | null }

export const monthlyTrend = (rows: FeedbackRow[]): TrendPoint[] => {
  const byMonth: Record<string, FeedbackRow[]> = {};
  rows.forEach((r) => {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    (byMonth[key] ||= []).push(r);
  });
  const quality = FEEDBACK_ITEMS[0];
  return Object.keys(byMonth).sort().map((key) => ({
    key,
    label: `${key.slice(5)}/${key.slice(2, 4)}`,
    responses: byMonth[key].length,
    nps: npsSummary(byMonth[key]).nps,
    satisfaction: itemScore(byMonth[key], quality).positivePct,
  }));
};

export interface ServiceScore { service: string; responses: number; nps: number | null; satisfaction: number | null; result: number | null }

export const byService = (rows: FeedbackRow[]): ServiceScore[] => {
  const groups: Record<string, FeedbackRow[]> = {};
  rows.forEach((r) => { (groups[r.service_type || "fisioterapia"] ||= []).push(r); });
  return Object.entries(groups)
    .map(([service, list]) => ({
      service,
      responses: list.length,
      nps: npsSummary(list).nps,
      satisfaction: itemScore(list, FEEDBACK_ITEMS[0]).positivePct,
      result: itemScore(list, FEEDBACK_ITEMS[1]).positivePct,
    }))
    .sort((a, b) => b.responses - a.responses);
};

export interface ResponseDetail {
  id: string;
  clinician_name?: string | null;
  created_at: string;
  service: string;
  sentiment: Sentiment;
  ratings: { item: FeedbackItem; value: string; positive: boolean }[];
  comments: { area: CommentArea; text: string }[];
  /** At least one unfavourable rating, or the patient would not recommend. */
  hasLowRating: boolean;
}

/** One entry per response with every rating and all four free-text fields, untruncated. */
export const responseDetails = (rows: FeedbackRow[]): ResponseDetail[] =>
  rows.map((r) => {
    const ratings = FEEDBACK_ITEMS
      .map((item) => ({ item, value: answerOf(r, item) }))
      .filter((x) => x.item.scale.includes(x.value))
      .map((x) => ({ ...x, positive: x.item.positive.includes(x.value) }));
    const comments: { area: CommentArea; text: string }[] = [];
    FEEDBACK_AREAS.forEach((area) => {
      const t = text(answersOf(r, area).observations);
      if (t) comments.push({ area, text: t });
    });
    const general = text(r.general_observations);
    if (general) comments.push({ area: "general", text: general });
    const sentiment = sentimentOf(r);
    return {
      id: r.id, clinician_name: r.clinician_name, created_at: r.created_at, service: r.service_type || "fisioterapia", sentiment, ratings, comments,
      hasLowRating: sentiment === "detractor" || ratings.some((x) => !x.positive),
    };
  });
