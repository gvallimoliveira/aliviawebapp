import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { StudioPersona } from "../personas";
import { BRAND_MARK } from "../brand";
import { brandMarkTile } from "./brandMarkTile";

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

/**
 * PADRÃO DA MARCA — o símbolo da marca repetido no lugar da trama geométrica,
 * na mesma escala e no mesmo tom pastel (mão da Aliv.iA, raio do PerformaPro).
 * Entram na mesma rotação das tramas: duas densidades, uma mais fechada e uma
 * mais espaçada. Sem símbolo/logo, o bloco cai na trama geométrica seguinte.
 */
export const BRAND_MARK_TEXTURES = [
  { id: "brandmark", kind: "tile", opacity: 1, tile: 46, alpha: 0.09 },
  { id: "brandmark-wide", kind: "tile", opacity: 1, tile: 82, alpha: 0.075 },
  /** Faixa diagonal só num canto: o símbolo repetido dentro de uma tarja. */
  { id: "brandmark-band", kind: "band", opacity: 1, tile: 52, alpha: 0.1 },
  /** Símbolo gigante em contorno, marca d'água atrás do texto. */
  { id: "brandmark-ghost", kind: "ghost", opacity: 1, tile: 0, alpha: 0.16 },
  /** Misto: símbolo alternando com a trama geométrica. */
  { id: "brandmark-mixed", kind: "mixed", opacity: 1, tile: 64, alpha: 0.085 },
] as const;

/** Só as tramas geométricas (blocos que consomem o CSS puro da textura). */
export const TEXTURE_COUNT = TEXTURES.length;
export const PATTERN_COUNT = TEXTURES.length + BRAND_MARK_TEXTURES.length;

/** Trama da vez: o índice do bloco é deslocado pela mão da persona. */
export const textureFor = (persona: StudioPersona, index: number): StudioTexture =>
  TEXTURES[(index + persona.textureShift) % TEXTURES.length];

type TextureLayerProps = {
  persona: StudioPersona;
  index: number;
  /** Versões escuras (kinetic, closing statement) usam tinta clara. */
  dark?: boolean;
};

/** Padrão repetido com o símbolo da marca; devolve null enquanto/se não houver. */
const BrandMarkPattern = ({
  tile,
  alpha,
  opacity,
  dark,
}: {
  tile: number;
  alpha: number;
  opacity: number;
  dark: boolean;
}) => {
  const src = BRAND_MARK;
  const color = dark ? `rgba(255,255,255,${alpha + 0.03})` : `rgba(0,0,0,${alpha})`;
  const [pattern, setPattern] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!src) {
      setPattern(null);
      return;
    }
    void brandMarkTile(src, color).then((url) => {
      if (alive) setPattern(url);
    });
    return () => {
      alive = false;
    };
  }, [src, color]);

  if (!pattern) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `url("${pattern}")`,
        backgroundSize: `${tile}px ${tile}px`,
        backgroundRepeat: "repeat",
        opacity,
      }}
    />
  );
};

/** Camada de fundo pronta: absoluta, inerte e sutil. */
export const TextureLayer = ({ persona, index, dark = false }: TextureLayerProps) => {
  const slot = (index + persona.textureShift) % PATTERN_COUNT;
  const mark = slot >= TEXTURES.length ? BRAND_MARK_TEXTURES[slot - TEXTURES.length] : null;

  if (mark && BRAND_MARK) {
    return (
      <>
        <BrandMarkPattern tile={mark.tile} alpha={mark.alpha} opacity={mark.opacity} dark={dark} />
      </>
    );
  }

  const texture = TEXTURES[slot % TEXTURES.length];
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
  "relative inline-block rounded-lg bg-primary px-[0.28em] py-[0.08em] leading-[1.05] text-primary-foreground box-decoration-clone",
  "relative inline-block rounded-lg bg-foreground px-[0.28em] py-[0.08em] leading-[1.05] text-background box-decoration-clone",
  "relative inline-block rounded-lg bg-accent px-[0.28em] py-[0.08em] leading-[1.05] text-accent-foreground box-decoration-clone",
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
