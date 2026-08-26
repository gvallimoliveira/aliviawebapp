import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { StudioPersona } from "../personas";

/**
 * KIT GRÁFICO DO STUDIO
 *
 * Três ferramentas visuais compartilhadas pelos blocos, todas dentro da
 * identidade (tokens semânticos, alfa baixo, cantos da marca):
 *
 * 1. TEXTURES — tramas geométricas de fundo: quadriculado, pontos, hachura
 *    diagonal, colunas editoriais, anéis concêntricos, xadrez, plus e chevron.
 *    A persona rotaciona a lista (`textureShift`), então o mesmo bloco cai em
 *    tramas diferentes conforme o "autor" da versão.
 * 2. GeoOrnament — formas geométricas grandes em contorno (anel, quadrado
 *    rotacionado, cluster de plus, anéis duplos, barras) que quebram a
 *    monotonia de fundo liso sem competir com a tipografia.
 * 3. renderAccent — destaca a palavra mais forte de uma frase com estilo
 *    contrastante (chip teal, chip tinta, chip areia, sublinhado grosso,
 *    contorno vazado), usando apenas cores Aliv.iA ou neutras.
 */

const ink = (dark: boolean, alpha: number) =>
  dark ? `hsl(var(--background) / ${alpha})` : `hsl(var(--foreground) / ${alpha})`;

const plusSvg = (dark: boolean) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26'%3E%3Cpath d='M13 7v12M7 13h12' stroke='${
    dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)"
  }' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`;

export type StudioTexture = {
  id: string;
  opacity: number;
  style: (dark: boolean) => CSSProperties;
};

export const TEXTURES: StudioTexture[] = [
  {
    id: "mesh",
    opacity: 0.7,
    style: (d) => ({
      backgroundImage: `linear-gradient(to right, ${ink(d, 0.05)} 1px, transparent 1px), linear-gradient(to bottom, ${ink(d, 0.05)} 1px, transparent 1px)`,
      backgroundSize: "38px 38px",
    }),
  },
  {
    id: "dots",
    opacity: 0.7,
    style: (d) => ({
      backgroundImage: `radial-gradient(${ink(d, 0.07)} 1px, transparent 1px)`,
      backgroundSize: "22px 22px",
    }),
  },
  {
    id: "diagonal",
    opacity: 0.8,
    style: (d) => ({
      backgroundImage: `repeating-linear-gradient(-45deg, ${ink(d, 0.055)} 0 1px, transparent 1px 16px)`,
    }),
  },
  {
    id: "columns",
    opacity: 0.8,
    style: (d) => ({
      backgroundImage: `linear-gradient(to right, ${ink(d, 0.05)} 1px, transparent 1px)`,
      backgroundSize: "56px 100%",
    }),
  },
  {
    id: "rings",
    opacity: 0.85,
    style: (d) => ({
      backgroundImage: `repeating-radial-gradient(circle at 85% 12%, ${ink(d, 0.07)} 0 1px, transparent 1px 26px)`,
    }),
  },
  {
    id: "checker",
    opacity: 0.55,
    style: (d) => ({
      backgroundImage: `conic-gradient(${ink(d, 0.045)} 25%, transparent 0 50%, ${ink(d, 0.045)} 0 75%, transparent 0)`,
      backgroundSize: "44px 44px",
    }),
  },
  {
    id: "plus",
    opacity: 1,
    style: (d) => ({ backgroundImage: plusSvg(d) }),
  },
  {
    id: "chevron",
    opacity: 0.7,
    style: (d) => ({
      backgroundImage: `linear-gradient(135deg, ${ink(d, 0.05)} 25%, transparent 25%), linear-gradient(225deg, ${ink(d, 0.05)} 25%, transparent 25%)`,
      backgroundSize: "28px 28px",
    }),
  },
];

export const TEXTURE_COUNT = TEXTURES.length;

/** Trama da vez: o índice do bloco é deslocado pela mão da persona. */
export const textureFor = (persona: StudioPersona, index: number): StudioTexture =>
  TEXTURES[(index + persona.textureShift) % TEXTURES.length];

type TextureLayerProps = {
  persona: StudioPersona;
  index: number;
  /** Versões escuras (kinetic, closing statement) usam tinta clara. */
  dark?: boolean;
};

