/**
 * Bloco F1 — evolução longitudinal do mecanismo de dor.
 *
 * Funções 100% puras: recebem avaliações já carregadas e devolvem a linha do
 * tempo do mecanismo (predominante, subtipo, sensibilização central, extensão
 * em % de superfície) + a leitura da mudança entre dois pontos.
 *
 * Nunca lança: avaliações sem triagem simplesmente não entram na linha do tempo.
 */
import {
  getMechanismLabel,
  getSubtypeLabel,
  parseStoredMechanism,
  type PainMechanism,
  type StoredPainMechanism,
} from "./painMechanism";

type Lang = "pt" | "en" | "es";

export interface MechanismSnapshot {
  assessmentId: string | null;
  date: string;
  mechanism: StoredPainMechanism;
  /** % de superfície corporal com dor (quando registrado). */
  extent: number | null;
  regionCount: number;
}

export interface MechanismChange {
  /** Mudou o mecanismo predominante? */
  mechanismChanged: boolean;
  /** Mudou o subtipo confirmado? */
  subtypeChanged: boolean;
  /** Sensibilização central: apareceu (+1), resolveu (-1) ou estável (0). */
  centralShift: -1 | 0 | 1;
  /** Variação de extensão em pontos percentuais (null quando falta dado). */
  extentDelta: number | null;
  /** Variação do CSI (null quando falta dado). */
  csiDelta: number | null;
  direction: "improving" | "worsening" | "stable";
  lines: string[];
}

/** Peso clínico crescente: quanto maior, mais central/difícil o quadro. */
const SEVERITY: Record<PainMechanism, number> = {
  nociceptive: 1,
  neuropathic: 2,
  mixed: 3,
  nociplastic: 4,
  unknown: 0,
};

const T = {
  mechanismTo: {
    pt: (a: string, b: string) => `Mecanismo predominante mudou de ${a} para ${b}`,
    en: (a: string, b: string) => `Predominant mechanism changed from ${a} to ${b}`,
    es: (a: string, b: string) => `Mecanismo predominante cambió de ${a} a ${b}`,
  },
  mechanismStable: {
    pt: (a: string) => `Mecanismo predominante mantido: ${a}`,
    en: (a: string) => `Predominant mechanism unchanged: ${a}`,
    es: (a: string) => `Mecanismo predominante mantenido: ${a}`,
  },
  subtypeTo: {
    pt: (a: string, b: string) => `Subtipo: ${a} → ${b}`,
    en: (a: string, b: string) => `Subtype: ${a} → ${b}`,
    es: (a: string, b: string) => `Subtipo: ${a} → ${b}`,
  },
  centralOn: {
    pt: "Sinais de sensibilização central passaram a estar presentes",
    en: "Signs of central sensitization are now present",
    es: "Signos de sensibilización central pasaron a estar presentes",
  },
  centralOff: {
    pt: "Sinais de sensibilização central não estão mais presentes",
    en: "Signs of central sensitization are no longer present",
    es: "Signos de sensibilización central ya no están presentes",
  },
  extentDown: {
    pt: (d: string) => `Extensão da dor reduziu ${d} pontos percentuais da superfície corporal`,
    en: (d: string) => `Pain extent decreased ${d} percentage points of body surface`,
    es: (d: string) => `Extensión del dolor redujo ${d} puntos porcentuales de superficie corporal`,
  },
  extentUp: {
    pt: (d: string) => `Extensão da dor aumentou ${d} pontos percentuais da superfície corporal`,
    en: (d: string) => `Pain extent increased ${d} percentage points of body surface`,
    es: (d: string) => `Extensión del dolor aumentó ${d} puntos porcentuales de superficie corporal`,
  },
  csi: {
    pt: (a: number, b: number) => `CSI: ${a} → ${b}`,
    en: (a: number, b: number) => `CSI: ${a} → ${b}`,
    es: (a: number, b: number) => `CSI: ${a} → ${b}`,
  },
  noChange: {
    pt: "Sem mudança relevante no mecanismo de dor entre as triagens",
    en: "No relevant change in pain mechanism between screenings",
    es: "Sin cambio relevante en el mecanismo de dolor entre los triajes",
  },
};

const pick = <A extends unknown[]>(
  entry: Record<Lang, (...a: A) => string> | Record<Lang, string>,
  lang: Lang,
) => (entry as Record<Lang, unknown>)[lang] ?? (entry as Record<Lang, unknown>).pt;

export interface AssessmentLikeForMechanism {
  id?: string | null;
  created_at?: string | null;
  pain_mechanism?: unknown;
  pain_extent?: number | string | null;
  pain_regions?: string[] | null;
  diagnosis?: { pain_mechanism?: unknown } | null;
}

/** Linha do tempo (ordem crescente) das avaliações que TÊM triagem registrada. */
export function buildMechanismTimeline(
  assessments: AssessmentLikeForMechanism[] | null | undefined,
): MechanismSnapshot[] {
  if (!Array.isArray(assessments)) return [];
  const out: MechanismSnapshot[] = [];
  for (const a of assessments) {
    const stored =
      parseStoredMechanism(a?.diagnosis?.pain_mechanism) ??
      parseStoredMechanism(a?.pain_mechanism);
    if (!stored || stored.mechanism === "unknown") continue;
    const rawExtent = a?.pain_extent;
    const extent =
      rawExtent == null || rawExtent === ""
        ? null
        : Number.isFinite(Number(rawExtent))
          ? Number(rawExtent)
          : null;
    out.push({
      assessmentId: a?.id ?? null,
      date: a?.created_at || "",
      mechanism: stored,
      extent,
      regionCount: Array.isArray(a?.pain_regions) ? a.pain_regions.length : 0,
    });
  }
  return out.sort(
    (x, y) => new Date(x.date || 0).getTime() - new Date(y.date || 0).getTime(),
  );
}

