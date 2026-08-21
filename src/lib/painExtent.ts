/**
 * Passo A2 do roteiro "Mecanismo de dor + mapa corporal".
 *
 * Código PURO: calcula a extensão da dor (pain extent) a partir dos ids de
 * região já usados em `src/components/assessment/painMapData.ts`.
 * Nenhuma tela consome este arquivo ainda.
 *
 * Pain extent é usado na literatura de digital pain drawing (2020-2024) como
 * desfecho sensível a mudança, complementar à intensidade (EVA).
 */

/** Grupo anatômico canônico — vistas anterior/posterior/lateral colapsam aqui. */
export type BodyPartGroup =
  | "head"
  | "cervical"
  | "thoracic"
  | "lumbar"
  | "chest"
  | "abdomen"
  | "gluteal"
  | "shoulder"
  | "arm"
  | "elbow"
  | "forearm"
  | "hand"
  | "hip"
  | "thigh"
  | "knee"
  | "leg"
  | "ankle"
  | "foot"
  | "other";

/**
 * Peso aproximado de superfície corporal (%) por grupo anatômico,
 * inspirado na regra dos nove usada em avaliação de superfície corporal.
 * Grupos bilaterais valem por lado.
 */
const GROUP_SURFACE_WEIGHT: Record<BodyPartGroup, number> = {
  head: 7,
  cervical: 2,
  thoracic: 9,
  lumbar: 5,
  chest: 9,
  abdomen: 8,
  gluteal: 3,
  shoulder: 2,
  arm: 3,
  elbow: 1,
  forearm: 3,
  hand: 2.5,
  hip: 2,
  thigh: 6,
  knee: 1.5,
  leg: 5,
  ankle: 1,
  foot: 2.5,
  other: 2,
};

/** Ordem importa: padrões mais específicos primeiro. */
const GROUP_PATTERNS: [RegExp, BodyPartGroup][] = [
  [/gluteal/, "gluteal"],
  [/head/, "head"],
  [/cervical|neck/, "cervical"],
  [/thoracic/, "thoracic"],
  [/lower_back|lumbar/, "lumbar"],
  [/chest|pectoral/, "chest"],
  [/abdomen/, "abdomen"],
  [/shoulder/, "shoulder"],
  [/forearm/, "forearm"],
  [/elbow/, "elbow"],
  [/hand|wrist/, "hand"],
  [/arm/, "arm"],
  [/hip/, "hip"],
  [/thigh/, "thigh"],
  [/knee/, "knee"],
  [/shin|calf|leg/, "leg"],
  [/ankle/, "ankle"],
  [/foot|heel|plantar/, "foot"],
];

const SIDE_PATTERNS: [RegExp, "left" | "right"][] = [
  [/(^|_)left(_|$)|_left$|^left_/, "left"],
  [/(^|_)right(_|$)|_right$|^right_/, "right"],
];

export interface RegionDescriptor {
  id: string;
  group: BodyPartGroup;
  side: "left" | "right" | "central";
}

export function describeRegion(id: string): RegionDescriptor {
  const normalized = id.toLowerCase();
  const group =
    GROUP_PATTERNS.find(([re]) => re.test(normalized))?.[1] ?? "other";
  const side =
    SIDE_PATTERNS.find(([re]) => re.test(normalized))?.[1] ?? "central";
  return { id, group, side };
}

export interface PainExtentResult {
  /** Quantidade de ids marcados (bruto). */
  regionCount: number;
  /** Quantidade de segmentos anatômicos distintos (grupo + lado). */
  segmentCount: number;
  /** Percentual estimado de superfície corporal, 0-100, com 1 decimal. */
  surfacePercent: number;
  /** Faixa interpretativa para UI. */
  band: "none" | "localized" | "regional" | "widespread";
  segments: string[];
}

export function computePainExtent(regions: string[] | null | undefined): PainExtentResult {
  const ids = Array.from(new Set((regions ?? []).filter(Boolean)));
  if (ids.length === 0) {
    return {
      regionCount: 0,
      segmentCount: 0,
      surfacePercent: 0,
      band: "none",
      segments: [],
    };
  }

  const segments = new Map<string, BodyPartGroup>();
  for (const id of ids) {
    const { group, side } = describeRegion(id);
    segments.set(`${group}:${side}`, group);
  }

  let raw = 0;
  for (const group of segments.values()) {
    raw += GROUP_SURFACE_WEIGHT[group];
  }
  const surfacePercent = Math.round(Math.min(raw, 100) * 10) / 10;

  const segmentCount = segments.size;
  const band: PainExtentResult["band"] =
    segmentCount >= 5 || surfacePercent >= 25
      ? "widespread"
      : segmentCount >= 3 || surfacePercent >= 12
        ? "regional"
        : "localized";

  return {
    regionCount: ids.length,
    segmentCount,
    surfacePercent,
    band,
    segments: Array.from(segments.keys()).sort(),
  };
}

/**
 * Sugere a distribuição usada pela triagem de mecanismo (A1) a partir do mapa.
 * Não decide o mecanismo — apenas traduz topografia em categoria.
 */
export function suggestDistribution(
  regions: string[] | null | undefined,
): "localized" | "regional" | "multisite" | "unknown" {
  const extent = computePainExtent(regions);
  if (extent.segmentCount === 0) return "unknown";
  if (extent.band === "widespread") return "multisite";
  if (extent.band === "regional") return "regional";
  return "localized";
}

/**
 * Passo C2 — valor pronto para gravar em `assessments.pain_extent`.
 * Retorna null quando não há regiões marcadas (mantém a coluna nula,
 * ou seja, "não avaliado", em vez de gravar 0).
 */
export function painExtentValue(regions: string[] | null | undefined): number | null {
  const extent = computePainExtent(regions);
  return extent.regionCount > 0 ? extent.surfacePercent : null;
}
