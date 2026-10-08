// Carga cardiovascular de sessões medidas com monitor cardíaco (cinta, relógio
// ou oxímetro). Função pura e determinística: sem IA, sem rede.
//
// - sRPE (Foster): duração × PSE.
// - TRIMP de Edwards: soma de minutos em cada zona × peso (Z1=1 … Z5=5), com
//   zonas em % da FC máxima (50–60, 60–70, 70–80, 80–90, 90–100).
//   Só é calculado com minutos por zona; sem eles, TRIMP fica vazio.

export type ZoneMinutes = [number, number, number, number, number];

export function srpeLoad(durationMin: number, rpe: number): number {
  if (!(durationMin > 0) || !(rpe >= 0)) return 0;
  return Math.round(durationMin * rpe);
}

/** Zona de Edwards (1–5) para uma FC; 0 se abaixo de 50% da FCmáx. */
export function edwardsZone(hr: number, hrMax: number): number {
  if (!(hr > 0) || !(hrMax > 0)) return 0;
  const pct = hr / hrMax;
  if (pct < 0.5) return 0;
  if (pct >= 0.9) return 5;
  return Math.floor((pct - 0.5) / 0.1) + 1;
}

/** Aceita "12", "12,5" ou "12:30" (mm:ss) e devolve minutos; null se inválido. */
export function parseZoneMinutes(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const mmss = s.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (mmss) return Number(mmss[1]) + Number(mmss[2]) / 60;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Formata minutos como "mm:ss" (segundos arredondados); "" para zero/vazio. */
export function formatZoneMinutes(min: number | null | undefined): string {
  if (!min || !(min > 0)) return "";
  const total = Math.round(min * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function sanitizeZones(z?: Array<number | null | undefined> | null): ZoneMinutes | null {
  if (!z || z.length === 0) return null;
  const out = [0, 1, 2, 3, 4].map((i) => {
    const n = Number(z[i]);
    return Number.isFinite(n) && n > 0 ? Math.min(600, n) : 0;
  }) as ZoneMinutes;
  return out.some((m) => m > 0) ? out : null;
}

export function trimp(opts: {
  zones?: ZoneMinutes | null;
  durationMin?: number | null;
  hrAvg?: number | null;
  hrMax?: number | null; // FC máxima do paciente (estimada ou medida)
}): { value: number | null; method: "zones" | null } {
  if (opts.zones) {
    const v = opts.zones.reduce((s, m, i) => s + m * (i + 1), 0);
    return { value: Math.round(v), method: "zones" };
  }
  // Sem minutos por zona não há TRIMP: estimar pela FC média não é fidedigno.
  return { value: null, method: null };
}

export type MonitorFlag = "hr_above_ceiling" | "spo2_low";

export function monitorFlags(
  s: { hrMax?: number | null; spo2Min?: number | null },
  ceiling: number | null,
  spo2Alert = 92,
): MonitorFlag[] {
  const f: MonitorFlag[] = [];
  if (ceiling && s.hrMax && s.hrMax > ceiling) f.push("hr_above_ceiling");
  if (s.spo2Min && s.spo2Min < spo2Alert) f.push("spo2_low");
  return f;
}