const fmt = (n: number) => (Math.abs(n) >= 10 ? n.toFixed(0) : n.toFixed(1));

/** Compara duas triagens (anterior → atual) e devolve leitura clínica localizada. */
export function compareMechanismSnapshots(
  prev: MechanismSnapshot,
  curr: MechanismSnapshot,
  lang: Lang = "pt",
): MechanismChange {
  const lines: string[] = [];
  const mechanismChanged = prev.mechanism.mechanism !== curr.mechanism.mechanism;
  const subtypeChanged =
    (prev.mechanism.subtype ?? null) !== (curr.mechanism.subtype ?? null);

  if (mechanismChanged) {
    lines.push(
      (pick(T.mechanismTo, lang) as (a: string, b: string) => string)(
        getMechanismLabel(prev.mechanism.mechanism, lang),
        getMechanismLabel(curr.mechanism.mechanism, lang),
      ),
    );
  } else {
    lines.push(
      (pick(T.mechanismStable, lang) as (a: string) => string)(
        getMechanismLabel(curr.mechanism.mechanism, lang),
      ),
    );
  }

  if (subtypeChanged && (prev.mechanism.subtype || curr.mechanism.subtype)) {
    lines.push(
      (pick(T.subtypeTo, lang) as (a: string, b: string) => string)(
        prev.mechanism.subtype ? getSubtypeLabel(prev.mechanism.subtype, lang) : "—",
        curr.mechanism.subtype ? getSubtypeLabel(curr.mechanism.subtype, lang) : "—",
      ),
    );
  }

  let centralShift: -1 | 0 | 1 = 0;
  if (
    !prev.mechanism.central_sensitization_likely &&
    curr.mechanism.central_sensitization_likely
  ) {
    centralShift = 1;
    lines.push(pick(T.centralOn, lang) as string);
  } else if (
    prev.mechanism.central_sensitization_likely &&
    !curr.mechanism.central_sensitization_likely
  ) {
    centralShift = -1;
    lines.push(pick(T.centralOff, lang) as string);
  }

  let extentDelta: number | null = null;
  if (prev.extent != null && curr.extent != null) {
    extentDelta = Number((curr.extent - prev.extent).toFixed(1));
    if (Math.abs(extentDelta) >= 0.5) {
      lines.push(
        extentDelta < 0
          ? (pick(T.extentDown, lang) as (d: string) => string)(fmt(Math.abs(extentDelta)))
          : (pick(T.extentUp, lang) as (d: string) => string)(fmt(extentDelta)),
      );
    }
  }

  let csiDelta: number | null = null;
  const prevCsi = prev.mechanism.csi_score;
  const currCsi = curr.mechanism.csi_score;
  if (typeof prevCsi === "number" && typeof currCsi === "number") {
    csiDelta = currCsi - prevCsi;
    if (csiDelta !== 0) {
      lines.push(
        (pick(T.csi, lang) as (a: number, b: number) => string)(prevCsi, currCsi),
      );
    }
  }

  const severityDelta =
    SEVERITY[curr.mechanism.mechanism] - SEVERITY[prev.mechanism.mechanism];
  const score =
    severityDelta * 2 +
    centralShift * 2 +
    (extentDelta != null && Math.abs(extentDelta) >= 0.5 ? Math.sign(extentDelta) : 0) +
    (csiDelta != null && Math.abs(csiDelta) >= 5 ? Math.sign(csiDelta) : 0);

  const direction: MechanismChange["direction"] =
    score < 0 ? "improving" : score > 0 ? "worsening" : "stable";

  if (lines.length === 1 && !mechanismChanged) {
    lines.push(pick(T.noChange, lang) as string);
  }

  return {
    mechanismChanged,
    subtypeChanged,
    centralShift,
    extentDelta,
    csiDelta,
    direction,
    lines,
  };
}

/**
 * Texto compacto da trajetória — usado no payload da IA (relatório de evolução)
 * e no PDF. Uma linha por triagem + a leitura da mudança total.
 */
export function mechanismTrajectoryLines(
  timeline: MechanismSnapshot[],
  lang: Lang = "pt",
): string[] {
  if (timeline.length === 0) return [];
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const lines = timeline.map((s) => {
    const parts = [getMechanismLabel(s.mechanism.mechanism, lang)];
    if (s.mechanism.subtype) parts.push(getSubtypeLabel(s.mechanism.subtype, lang));
    if (s.mechanism.central_sensitization_likely)
      parts.push(lang === "en" ? "central sensitization" : "sensibilização central");
    if (s.extent != null) parts.push(`${fmt(s.extent)}% ${lang === "en" ? "surface" : "superfície"}`);
    if (typeof s.mechanism.csi_score === "number")
      parts.push(`CSI ${s.mechanism.csi_score}`);
    const date = s.date
      ? new Date(s.date).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })
      : "—";
    return `${date}: ${parts.join(" · ")}`;
  });
  if (timeline.length >= 2) {
    const change = compareMechanismSnapshots(
      timeline[0],
      timeline[timeline.length - 1],
      lang,
    );
    lines.push(...change.lines);
  }
  return lines;
}

/** Bloco de texto pronto para prompts de IA (vazio quando não há triagem). */
export function mechanismTrajectoryBlock(
  assessments: AssessmentLikeForMechanism[] | null | undefined,
  lang: Lang = "pt",
): string {
  const lines = mechanismTrajectoryLines(buildMechanismTimeline(assessments), lang);
  return lines.length > 0 ? lines.join("\n") : "";
}
