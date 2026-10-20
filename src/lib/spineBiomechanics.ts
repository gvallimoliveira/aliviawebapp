/**
 * Biomecânica vertebral — Estrela de Maigne + teste palpatório das 3 posições
 * (Fryette / Mitchell). Puro e determinístico: sem IA, sem custo.
 *
 * Regras canônicas (validadas pelo fisioterapeuta responsável):
 * - O NOME da disfunção indica a posição de facilitação/fixação; a Estrela
 *   registra as direções de dor/bloqueio.
 * - ERS (Tipo II): fixação em fechamento. Transverso posterior em neutro,
 *   nivela em extensão (indolor), acentua em flexão (dor). Estrela: F,
 *   inclinação e rotação contrárias ao lado. Dor contralateral ao movimento doloroso.
 * - FRS (Tipo II): fixação em abertura (conflito discal antálgico). Nivela em
 *   flexão, acentua em extensão. Estrela: E, inclinação e rotação contrárias.
 *   Dor homolateral ao movimento doloroso.
 * - NSR (Tipo I, coluna neutra, grupo): rotação e inclinação opostas.
 *   Palpação não muda em F/E; F e E livres; dor em inclinação do mesmo lado
 *   da rotação nomeada e rotação contrária (NSR D → dói ID e RE).
 * - Fryette vale prioritariamente para torácica e lombar. Cervical usa só a Estrela.
 */

export type MaigneAxis = "F" | "E" | "ID" | "IE" | "RD" | "RE";
export type MaigneStar = Record<MaigneAxis, number>; // 0..3 traços
export type Side = "right" | "left";
export type PalpBehavior = "levels" | "worsens" | "unchanged";

export interface SpinePalpation {
  neutral?: Side | "none" | null;
  extension?: PalpBehavior | null;
  flexion?: PalpBehavior | null;
}

export interface SpineBiomechanicsData {
  region?: "cervical" | "thoracic" | "lumbar" | null;
  level?: string;
  star: MaigneStar;
  palpation: SpinePalpation;
  notes?: string;
}

export type SpineClass = "ERS" | "FRS" | "NSR";

export interface SpineHypothesis {
  classification: SpineClass | null;
  side: Side | null;
  confidence: "high" | "moderate" | null;
  label: string;
  mechanism: string;
  painBehavior: string;
  starConsistent: boolean | null;
  summary: string;
}

export const MAIGNE_AXES: MaigneAxis[] = ["F", "ID", "RD", "E", "RE", "IE"];

export const emptyStar = (): MaigneStar => ({ F: 0, E: 0, ID: 0, IE: 0, RD: 0, RE: 0 });

export const emptySpineData = (): SpineBiomechanicsData => ({
  region: null, level: "", star: emptyStar(), palpation: {}, notes: "",
});

export const AXIS_LABEL_PT: Record<MaigneAxis, string> = {
  F: "flexão", E: "extensão", ID: "inclinação D", IE: "inclinação E", RD: "rotação D", RE: "rotação E",
};

const sideShort = (s: Side) => (s === "right" ? "D" : "E");
const sideLong = (s: Side) => (s === "right" ? "Direita" : "Esquerda");
const opp = (s: Side): Side => (s === "right" ? "left" : "right");
const incl = (s: Side): MaigneAxis => (s === "right" ? "ID" : "IE");
const rot = (s: Side): MaigneAxis => (s === "right" ? "RD" : "RE");

/** Regiões do mapa de dor → região vertebral. */
export function spineRegionsFrom(regions: string[]): { cervical: boolean; thoracolumbar: boolean } {
  const r = regions || [];
  const cervical = r.some((id) => id.startsWith("cervical") || id === "neck");
  const thoracolumbar = r.some(
    (id) => id === "thoracic" || id === "lower_back" || id.startsWith("thoracic_") || id.startsWith("lumbar_"),
  );
  return { cervical, thoracolumbar };
}

export const fryetteApplies = (region: SpineBiomechanicsData["region"]) =>
  region === "thoracic" || region === "lumbar";

export function hasSpineContent(d?: SpineBiomechanicsData | null): boolean {
  if (!d) return false;
  const s = d.star || emptyStar();
  return (
    Object.values(s).some((v) => v > 0) ||
    !!d.palpation?.neutral || !!d.palpation?.extension || !!d.palpation?.flexion ||
    !!d.notes?.trim() || !!d.level?.trim()
  );
}

