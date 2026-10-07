// Janelas de exibição do controle de carga (puras, sem IA).
// Frente do prontuário: listas em texto = últimos 3 dias; gráficos = 7 dias
// corridos. Sem dados recentes, cai para os dias mais recentes que tiverem
// registro. Cálculos de risco (aguda/crônica/ACWR) NÃO usam estas janelas.
import { trainingLoad } from "./periodization";

export const TEXT_WINDOW_DAYS = 3;
export const CHART_WINDOW_DAYS = 7;
export const HISTORY_BLOCK_DAYS = 45;
export const LOAD_TRACKS = ["physio", "gym", "cardio", "sport"] as const;

export const addDaysISO = (iso: string, n: number): string => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export interface DayWindow {
  from: string;
  to: string;
  /** true quando não havia dado na janela atual e exibimos a mais recente com dado. */
  fallback: boolean;
}

/** Janela de `days` dias terminando hoje; sem dado nela, termina no último dia com dado (≤ hoje). */
export function recentDaysWindow(dates: string[], days: number, today: string): DayWindow {
  const from = addDaysISO(today, -(days - 1));
  const past = dates.map((d) => d.slice(0, 10)).filter((d) => d <= today);
  if (past.some((d) => d >= from) || past.length === 0) return { from, to: today, fallback: false };
  const last = past.reduce((m, d) => (d > m ? d : m), past[0]);
  return { from: addDaysISO(last, -(days - 1)), to: last, fallback: true };
}

export const inWindow = (iso: string, w: { from: string; to: string }) => {
  const d = iso.slice(0, 10);
  return d >= w.from && d <= w.to;
};

/** Agrupa por dia, do mais recente para o mais antigo. */
export function groupByDay<T>(items: T[], getDate: (x: T) => string): Array<{ date: string; items: T[] }> {
  const map = new Map<string, T[]>();
  items.forEach((x) => {
    const d = getDate(x).slice(0, 10);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(x);
  });
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([date, items]) => ({ date, items }));
}

export interface DailyLoadPoint {
  date: string;
  physio: number;
  gym: number;
  cardio: number;
  sport: number;
  total: number;
}

/** Série diária (todos os dias do intervalo, inclusive vazios) empilhada por frente. */
export function rollingDailySeries(
  entries: Array<{ session_date: string; track?: string | null; duration_min: number; rpe: number }>,
  from: string,
  to: string,
): DailyLoadPoint[] {
  const out: DailyLoadPoint[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) {
    out.push({ date: d, physio: 0, gym: 0, cardio: 0, sport: 0, total: 0 });
  }
  const idx = new Map(out.map((p, i) => [p.date, i]));
  entries.forEach((e) => {
    const i = idx.get(e.session_date.slice(0, 10));
    if (i === undefined) return;
    const t = (LOAD_TRACKS as readonly string[]).includes(e.track || "") ? (e.track as keyof DailyLoadPoint) : "physio";
    const load = trainingLoad(e.duration_min, e.rpe);
    (out[i][t] as number) += load;
    out[i].total += load;
  });
  return out;
}

export function dayLabel(iso: string, today: string): string {
  if (iso === today) return "Hoje";
  if (iso === addDaysISO(today, -1)) return "Ontem";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}
