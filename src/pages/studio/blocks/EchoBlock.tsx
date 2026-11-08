import { motion } from "framer-motion";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { TextureLayer } from "./Texture";
import { displayWordContainer, displayWordStyle } from "../typographyGuards";

/**
 * Echo block — a palavra-chave do ecossistema repetida em coluna: todas as
 * instâncias em contorno fino e discreto, UMA preenchida em destaque no meio
 * (inspiração: cartaz "RELOAD"). A palavra vem do acervo cinético via picker,
 * então a cobertura editorial continua valendo (o tópico é registrado).
 *
 * Treatments: 0 coluna central clara · 1 coluna central escura ·
 * 2 coluna à esquerda com legenda editorial à direita.
 *
 * Export: os contornos usam -webkit-text-stroke, que o Safari não rasteriza —
 * cada linha leva `data-studio-stroke` e é repintada no canvas pelo
 * exportImage.ts (mesmo contrato do TypoBlock).
 */
const REPETITIONS = 7;

const EchoBlock = ({ content, rng, treatment, format, persona, picker }: BlockProps) => {
  const [item] = picker.pick(content.kinetic, 1, rng, (k) => [k.topic]);
  /* Palavra inteira, sempre: corpo da letra calculado pelo comprimento. */
  const word = item.word.toUpperCase();
  const dark = treatment === 1;
  const filledAt = Math.floor(REPETITIONS / 2);

  const outlineClass = dark
    ? "text-transparent [-webkit-text-stroke:1.5px_hsl(var(--background)/0.4)]"
    : "text-transparent [-webkit-text-stroke:1.5px_hsl(var(--foreground)/0.4)]";
  const filledClass = dark ? "text-background" : "text-primary";

  const wordStyle = displayWordStyle(word, { widthPct: 96, maxRem: 6 });

  const stack = (align: "center" | "left") => (
    <div
      aria-label={word}
      className={`flex select-none flex-col ${align === "center" ? "items-center text-center" : "items-start text-left"}`}
      style={displayWordContainer}
    >
      {Array.from({ length: REPETITIONS }, (_, i) => {
        const filled = i === filledAt;
        return (
          <span
            key={i}
            aria-hidden={!filled}
            data-studio-stroke={filled ? undefined : "1"}
            className={`font-bold leading-[1.02] tracking-tight ${filled ? filledClass : outlineClass}`}
            style={wordStyle}
          >
            {word}
          </span>
        );
      })}
    </div>
  );

  if (treatment === 2) {
    // Editorial: coluna à esquerda, kicker e legenda respirando à direita.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <div className="container relative py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]"
          >
            <div className="-ml-2 md:-ml-6">{stack("left")}</div>
            <div className="max-w-xs">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">{item.kicker}</p>
              <p className="text-base font-medium leading-relaxed text-muted-foreground md:text-lg">{item.caption}</p>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${
        dark ? "bg-foreground text-background" : personaSurface(persona, treatment)
      }`}
    >
      <TextureLayer persona={persona} index={treatment} dark={dark} />
      <div className="container relative py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center"
        >
          <p
            className={`mb-8 text-[11px] font-semibold uppercase tracking-[0.32em] ${
              dark ? "text-background/60" : "text-muted-foreground"
            }`}
          >
            {item.kicker}
          </p>
          {stack("center")}
          <p
            className={`mt-8 max-w-md text-center text-sm font-medium leading-relaxed md:text-base ${
              dark ? "text-background/70" : "text-muted-foreground"
            }`}
          >
            {item.caption}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default EchoBlock;
