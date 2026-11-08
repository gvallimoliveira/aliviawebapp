import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { sectionHeight, type BlockProps } from "./shared";
import { BRAND_LOGO, BRAND_NAME, BRAND_SLOGAN, brandWordmarkParts } from "../brand";
import { displayWordContainer, displayWordStyle } from "../typographyGuards";

/**
 * Mono block — "Edição Mono": o black & white adaptado do Aliv.iA.
 *
 * Fundo grafite com tipografia branca/cinza-clara, ou o inverso (papel
 * cinza-claro com tinta escurecida). A paleta é cinza neutro puro — a ÚNICA
 * cor da arte é o verde Aliv.iA, reservado à palavra-chave, ao "iA" do
 * wordmark e à logo, que entra sempre colorida.
 *
 * Treatments: 0 declaração no grafite · 1 declaração no papel ·
 * 2 eco mono (palavra repetida em contorno, centro verde) ·
 * 3 lockup institucional (logo colorida + wordmark com moldura).
 *
 * Export: contornos vazados levam `data-studio-stroke` e são repintados no
 * canvas pelo exportImage.ts (mesmo contrato do EchoBlock/TypoBlock).
 */

const REPETITIONS = 7;

const ink = (dark: boolean, alpha: number) =>
  dark ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;

/** Tramas geométricas em cinza neutro (a malha padrão da marca é quente). */
const monoTexture = (dark: boolean, index: number): CSSProperties => {
  switch (index % 3) {
    case 0:
      return {
        backgroundImage: `linear-gradient(to right, ${ink(dark, 0.05)} 1px, transparent 1px), linear-gradient(to bottom, ${ink(dark, 0.05)} 1px, transparent 1px)`,
        backgroundSize: "38px 38px",
      };
    case 1:
      return {
        backgroundImage: `radial-gradient(${ink(dark, 0.07)} 1px, transparent 1px)`,
        backgroundSize: "22px 22px",
      };
    default:
      return {
        backgroundImage: `repeating-linear-gradient(-45deg, ${ink(dark, 0.05)} 0 1px, transparent 1px 16px)`,
      };
  }
};

/** Assinatura discreta: a logo é sempre colorida — ponto de cor ao lado do mono. */
const MonoSignature = ({ dark, className = "" }: { dark: boolean; className?: string }) => {
  const [head, tail] = brandWordmarkParts();
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src={BRAND_LOGO} alt={BRAND_NAME} className="h-8 w-8 object-contain" />
      <span className={`text-sm font-semibold tracking-tight ${dark ? "text-mono-paper" : "text-mono-ink"}`}>
        {head}
        {tail && <span className="text-primary">{tail}</span>}
      </span>
    </div>
  );
};

type MonoProps = BlockProps & { textureIndex: number };

/** 0/1 — Declaração: frase tipografia-herói toda em cinza, palavra-chave em verde. */
const MonoStatement = ({ content, rng, format, textureIndex, dark }: MonoProps & { dark: boolean }) => {
  const typo = content.typos[rng.int(content.typos.length)];
  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${
        dark ? "bg-mono-ink" : "bg-mono-paper"
      }`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={monoTexture(dark, textureIndex)} />
      <div className="container relative py-20">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <div aria-hidden className="mb-10 h-1 w-14 rounded-full bg-primary" />
          <p
            className={`max-w-5xl text-4xl font-bold leading-[1.08] tracking-tight md:text-7xl ${
              dark ? "text-mono-paper" : "text-mono-ink"
            }`}
          >
            {typo.lead && <span>{typo.lead} </span>}
            <span className="text-primary">{typo.big}</span>
            <span>{typo.tail}</span>
          </p>
          <MonoSignature dark={dark} className="mt-14" />
        </motion.div>
      </div>
    </section>
  );
};

/** 2 — Eco mono: palavra do acervo cinético repetida em contorno cinza, centro verde. */
const MonoEcho = ({ content, rng, picker, format, textureIndex }: MonoProps) => {
  const [item] = picker.pick(content.kinetic, 1, rng, (k) => [k.topic]);
  const word = item.word.toUpperCase();
  const filledAt = Math.floor(REPETITIONS / 2);

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden bg-mono-ink`}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={monoTexture(true, textureIndex)} />
      <div className="container relative py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center"
        >
          <p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.32em] text-mono-mid">{item.kicker}</p>
          <div aria-label={word} className="flex select-none flex-col items-center text-center" style={displayWordContainer}>
            {Array.from({ length: REPETITIONS }, (_, i) => {
              const filled = i === filledAt;
              return (
                <span
                  key={i}
                  aria-hidden={!filled}
                  data-studio-stroke={filled ? undefined : "1"}
                  style={displayWordStyle(word, { widthPct: 96, maxRem: 6 })}
                  className={`font-bold leading-[1.02] tracking-tight ${
                    filled
                      ? "text-primary"
                      : "text-transparent [-webkit-text-stroke:1.5px_hsl(var(--mono-paper)/0.3)]"
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </div>
          <p className="mt-8 max-w-md text-center text-sm font-medium leading-relaxed text-mono-paper/70 md:text-base">
            {item.caption}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

/** 3 — Lockup institucional: logo colorida grande + wordmark com "iA" verde. */
const MonoLockup = ({ rng, format, textureIndex }: MonoProps) => {
  const dark = rng.chance(0.6);
  const [head, tail] = brandWordmarkParts();
  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${
        dark ? "bg-mono-ink" : "bg-mono-paper"
      }`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={monoTexture(dark, textureIndex)} />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-5 rounded-[2rem] border ${
          dark ? "border-mono-paper/10" : "border-mono-ink/10"
        }`}
      />
      <div className="container relative flex flex-col items-center py-20 text-center">
        <motion.img
          src={BRAND_LOGO}
          alt={BRAND_NAME}
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="h-24 w-24 object-contain md:h-36 md:w-36"
        />
        <motion.p
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.85, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 text-6xl font-bold tracking-tight md:text-8xl"
        >
          <span className={dark ? "text-mono-paper" : "text-mono-ink"}>{head}</span>
          {tail && <span className="text-primary">{tail}</span>}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.85, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="mt-7 max-w-md text-[13px] font-medium uppercase leading-relaxed tracking-[0.22em] text-mono-mid md:text-sm"
        >
          {BRAND_SLOGAN}
        </motion.p>
      </div>
    </section>
  );
};

const MonoBlock = (props: BlockProps) => {
  const { treatment, persona } = props;
  const textureIndex = treatment + persona.textureShift;
  switch (treatment % 4) {
    case 0:
      return <MonoStatement {...props} textureIndex={textureIndex} dark />;
    case 1:
      return <MonoStatement {...props} textureIndex={textureIndex} dark={false} />;
    case 2:
      return <MonoEcho {...props} textureIndex={textureIndex} />;
    default:
      return <MonoLockup {...props} textureIndex={textureIndex} />;
  }
};

export default MonoBlock;
