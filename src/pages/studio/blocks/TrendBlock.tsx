import { motion } from "framer-motion";
import { sectionHeight, type BlockProps } from "./shared";

/**
 * LINHA DE PROGRESSO (referência: traçado em zigue-zague cruzando a linha
 * horizontal, seta subindo)
 *
 * Leitura da referência: a evolução não é reta — recai, oscila e ainda assim
 * atravessa o patamar. O eixo horizontal é o "antes" (o platô do nicho); a
 * seta é o resultado que a marca entrega.
 *
 * Tratamentos: 0 tinta escura · 1 claro · 2 fundo da marca · 3 escuro com
 * traçado em cor de destaque.
 */
const SKINS = [
  { bg: "bg-foreground", ink: "text-background", line: "hsl(var(--background))", accent: "hsl(var(--background))" },
  { bg: "bg-background", ink: "text-foreground", line: "hsl(var(--foreground))", accent: "hsl(var(--foreground))" },
  { bg: "bg-accent/40", ink: "text-foreground", line: "hsl(var(--foreground))", accent: "hsl(var(--primary))" },
  { bg: "bg-foreground", ink: "text-background", line: "hsl(var(--background)/0.55)", accent: "hsl(var(--primary))" },
] as const;

/**
 * Traçado sem a ponta final: a seta é desenhada como triângulo explícito,
 * alinhado ao último segmento. Marcador SVG escalava com a espessura do traço
 * (ficava gigante) e desaparecia junto com a animação na exportação.
 */
const PATH = "M 24 296 L 68 196 L 100 250 L 142 132 L 176 200 L 216 70 L 246 112 L 274 146 L 306 46";
/** Ponta da seta: mesma direção do último segmento (274,146 → 306,46). */
const ARROW = "M 322 20 L 312 62 L 288 40 Z";

const TrendBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const skin = SKINS[treatment % SKINS.length];
  const headline = rng.pick(content.headlines);
  const sub = rng.pick(content.subs);

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden px-8 py-16 ${skin.bg}`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 w-full max-w-lg pb-20"
      >
        <p className={`mb-8 text-[10px] font-semibold uppercase tracking-[0.32em] ${skin.ink} opacity-70`}>
          {rng.pick(content.kickers)}
        </p>

        <svg viewBox="0 0 340 320" className="mx-auto my-2 w-full max-w-sm" role="img" aria-label={headline.strong}>
          {/* Patamar: onde o nicho estaciona. */}
          <line x1="8" y1="172" x2="332" y2="172" stroke={skin.line} strokeWidth="1.4" opacity="0.55" />
          {/*
            O traçado nasce completo (pathLength = 1): a animação só entra a
            partir daí. Assim a arte nunca sai vazia — nem no card do Studio,
            nem no PNG exportado, onde a animação está congelada.
          */}
          <motion.path
            d={PATH}
            fill="none"
            stroke={skin.accent}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 1, opacity: 1 }}
            animate={{ pathLength: 1, opacity: 1 }}
          />
          <path d={ARROW} fill={skin.accent} />
        </svg>

        <h2 className={`mt-6 text-2xl font-bold leading-[1.1] md:text-4xl ${skin.ink}`}>
          {headline.strong} <span className="font-light opacity-75">{headline.rest}</span>
        </h2>
        <p className={`mt-3 text-sm leading-relaxed opacity-75 ${skin.ink}`}>{sub}</p>
      </motion.div>
    </section>
  );
};

export default TrendBlock;
