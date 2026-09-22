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
  slide?: { index: number; total: number; group: number; script: number };
  /**
   * Acervo privado de fotos da conta. Blocos fotográficos escolhem uma foto
   * daqui de forma determinística; sem acervo, eles não renderizam.
   */
  photos?: StudioPhoto[];
  /**
   * DIREÇÃO DESTA ARTE (diretor criativo): eixo de comunicação do lote e
   * palavras que a foto precisa sustentar. Opcional — sem diretor o bloco se
   * comporta como antes.
   */
  shot?: { axis: string; axisLabel: string; affinity: string[] };
  /**
   * Identidade desta arte no lote, no formato "<lote>|<arte>". Usada pelos
   * blocos fotográficos para garantir rotatividade do acervo dentro da mesma
   * geração (foto menos usada primeiro; teto de repetições com acervo grande).
   */
  artKey?: string;
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
export const personaSurface = (persona: StudioPersona | undefined, index: number) =>
  SURFACES[(index + (persona?.surfaceShift ?? 0)) % SURFACES.length];

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

/**
 * CONTRATO DE ALTURA DA SEÇÃO
 *
 * Todo formato — inclusive "Livre" — tem proporção real no quadro (ver
 * `studio/frame.ts`), então a seção SEMPRE preenche a moldura. A classe
 * `studio-free-frame` só existe para a landing pública, que usa os mesmos
 * blocos em rolagem contínua e restaura a altura automática por CSS.
 */
export const sectionHeight = (format: StudioFormat) =>
  format === "free"
    ? "studio-free-frame h-full w-full overflow-hidden"
    : "h-full w-full overflow-hidden";

/**
 * ALTURA RELATIVA AO QUADRO
 *
 * Blocos com faixa de foto/cenário mediam altura em pixels fixos ou em `svh`
 * (altura da tela do aparelho). O resultado não acompanhava o quadro: a mesma
 * arte saía achatada num formato e transbordando no outro. Aqui a altura é
 * sempre percentual da moldura, então trocar o formato reorganiza a arte.
 */
export const frameHeight = (
  format: StudioFormat,
  pct: { "9x16": number; "4x5": number; "1x1": number },
): CSSProperties => ({ height: `${pct[format === "free" ? "4x5" : format]}%` });


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
  // Livre: agora tem proporção real, então o respiro também é percentual.
  return "py-[11%] px-[8%]";
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
