// Shared helpers to format objective test data (dynamometry / ROM) for AI prompts.

export const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : null;
};

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Asymmetry (%) between two values, relative to the greater one. */
export const asymmetryPct = (a: number | null, b: number | null): number | null => {
  if (a == null || b == null || a <= 0 || b <= 0) return null;
  return Math.round((Math.abs(a - b) / Math.max(a, b)) * 100);
};

export const sideStats = (value: unknown, trials: unknown) => {
  const list = Array.isArray(trials) ? trials : [];
  const nums = list.map((t: any) => num(t?.value ?? t)).filter((n): n is number => n != null && n > 0);
  const times = list.map((t: any) => num(t?.timeToPeak)).filter((n): n is number => n != null && n > 0);
  if (nums.length === 0) {
    const single = num(value);
    const ok = single != null && single > 0;
    return {
      count: ok ? 1 : 0,
      best: ok ? round1(single!) : null,
      mean: ok ? round1(single!) : null,
      cv: null as number | null,
      meanTimeToPeak: null as number | null,
      trials: [] as string[],
    };
  }
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  let cv: number | null = null;
  if (nums.length > 1 && mean > 0) {
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
    cv = Math.round((Math.sqrt(variance) / mean) * 1000) / 10;
  }
  return {
    count: nums.length,
    best: round1(Math.max(...nums)),
    mean: round1(mean),
    cv,
    meanTimeToPeak: times.length > 0 ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100 : null,
    trials: list
      .map((t: any) => {
        const v = num(t?.value ?? t);
        if (v == null) return null;
        const tp = num(t?.timeToPeak);
        return `${round1(v)} kgf${tp != null ? ` @ ${tp}s` : ""}`;
      })
      .filter((s): s is string => !!s),
  };
};

const normTxt = (t: string) =>
  String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const PAIRS = [
  {
    title: "Shoulder — internal vs external rotation",
    region: /(ombro|shoulder|hombro)/,
    aLabel: "internal rotation",
    aRe: /(rotac|rotat).*(intern|medial)|(intern|medial).*(rotac|rotat)/,
    bLabel: "external rotation",
    bRe: /(rotac|rotat).*(extern|lateral)|(extern|lateral).*(rotac|rotat)/,
  },
  { title: "Knee — extension vs flexion", region: /(joelho|knee|rodilla)/, aLabel: "extension", aRe: /(exten)/, bLabel: "flexion", bRe: /(flex)/ },
  { title: "Hip — extension vs flexion", region: /(quadril|hip|cadera)/, aLabel: "extension", aRe: /(exten)/, bLabel: "flexion", bRe: /(flex)/ },
  { title: "Hip — adduction vs abduction", region: /(quadril|hip|cadera)/, aLabel: "adduction", aRe: /(aducao|aducc|adduc|aduc)/, bLabel: "abduction", bRe: /(abduc)/ },
];

/** Intra-side agonist/antagonist balance for the known movement pairs. */
export const agonistAntagonist = (rows: any[]) => {
  const out: Array<{
    title: string; aLabel: string; bLabel: string;
    left: { a: number | null; b: number | null; asym: number | null };
    right: { a: number | null; b: number | null; asym: number | null };
  }> = [];
  for (const pair of PAIRS) {
    const find = (re: RegExp, isAdduction: boolean) =>
      rows.find((r: any) => {
        const m = normTxt(r?.movement);
        if (isAdduction && /abduc/.test(m)) return false;
        return pair.region.test(m) && re.test(m);
      });
    const rowA = find(pair.aRe, pair.aLabel === "adduction");
    const rowB = find(pair.bRe, false);
    if (!rowA || !rowB) continue;
    const side = (which: "left" | "right") => {
      const sa = sideStats(which === "left" ? rowA.leftValue : rowA.rightValue, which === "left" ? rowA.leftTrials : rowA.rightTrials);
      const sb = sideStats(which === "left" ? rowB.leftValue : rowB.rightValue, which === "left" ? rowB.leftTrials : rowB.rightTrials);
      return { a: sa.mean, b: sb.mean, asym: asymmetryPct(sa.mean, sb.mean) };
    };
    out.push({ title: pair.title, aLabel: pair.aLabel, bLabel: pair.bLabel, left: side("left"), right: side("right") });
  }
  return out;
};

/** Text block describing dynamometry rows (or null when nothing usable). */
export const describeStrength = (rows: unknown): string | null => {
  const strength = Array.isArray(rows) ? rows.filter((r: any) => r?.movement || r?.leftValue || r?.rightValue) : [];
  if (strength.length === 0) return null;
  const rowLines = strength.map((r: any) => {
    const L = sideStats(r.leftValue, r.leftTrials);
    const R = sideStats(r.rightValue, r.rightTrials);
    const asym = asymmetryPct(L.mean, R.mean);
    const fmt = (s: ReturnType<typeof sideStats>) =>
      s.mean == null
        ? "—"
        : `mean ${s.mean} kgf, best ${s.best} kgf, ${s.count} trial(s)${s.cv != null ? `, CV ${s.cv}%` : ""}${s.meanTimeToPeak != null ? `, mean time to peak ${s.meanTimeToPeak}s` : ""}${s.trials.length ? ` [trials: ${s.trials.join(", ")}]` : ""}`;
    return `    • ${r.movement || "?"}\n        - Left: ${fmt(L)}\n        - Right: ${fmt(R)}\n        - L/R asymmetry (by mean): ${asym != null ? `${asym}%${asym > 10 ? " → ABOVE 10%, clinically relevant deficit on the weaker side" : " → within 10%, symmetric"}` : "not computable"}`;
  });
  const parts = [
    `DYNAMOMETRY (kgf) — asymmetry ≤10% acceptable, >10% relevant deficit/inhibition (D.I.F.I); CV >15% = poor reproducibility:\n${rowLines.join("\n")}`,
  ];
  const pairs = agonistAntagonist(strength);
  if (pairs.length > 0) {
    parts.push(
      `AGONIST/ANTAGONIST BALANCE (same side, same >10% threshold):\n${pairs
        .map(
          (p) =>
            `    • ${p.title}: LEFT ${p.aLabel} ${p.left.a ?? "—"} kgf vs ${p.bLabel} ${p.left.b ?? "—"} kgf${p.left.asym != null ? ` → ${p.left.asym}%${p.left.asym > 10 ? " (IMBALANCE)" : ""}` : ""} | RIGHT ${p.aLabel} ${p.right.a ?? "—"} kgf vs ${p.bLabel} ${p.right.b ?? "—"} kgf${p.right.asym != null ? ` → ${p.right.asym}%${p.right.asym > 10 ? " (IMBALANCE)" : ""}` : ""}`,
        )
        .join("\n")}`,
    );
  }
  return parts.join("\n");
};

/** Text block describing ROM rows (or null when nothing usable). */
export const describeRom = (rows: unknown): string | null => {
  const rom = Array.isArray(rows) ? rows.filter((r: any) => r?.joint || r?.leftValue || r?.rightValue) : [];
  if (rom.length === 0) return null;
  return `RANGE OF MOTION (ROM) AND MUSCLE FLEXIBILITY (values in degrees or cm as written):\n${rom
    .map((r: any) => {
      const asym = asymmetryPct(num(r.leftValue), num(r.rightValue));
      return `    • ${r.joint || "?"}: L ${r.leftValue || "—"} | R ${r.rightValue || "—"}${asym != null ? ` | L/R difference ${asym}%${asym > 10 ? " (RELEVANT, >10%)" : ""}` : ""}${r.notes ? ` | notes: ${r.notes}` : ""}`;
    })
    .join("\n")}`;
};
