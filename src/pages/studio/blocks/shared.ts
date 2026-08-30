import type { CSSProperties } from "react";
import type { Rng } from "../rng";
import type { WorldContent } from "../content";
import type { StudioPicker } from "../picker";
import type { StudioPersona } from "../personas";
import type { StudioPhoto } from "../photos";

export type StudioFormat = "9x16" | "4x5" | "1x1" | "free";

export type BlockProps = {
  content: WorldContent;
  rng: Rng;
  /** Visual treatment index for this block instance */
  treatment: number;
  format: StudioFormat;
  /**
   * Seletor com consciência de cobertura. Blocos que escolhem copy de
   * funcionalidade DEVEM usá-lo — sortear direto do array ignora o estudo
   * editorial e desequilibra a divulgação.
   */
  picker: StudioPicker;
  /**
   * Membro da equipe criativa que "assina" esta versão. Os blocos consultam a
   * persona para superfície (`personaSurface`) e gosto tipográfico
   * (`pickHeadline`) — nunca para quebrar a identidade da marca.
   */
  persona: StudioPersona;
  /**
   * Posição dentro de um carrossel (só existe em blocos `carousel`): qual
   * arte da sequência este bloco renderiza, o total de artes e o grupo
   * (posição onde a sequência foi inserida) que ancora a escolha do conteúdo.
   */
  slide?: { index: number; total: number; group: number };
  /**
   * Acervo privado de fotos da conta. Blocos fotográficos escolhem uma foto
   * daqui de forma determinística; sem acervo, eles não renderizam.
   */
  photos?: StudioPhoto[];
};


/** Surface treatments — all inside the brand palette. */
export const SURFACES = [
  "bg-background",
  "bg-secondary/40",
  "bg-primary/5",
  "bg-accent/40",
  "bg-muted/60",
  "bg-accent/20",
] as const;

export const surfaceFor = (index: number) => SURFACES[index % SURFACES.length];

/**
 * Superfície com a "mão" da persona: cada membro da equipe rotaciona a paleta
 * de fundos de um jeito diferente, então o mesmo bloco/tratamento nunca cai na
 * mesma cor de fundo entre personas.
 */
export const personaSurface = (persona: StudioPersona, index: number) =>
  SURFACES[(index + persona.surfaceShift) % SURFACES.length];

export const ALIGNMENTS = ["center", "left", "asym"] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

export const alignClasses = (align: Alignment) => {
  if (align === "center") return { wrapper: "mx-auto max-w-3xl text-center items-center", text: "text-center" };
  if (align === "left") return { wrapper: "max-w-3xl text-left items-start", text: "text-left" };
  return { wrapper: "ml-0 mr-auto max-w-2xl text-left items-start md:ml-[8%]", text: "text-left" };
};

/** Subtle technical mesh, used sparingly as a background layer. */
export const MESH_STYLE: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, hsl(var(--foreground) / 0.05) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.05) 1px, transparent 1px)",
  backgroundSize: "38px 38px",
};

/** Trama de pontos sutil — segunda textura da equipe, igualmente discreta. */
export const DOTS_STYLE: CSSProperties = {
  backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.06) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
};

/**
 * Gosto tipográfico da persona aplicado à escolha da headline:
 * "curta" sorteia entre as mais enxutas (impacto), "longa" entre as mais
 * desenvolvidas (editorial), "qualquer" é sorteio livre.
 */
export const pickHeadline = <T extends { strong: string; rest: string }>(
  rng: Rng,
  items: readonly T[],
  taste: StudioPersona["headlineTaste"],
): T => {
  if (taste === "qualquer" || items.length < 3) return rng.pick(items);
  const sorted = [...items].sort(
    (a, b) => a.strong.length + a.rest.length - (b.strong.length + b.rest.length),
  );
  const half = Math.ceil(sorted.length / 2);
  const pool = taste === "curta" ? sorted.slice(0, half) : sorted.slice(-half);
  return rng.pick(pool);
};

/** Section height contract: blocks must fill the recording frame. */
export const sectionHeight = (format: StudioFormat) =>
  format === "free" ? "min-h-[80svh]" : "h-full w-full overflow-hidden";

/**
 * PADDING DINÂMICO POR FORMATO
 * 
 * Garante áreas de segurança (Safe Zones) para redes sociais:
 * - 9x16: buffers verticais generosos para evitar UI de Stories (logo topo, barra baixo).
 * - 1x1: margens equilibradas para feed.
 * - free: padding padrão.
 */
export const blockPadding = (format: StudioFormat) => {
  // 9x16 (story): mantém buffer de UI no topo/rodapé, mas sem exagero — o
  // excesso antigo (16%/22%) roubava altura e a copy saía cortada.
  if (format === "9x16") return "pt-[11%] pb-[15%] px-[8%]";
  // 4x5 (post vertical do feed): altura extra sobra, então o respiro vertical
  // é maior que no quadrado, mas sem os buffers de UI do Stories.
  if (format === "4x5") return "py-[12%] px-[8%]";
  // 1x1: quadrado é o formato mais apertado em altura — respiro menor.
  if (format === "1x1") return "py-[7%] px-[7%]";
  return "py-20 px-6";
};


/**
 * TIPO GRANDE SEM ATROPELO
 *
 * Números e palavras-protagonistas vivem em colunas estreitas (grid de 3 em
 * formato 1x1 / 9x16). Tamanho fixo fazia "6 fases" e "Suspeita" vazarem da
 * coluna e sobrepor a vizinha. Aqui o tamanho cai conforme o comprimento do
 * texto e a quebra é sempre permitida.
 */
export const bigTypeClass = (text: string, columns = 3) => {
  const longest = text
    .split(/\s+/)
    .reduce((max, word) => Math.max(max, word.length), 0);
  const budget = columns >= 3 ? 7 : 10;
  const base = "block break-words [overflow-wrap:anywhere] leading-[1.08]";
  if (longest <= budget - 3) return `${base} text-5xl md:text-6xl`;
  if (longest <= budget) return `${base} text-4xl md:text-5xl`;
  if (longest <= budget + 4) return `${base} text-3xl md:text-4xl`;
  return `${base} text-2xl md:text-3xl`;
};
