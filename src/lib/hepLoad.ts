/**
 * Cálculo local e determinístico de volume/intensidade de um programa HEP.
 * Volume = repetições totais (séries × reps); intensidade = reps por série
 * (ou segundos de isometria). Nunca consome IA.
 */

export type Intensity = "light" | "moderate" | "high";
export type VolumeLevel = "low" | "moderate" | "high";

export interface HepLoadItem {
  name: string;
  region: string;
  sets: string;
  reps: string;
  frequency: string;
  loadKg?: number | null;
  loadType?: string | null; // "kg" | "bodyweight" | "band"
  /** Objetivo da biblioteca: strengthening | stabilization | proprioception | mobility | stretching */
  category?: string | null;
}

export interface ParsedItem extends HepLoadItem {
  setsN: number;
  repsN: number | null;
  holdS: number | null;
  perWeek: number;
  totalReps: number;
  volumeLoad: number; // séries × reps × kg
  tut: number; // séries × segundos
  tutLoad: number; // séries × segundos × kg
  intensity: Intensity | null;
  volume: VolumeLevel | null;
  weeklySets: number; // séries semanais EFETIVAS (já ponderadas pelo objetivo)
  durationMin: number;
  loadWeight: number; // 1 força, 0,5 estabilização, 0 mobilidade/flexibilidade
  effectiveSets: number;
}

const num = (v: string) => {
  const nums = (v || "").replace(",", ".").match(/\d+(\.\d+)?/g)?.map(Number) || [];
  if (!nums.length) return null;
  // "8-12" → média
  return nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0];
};

export function parseSets(v: string): number {
  const n = num(v);
  return n && n > 0 ? Math.round(n) : 0;
}

