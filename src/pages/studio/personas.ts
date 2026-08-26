import type { BlockKind } from "./composePage";
import type { MotionKind } from "./blocks/StudioMotion";
import { createRng } from "./rng";

/**
 * EQUIPE CRIATIVA DO STUDIO
 *
 * Cada versão da landing é "assinada" por uma persona — um membro fictício da
 * equipe de marketing com gosto próprio. A persona não escreve copy (isso
 * continua vindo do acervo + dívida editorial) nem muda a identidade (tipografia,
 * paleta e cantos são fixos): ela decide COMO compor a página.
 *
 * O que cada persona controla:
 * - `favoriteBlocks`   → tipos de seção que aparecem com mais frequência;
 * - `densityBase/Variance` → páginas longas de revista vs. cortes curtos;
 * - `kinetics`         → 1 ou 2 momentos escuros por página;
 * - `marqueeOpen/Close`→ apetite por faixas de marquee;
 * - `motionDensity/Taste`  → quanto da página anima e com quais efeitos;
 * - `treatmentBias`    → tratamentos visuais preferidos por tipo de bloco
 *                        (índices repetidos = mais peso no sorteio);
 * - `surfaceShift`     → rotaciona a paleta de superfícies (a mesma seção
 *                        nunca cai no mesmo fundo para personas diferentes);
 * - `textureShift`     → rotaciona as tramas geométricas do kit (Texture.tsx):
 *                        quadriculado, hachura, anéis, xadrez, plus etc. caem
 *                        em posições diferentes conforme a "mão" da versão;
 * - `headlineTaste`    → prefere headlines curtas (impacto) ou longas (editorial).
 *
 * A persona é derivada deterministicamente da seed (`personaForSeed`), então o
 * link de uma versão reproduz exatamente a mesma "mão" criativa.
 */
export type HeadlineTaste = "curta" | "longa" | "qualquer";

export type StudioPersona = {
  id: string;
  name: string;
  role: string;
  /** Frase de apresentação exibida no tooltip da barra do Studio. */
  signature: string;
  favoriteBlocks: BlockKind[];
  densityBase: number;
  densityVariance: number;
  kinetics: 1 | 2;
  marqueeOpen: number;
  marqueeClose: number;
  motionDensity: number;
  motionTaste: MotionKind[];
  treatmentBias: Partial<Record<BlockKind, number[]>>;
  surfaceShift: number;
  /** Desloca a rotação das tramas geométricas (ver blocks/Texture.tsx). */
  textureShift: number;
  headlineTaste: HeadlineTaste;
};

