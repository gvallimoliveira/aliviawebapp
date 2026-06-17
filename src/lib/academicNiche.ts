// Best-effort niche detection from a free-text topic for XP/badges scoping.
// Keep the niches list in sync with the academic_tracks seed.
const NICHE_KEYWORDS: Record<string, string[]> = {
  ombro: ["ombro", "shoulder", "manguito", "rotator", "subacromial", "supra-espinhal"],
  lombar: ["lombar", "lombalgia", "lumbar", "low back", "discal", "hérnia", "ciática", "ciatalgia"],
  quadril: ["quadril", "hip", "femoroacetabular", "trocanter", "glúteo", "gluteus", "fai"],
  joelho: ["joelho", "knee", "patelar", "lca", "acl", "menisc", "patelofemoral", "condromal"],
  cervical: ["cervical", "cervicalgia", "neck", "whiplash", "cervicogênica", "cefaleia cervic"],
};

export const ACADEMIC_NICHES = Object.keys(NICHE_KEYWORDS);

export function detectNiche(text?: string | null): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const [niche, kws] of Object.entries(NICHE_KEYWORDS)) {
    if (kws.some((k) => t.includes(k))) return niche;
  }
  return null;
}

export type AcademicLevel = "aprendiz" | "praticante" | "especialista" | "mestre";

export function levelForXp(xp: number): AcademicLevel {
  if (xp >= 701) return "mestre";
  if (xp >= 301) return "especialista";
  if (xp >= 101) return "praticante";
  return "aprendiz";
}

export function levelLabel(niche: string, level: AcademicLevel): string {
  const nicheLabel = niche.charAt(0).toUpperCase() + niche.slice(1);
  const map: Record<AcademicLevel, string> = {
    aprendiz: `Aprendiz do ${nicheLabel}`,
    praticante: `Praticante do ${nicheLabel}`,
    especialista: `Especialista do ${nicheLabel}`,
    mestre: `Mestre do ${nicheLabel}`,
  };
  return map[level];
}

// Insert badge if user crosses a threshold. Idempotent (UNIQUE on user+niche+level).
export async function awardBadgesIfEligible(
  supabase: any,
  userId: string,
  niche: string,
  totalNicheXp: number,
) {
  const lvl = levelForXp(totalNicheXp);
  const order: AcademicLevel[] = ["aprendiz", "praticante", "especialista", "mestre"];
  const toAward = order.slice(0, order.indexOf(lvl) + 1);
  for (const level of toAward) {
    await supabase
      .from("academic_badges")
      .insert({ user_id: userId, niche, level })
      .select()
      .then(() => null)
      .catch(() => null);
  }
}
