import { motion } from "framer-motion";
import { BRAND_HANDLE, BRAND_SITE } from "../brand";
import { blockPadding, personaSurface, sectionHeight, type BlockProps } from "./shared";
import { displayWord, displayWordContainer, displayWordStyle } from "../typographyGuards";

/**
 * CARTAZ DE LETRAS EMPILHADAS (referência estilística: papel texturizado,
 * tarjas de cor nos cantos, palavra repetida em contorno e chapa sólida)
 *
 * Peça de anúncio: a palavra-chave sobe em contorno duas vezes e "aterrissa"
 * sólida, com a complementação em chapa de cor. O rodapé leva o dado prático
 * (perfil / site da marca) em caixa alta espaçada, como no template.
 *
 * Tratamentos: 0 papel claro / tarjas de destaque, 1 papel escuro,
 * 2 chapa da cor primária, 3 papel claro com tarjas invertidas.
 */

const StackTypeBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  if (!content.headlines?.length || !content.kickers?.length) return null;
  const headline = rng.pick(content.headlines);
  const display = content.kinetic?.length ? rng.pick(content.kinetic) : undefined;
  /**
   * REGRA DURA: a palavra-cartaz aparece INTEIRA. Palavra longa não é quebrada
   * ao meio (ver `typographyGuards`) — o corpo da letra cai e, se nem assim
   * couber, o motor escolhe outra palavra da frase.
   */
  const word = display?.word.toUpperCase() || displayWord(headline.strong, 12);
  if (word.length < 3) return null;
  const wordStyle = displayWordStyle(word, { widthPct: 98, maxRem: 5.6 });

  const tail = display?.caption || [headline.strong, headline.rest].filter(Boolean).join(' ');
  const detail = rng.pick([BRAND_HANDLE, BRAND_SITE]);
  const kicker = rng.pick(content.kickers);

  const dark = treatment === 1;
  const primary = treatment === 2;
  const ink = dark || primary ? "hsl(var(--background))" : "hsl(var(--primary))";
  const outline = dark || primary ? "hsl(var(--background) / 0.5)" : "hsl(var(--primary) / 0.55)";
  const tab = dark || primary ? "hsl(var(--background) / 0.85)" : "hsl(var(--destructive))";

  /* Papel texturizado: granulado leve em vez de fundo liso. */
  const paper = {
    backgroundImage:
      "radial-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1px), radial-gradient(hsl(var(--foreground) / 0.04) 1px, transparent 1px)",
    backgroundSize: "7px 7px, 13px 13px",
    backgroundPosition: "0 0, 4px 6px",
  };

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${
        dark || primary ? "" : personaSurface(persona, treatment + 4)
      }`}
      style={
        dark
          ? { backgroundColor: "hsl(var(--foreground))" }
          : primary
            ? { backgroundColor: "hsl(var(--primary))" }
            : undefined
      }
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={paper} />

      {/* Tarjas de cor nos cantos, na direção do template. */}
      <div
        aria-hidden
        className={`absolute top-0 h-[5%] w-[40%] ${treatment === 3 ? "right-[8%]" : "left-[22%]"}`}
        style={{ backgroundColor: tab }}
      />
      <div
        aria-hidden
        className={`absolute bottom-0 h-[9%] w-[13%] ${treatment === 3 ? "left-[6%]" : "right-0"}`}
        style={{ backgroundColor: tab }}
      />

      <div className={`container relative flex h-full flex-col justify-center ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start"
          style={{ color: ink, ...displayWordContainer }}
        >
          {[0, 1].map((i) => (
            <span
              key={i}
              aria-hidden
              className="block w-full font-extrabold uppercase leading-[0.86] tracking-tight"
              style={{
                ...wordStyle,
                color: "transparent",
                WebkitTextStrokeWidth: "1.5px",
                WebkitTextStrokeColor: outline,
              }}
            >
              {word}
            </span>
          ))}
          <h2
            className="block w-full font-extrabold uppercase leading-[0.86] tracking-tight"
            style={wordStyle}
          >
            {word}
          </h2>

          {tail && (
            <span
              className="mt-6 max-w-full text-base font-medium leading-relaxed md:text-lg"
              style={{
                color: ink,
              }}
            >
              {tail}
            </span>
          )}

          <p className="mt-8 text-sm font-extrabold uppercase tracking-[0.12em] md:text-lg">{kicker}</p>
          <p className="mt-10 max-w-full break-words text-xs font-semibold opacity-90 md:text-sm">
            {detail}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default StackTypeBlock;