/** Retorna { reps } ou { hold } (segundos) conforme a escrita. */
export function parseReps(v: string): { reps: number | null; hold: number | null } {
  const s = (v || "").toLowerCase();
  const n = num(s);
  if (n == null) return { reps: null, hold: null };
  if (/min/.test(s)) return { reps: null, hold: n * 60 };
  if (/(\d\s*s\b|seg|sec|''|")/.test(s)) return { reps: null, hold: n };
  return { reps: n, hold: null };
}

export function parseFrequency(v: string): number {
  const s = (v || "").toLowerCase();
  if (/di[aá]ri|todos os dias|daily|7x/.test(s)) return 7;
  const n = num(s);
  if (n == null) return 3;
  if (/dia|day/.test(s) && !/semana|week/.test(s)) return 7;
  return Math.max(1, Math.min(7, Math.round(n)));
}

export function intensityOf(reps: number | null, hold: number | null): Intensity | null {
  if (hold != null) return hold <= 6 ? "high" : hold <= 15 ? "moderate" : "light";
  if (reps != null) return reps <= 4 ? "high" : reps <= 12 ? "moderate" : "light";
  return null;
}

/** Volume por exercício: total de repetições (isometria: séries como equivalente). */
export function volumeOf(totalReps: number, sets: number, isHold: boolean): VolumeLevel | null {
  if (isHold) return sets <= 2 ? "low" : sets <= 4 ? "moderate" : "high";
  if (!totalReps) return null;
  return totalReps <= 20 ? "low" : totalReps <= 45 ? "moderate" : "high";
}

/** Séries semanais por região. */
export function weeklyRegionVolume(sets: number): VolumeLevel {
  return sets < 6 ? "low" : sets <= 12 ? "moderate" : "high";
}

/** Peso do objetivo na conta de carga: mobilidade/flexibilidade não contam; estabilização vale 0,5. */
export function loadWeightOf(category?: string | null): number {
  const c = (category || "").toLowerCase();
  if (/mobil|stretch|flexib|along/.test(c)) return 0;
  if (/stabil|estabil|propriocep/.test(c)) return 0.5;
  return 1;
}

/** Esforço alvo (sRPE) na faixa 5–9: leve ≤6, moderada ≤7,5, intensa ≤9. */
export const RPE_BY_INTENSITY: Record<Intensity, number> = { light: 5.5, moderate: 7, high: 8.5 };

/** Nível do microciclo a partir do esforço alvo. */
export function loadLevelFromTargetRpe(rpe: number): "low" | "moderate" | "high" {
  return rpe <= 6 ? "low" : rpe <= 7.5 ? "moderate" : "high";
}

const REST_S: Record<Intensity, number> = { high: 120, moderate: 60, light: 45 };

export function parseItem(it: HepLoadItem): ParsedItem {
  const setsN = parseSets(it.sets);
  const { reps, hold } = parseReps(it.reps);
  const perWeek = parseFrequency(it.frequency);
  const kg = it.loadType === "kg" && it.loadKg ? Number(it.loadKg) : 0;
  const totalReps = reps != null ? Math.round(setsN * reps) : 0;
  const tut = hold != null ? Math.round(setsN * hold) : 0;
  const intensity = intensityOf(reps, hold);
  const work = reps != null ? setsN * reps * 3 : tut;
  const rest = intensity ? Math.max(0, setsN - 1) * REST_S[intensity] : 0;
  const loadWeight = loadWeightOf(it.category);
  const effectiveSets = setsN * loadWeight;
  return {
    ...it,
    setsN,
    repsN: reps,
    holdS: hold,
    perWeek,
    totalReps,
    volumeLoad: Math.round(totalReps * kg),
    tut,
    tutLoad: Math.round(tut * kg),
    intensity,
    volume: volumeOf(totalReps, setsN, hold != null),
    weeklySets: effectiveSets * perWeek,
    durationMin: (work + rest) / 60,
    loadWeight,
    effectiveSets,
  };
}

export interface HepLoadSummary {
  items: ParsedItem[];
  byRegion: Array<{ region: string; totalReps: number; volumeLoad: number; tut: number; weeklySets: number; volume: VolumeLevel }>;
  totalReps: number;
  volumeLoad: number;
  tut: number;
  weeklySets: number;
  predominant: Intensity | null;
  hasHigh: boolean;
  sessionsPerWeek: number;
  durationMin: number;
  targetRpe: number | null;
}

export function summarizeHep(items: HepLoadItem[]): HepLoadSummary {
  const parsed = items.map(parseItem).filter((p) => p.setsN > 0);
  const map = new Map<string, HepLoadSummary["byRegion"][number]>();
  const setsByInt: Record<Intensity, number> = { light: 0, moderate: 0, high: 0 };
  for (const p of parsed) {
    const r = map.get(p.region) || { region: p.region, totalReps: 0, volumeLoad: 0, tut: 0, weeklySets: 0, volume: "low" as VolumeLevel };
    r.totalReps += p.totalReps;
    r.volumeLoad += p.volumeLoad;
    r.tut += p.tut;
    r.weeklySets += p.weeklySets;
    map.set(p.region, r);
    if (p.intensity) setsByInt[p.intensity] += p.effectiveSets;
  }
  const byRegion = [...map.values()]
    .filter((r) => r.weeklySets > 0)
    .map((r) => ({ ...r, volume: weeklyRegionVolume(r.weeklySets) }))
    .sort((a, b) => b.weeklySets - a.weeklySets);
  const totalSets = setsByInt.light + setsByInt.moderate + setsByInt.high;
  let predominant: Intensity | null = null;
  let targetRpe: number | null = null;
  if (totalSets > 0) {
    predominant = (["high", "moderate", "light"] as Intensity[]).reduce((a, b) => (setsByInt[b] > setsByInt[a] ? b : a));
    const w = (setsByInt.light * RPE_BY_INTENSITY.light + setsByInt.moderate * RPE_BY_INTENSITY.moderate + setsByInt.high * RPE_BY_INTENSITY.high) / totalSets;
    targetRpe = Math.min(9, Math.max(5, Math.round(w * 2) / 2));
  }
  const sessionsPerWeek = parsed.length ? Math.max(...parsed.map((p) => p.perWeek)) : 0;
  const durationMin = parsed.length ? Math.max(5, Math.round(parsed.reduce((s, p) => s + p.durationMin, 0) + 5)) : 0;
  return {
    items: parsed,
    byRegion,
    totalReps: parsed.reduce((s, p) => s + p.totalReps, 0),
    volumeLoad: parsed.reduce((s, p) => s + p.volumeLoad, 0),
    tut: parsed.reduce((s, p) => s + p.tut, 0),
    weeklySets: parsed.reduce((s, p) => s + p.weeklySets, 0),
    predominant,
    hasHigh: setsByInt.high > 0,
    sessionsPerWeek,
    durationMin,
    targetRpe,
  };
}

/** Distribui N sessões nos próximos 7 dias (a partir de hoje). */
export function spreadSessionDates(n: number, from = new Date()): string[] {
  const k = Math.max(0, Math.min(7, n));
  const out: string[] = [];
  for (let i = 0; i < k; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + Math.floor((i * 7) / k));
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

/** Aviso de coerência com a fase marcada do macrociclo (só sugestão). */
export function phaseWarning(phaseName: string | null | undefined, s: HepLoadSummary): string | null {
  if (!phaseName || !s.predominant) return null;
  const p = phaseName.toLowerCase();
  if (/cicatriza/.test(p) && s.hasHigh) return `Há estímulo de intensidade alta na fase "${phaseName}". Confira se é intencional.`;
  if (/(pot[eê]ncia|retorno)/.test(p) && s.predominant === "light" && !s.hasHigh)
    return `Programa só com estímulo leve na fase "${phaseName}". Pode estar abaixo do exigido.`;
  return null;
}

export function weeklyJump(prevSets: number, nextSets: number): number | null {
  if (!prevSets || !nextSets) return null;
  const pct = ((nextSets - prevSets) / prevSets) * 100;
  return pct > 10 ? Math.round(pct) : null;
}