/** Camada de fundo pronta: absoluta, inerte e sutil. */
export const TextureLayer = ({ persona, index, dark = false }: TextureLayerProps) => {
  const texture = textureFor(persona, index);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ ...texture.style(dark), opacity: dark ? texture.opacity * 0.8 : texture.opacity }}
    />
  );
};

/** Formas geométricas grandes em contorno — sempre parcialmente fora do quadro. */
export const GeoOrnament = ({ index, dark = false }: { index: number; dark?: boolean }) => {
  const ringTone = dark ? "border-background/20" : "border-primary/20";
  const neutralTone = dark ? "border-background/15" : "border-foreground/10";
  const plusTone = dark ? "text-background/25" : "text-primary/30";

  switch (index % 5) {
    case 0:
      return (
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-2 md:h-96 md:w-96 ${ringTone}`}
        />
      );
    case 1:
      return (
        <div
          aria-hidden
          className={`pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rotate-12 rounded-3xl border-2 ${neutralTone}`}
        />
      );
    case 2:
      return (
        <div aria-hidden className={`pointer-events-none absolute right-8 top-10 select-none font-light ${plusTone}`}>
          <span className="absolute right-0 top-0 text-6xl leading-none">+</span>
          <span className="absolute right-16 top-14 text-4xl leading-none">+</span>
          <span className="absolute right-6 top-28 text-7xl leading-none">+</span>
        </div>
      );
    case 3:
      return (
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80">
          <div className={`absolute inset-0 rounded-full border-2 ${ringTone}`} />
          <div className={`absolute inset-10 rounded-full border-2 ${neutralTone}`} />
        </div>
      );
    default:
      return (
        <div aria-hidden className="pointer-events-none absolute left-8 top-10 flex items-end gap-2">
          {[28, 44, 20, 56, 34].map((h, i) => (
            <span
              key={i}
              className={`w-1 rounded-full ${dark ? "bg-background/20" : "bg-primary/20"}`}
              style={{ height: h }}
            />
          ))}
        </div>
      );
  }
};

/**
 * Estilos de destaque contrastante — todos dentro da paleta Aliv.iA ou neutros.
 * 0 cor teal · 1 chip teal · 2 chip tinta · 3 chip areia ·
 * 4 sublinhado grosso · 5 contorno vazado.
 */
export const ACCENT_STYLES = [
  "text-primary",
  "rounded-lg bg-primary px-[0.28em] py-[0.02em] text-primary-foreground box-decoration-clone",
  "rounded-lg bg-foreground px-[0.28em] py-[0.02em] text-background box-decoration-clone",
  "rounded-lg bg-accent px-[0.28em] py-[0.02em] text-accent-foreground box-decoration-clone",
  "underline decoration-primary decoration-[0.14em] underline-offset-[0.25em]",
  "text-transparent [-webkit-text-stroke:0.035em_hsl(var(--foreground))]",
] as const;

/** Variantes seguras sobre fundo escuro (chip tinta sumiria no bg-foreground). */
export const DARK_ACCENT_INDEXES = [0, 1, 3, 4] as const;

/**
 * Envolve a palavra mais forte da frase (a mais longa) no estilo de destaque
 * escolhido. Pontuação final fica fora do chip/sublinhado.
 */
export const renderAccent = (text: string, variant: number): ReactNode => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return text;

  let target = 0;
  let best = -1;
  words.forEach((word, i) => {
    const len = word.replace(/[^\p{L}\p{N}]/gu, "").length;
    if (len > best) {
      best = len;
      target = i;
    }
  });

  const accentIndex = variant % ACCENT_STYLES.length;
  const accentClass = ACCENT_STYLES[accentIndex];
  // O contorno vazado (índice 5) é repintado manualmente no export de imagem
  // porque o Safari não rasteriza -webkit-text-stroke via foreignObject.
  const isStroke = accentIndex === 5;

  return words.map((word, i) => {
    if (i !== target) {
      return (
        <Fragment key={`${word}-${i}`}>
          {i > 0 ? " " : ""}
          {word}
        </Fragment>
      );
    }
    const core = word.replace(/[.,…!?;:]+$/, "");
    const tail = word.slice(core.length);
    return (
      <Fragment key={`${word}-${i}`}>
        {i > 0 ? " " : ""}
        <span className={accentClass} data-studio-stroke={isStroke ? "1" : undefined}>
          {core}
        </span>
        {tail}
      </Fragment>
    );
  });
};