export const PERSONAS: StudioPersona[] = [
  {
    id: "marina",
    name: "Marina",
    role: "Direção editorial",
    signature:
      "Páginas longas com respiro de revista: texto à esquerda, hierarquia tipográfica e movimento quase imperceptível.",
    favoriteBlocks: ["quote", "journey", "quote"],
    densityBase: 10,
    densityVariance: 4,
    kinetics: 1,
    marqueeOpen: 0.35,
    marqueeClose: 0.3,
    motionDensity: 0.35,
    motionTaste: ["focusPull", "parallaxScrub", "gradientDrift"],
    treatmentBias: {
      hero: [1, 1, 2, 4],
      quote: [2, 3, 3, 4],
      metrics: [1, 3],
      compare: [1],
      journey: [3, 3, 0, 1],
      feature: [3, 0],
      closing: [3, 3, 0],
    },
    surfaceShift: 1,
    headlineTaste: "longa",
  },
  {
    id: "caio",
    name: "Caio",
    role: "Performance",
    signature:
      "Corte seco e energia de palco: números gigantes, contraste, marquee e ritmo acelerado.",
    favoriteBlocks: ["metrics", "compare", "metrics"],
    densityBase: 7,
    densityVariance: 3,
    kinetics: 2,
    marqueeOpen: 0.9,
    marqueeClose: 0.8,
    motionDensity: 0.75,
    motionTaste: ["zoomIn", "tiltRise", "maskWipe", "zoomOut"],
    treatmentBias: {
      hero: [0, 3, 3],
      quote: [0, 1],
      metrics: [0, 2, 2, 3],
      compare: [0, 2, 2],
      journey: [0, 1],
      feature: [0, 1, 2],
      closing: [1, 0],
    },
    surfaceShift: 2,
    headlineTaste: "curta",
  },
  {
    id: "luma",
    name: "Luma",
    role: "Design minimalista",
    signature:
      "Pouco na tela, tudo intencional: uma ideia por arte, muito ar, quase nenhum movimento.",
    favoriteBlocks: ["quote", "feature"],
    densityBase: 6,
    densityVariance: 3,
    kinetics: 1,
    marqueeOpen: 0.25,
    marqueeClose: 0.15,
    motionDensity: 0.25,
    motionTaste: ["focusPull", "gradientDrift"],
    treatmentBias: {
      hero: [0, 0, 1],
      quote: [4, 4, 0],
      metrics: [2, 1],
      compare: [1],
      journey: [2, 3],
      feature: [3, 0],
      closing: [2, 2, 0],
    },
    surfaceShift: 0,
    headlineTaste: "curta",
  },
  {
    id: "otto",
    name: "Otto",
    role: "Direção estrutural",
    signature:
      "Malha técnica, molduras e assimetria: o desenho do sistema aparece na arte.",
    favoriteBlocks: ["feature", "compare", "feature"],
    densityBase: 9,
    densityVariance: 4,
    kinetics: 2,
    marqueeOpen: 0.6,
    marqueeClose: 0.5,
    motionDensity: 0.6,
    motionTaste: ["maskWipe", "parallaxScrub", "tiltRise"],
    treatmentBias: {
      hero: [2, 2, 4],
      quote: [2, 3],
      metrics: [3, 0],
      compare: [2, 0],
      journey: [3, 0],
      feature: [2, 2, 1],
      closing: [1, 3],
    },
    surfaceShift: 3,
    headlineTaste: "qualquer",
  },
  {
    id: "bia",
    name: "Bia",
    role: "Storytelling",
    signature:
      "Narrativa em capítulos: jornadas, vozes e viradas de cena conduzindo o scroll.",
    favoriteBlocks: ["journey", "journey", "quote"],
    densityBase: 10,
    densityVariance: 3,
    kinetics: 2,
    marqueeOpen: 0.5,
    marqueeClose: 0.4,
    motionDensity: 0.55,
    motionTaste: ["parallaxScrub", "focusPull", "zoomOut"],
    treatmentBias: {
      hero: [1, 4],
      quote: [1, 3, 0],
      metrics: [1, 2],
      compare: [1],
      journey: [0, 1, 3],
      feature: [0, 3],
      closing: [0, 2],
    },
    surfaceShift: 2,
    headlineTaste: "longa",
  },
  {
    id: "enzo",
    name: "Enzo",
    role: "Conversão",
    signature:
      "Prova, comparação e chamada: cada arte empurra o leitor um passo adiante.",
    favoriteBlocks: ["metrics", "compare", "feature"],
    densityBase: 8,
    densityVariance: 3,
    kinetics: 1,
    marqueeOpen: 0.8,
    marqueeClose: 0.7,
    motionDensity: 0.5,
    motionTaste: ["zoomIn", "gradientDrift", "maskWipe"],
    treatmentBias: {
      hero: [3, 0],
      quote: [0, 4],
      metrics: [0, 3, 2],
      compare: [0, 0, 2],
      journey: [0],
      feature: [0, 2],
      closing: [0, 3],
    },
    surfaceShift: 1,
    headlineTaste: "curta",
  },
];

/** Persona determinística por versão: mesmo mundo+seed ⇒ mesma "mão" criativa. */
export const personaForSeed = (key: string): StudioPersona =>
  PERSONAS[createRng(`persona:${key}`).int(PERSONAS.length)];
