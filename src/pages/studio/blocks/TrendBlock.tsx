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

const PATH = "M 30 300 L 70 190 L 100 250 L 140 130 L 175 200 L 215 60 L 245 105 L 275 140 L 320 25";

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

        <svg viewBox="0 0 350 330" className="mx-auto my-4 w-full max-w-sm" role="img" aria-label={headline.strong}>
          <defs>
            <marker id="trend-arrow" markerWidth="7" markerHeight="7" refX="3.2" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill={skin.accent} />
            </marker>
          </defs>
          {/* Patamar: onde o nicho estaciona. */}
          <line x1="10" y1="165" x2="340" y2="165" stroke={skin.line} strokeWidth="1.4" opacity="0.6" />
          <motion.path
            d={PATH}
            fill="none"
            stroke={skin.accent}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd="url(#trend-arrow)"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
          />
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