function starPattern(star: MaigneStar): string {
  const painful = MAIGNE_AXES.filter((a) => star[a] > 0).map((a) => `${AXIS_LABEL_PT[a]} (${star[a]})`);
  const free = MAIGNE_AXES.filter((a) => star[a] === 0).map((a) => AXIS_LABEL_PT[a]);
  if (!painful.length) return "";
  return `Direções dolorosas/bloqueadas: ${painful.join(", ")}. Livres: ${free.join(", ") || "nenhuma"}.`;
}

const EMPTY: Omit<SpineHypothesis, "summary"> = {
  classification: null, side: null, confidence: null, label: "", mechanism: "", painBehavior: "", starConsistent: null,
};

export function evaluateSpine(d: SpineBiomechanicsData): SpineHypothesis {
  const star = d.star || emptyStar();
  const pattern = starPattern(star);
  const base = (extra: Partial<SpineHypothesis>): SpineHypothesis => {
    const h = { ...EMPTY, ...extra } as SpineHypothesis;
    const parts = [h.label ? `Hipótese biomecânica: ${h.label}.` : "", h.mechanism, pattern, h.painBehavior]
      .filter(Boolean);
    h.summary = parts.join(" ");
    return h;
  };

  if (!fryetteApplies(d.region ?? null)) return base({});
  const p = d.palpation || {};
  const side = p.neutral === "right" || p.neutral === "left" ? p.neutral : null;
  if (!side || !p.extension || !p.flexion) return base({});

  const hasStar = Object.values(star).some((v) => v > 0);
  const o = opp(side);

  let cls: SpineClass | null = null;
  let consistent: boolean | null = null;
  if (p.extension === "levels" && p.flexion === "worsens") {
    cls = "ERS";
    consistent = hasStar ? star.F > 0 && star.E === 0 && star[incl(side)] === 0 && star[rot(side)] === 0 : null;
  } else if (p.flexion === "levels" && p.extension === "worsens") {
    cls = "FRS";
    consistent = hasStar ? star.E > 0 && star.F === 0 && star[incl(side)] === 0 && star[rot(side)] === 0 : null;
  } else if (p.extension === "unchanged" && p.flexion === "unchanged") {
    cls = "NSR";
    consistent = hasStar
      ? star.F === 0 && star.E === 0 && star[incl(side)] > 0 && star[rot(o)] > 0 && star[rot(side)] === 0
      : null;
  }
  if (!cls) return base({});
  // Estrela contradiz a palpação → não força badge.
  if (consistent === false) {
    return base({
      starConsistent: false,
      mechanism:
        "Palpação e Estrela de Maigne divergentes: hipótese Fryette não atribuída; reavaliar o segmento.",
    });
  }

  const s = sideShort(side);
  const so = sideShort(o);
  const map: Record<SpineClass, { name: string; mech: string; pain: string }> = {
    ERS: {
      name: `ERS ${sideLong(side)} (fixação em fechamento)`,
      mech: `Transverso ${s} posterior em neutro, nivela em extensão e acentua em flexão: faceta ${s} não abre. Bloqueio esperado em flexão, inclinação ${so} e rotação ${so}.`,
      pain: "Disfunção em extensão: a dor costuma aparecer no lado contralateral ao movimento doloroso.",
    },
    FRS: {
      name: `FRS ${sideLong(side)} (fixação em abertura)`,
      mech: `Transverso ${s} posterior em neutro, nivela em flexão e acentua em extensão: faceta ${s} não fecha (padrão antálgico, possível conflito discal à ${so}). Bloqueio esperado em extensão, inclinação ${so} e rotação ${so}.`,
      pain: "Disfunção em flexão: a dor costuma aparecer no lado homolateral ao movimento doloroso.",
    },
    NSR: {
      name: `NSR ${sideLong(side)} (padrão neutro em grupo)`,
      mech: `Posterioridade ${s} que não se altera em flexão/extensão (1ª lei de Fryette: inclinação ${so} e rotação ${s}). Flexão e extensão livres; dor esperada em inclinação ${s} e rotação ${so}.`,
      pain: "Padrão adaptativo multissegmentar; correlacionar com postura e curvas.",
    },
  };
  return base({
    classification: cls,
    side,
    confidence: consistent === true ? "high" : "moderate",
    label: map[cls].name,
    mechanism: map[cls].mech,
    painBehavior: map[cls].pain,
    starConsistent: consistent,
  });
}

/** Payload compacto para IA/prontuário; null quando vazio. */
export function spinePayload(d?: SpineBiomechanicsData | null) {
  if (!hasSpineContent(d)) return undefined;
  const h = evaluateSpine(d!);
  return { ...d!, hypothesis: h.classification ? { classification: h.classification, side: h.side, confidence: h.confidence, label: h.label } : null, summary: h.summary };
}
