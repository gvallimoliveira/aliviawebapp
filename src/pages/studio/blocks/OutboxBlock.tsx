import { motion } from "framer-motion";
import { sectionHeight, type BlockProps } from "./shared";

/**
 * FORA DA CAIXA (referência: "THINK / OUTSIDE / THE / BOX" alinhado à direita
 * com um quadrado aberto de traço fino ao lado)
 *
 * Leitura da referência: silêncio absoluto, uma frase e um único traço. A
 * "caixa" tem um lado aberto e as últimas palavras encostam nele — a frase
 * literalmente sai. Copy vem dos typos/headlines da marca.
 *
 * Tratamentos: 0 tinta escura · 1 claro · 2 fundo da marca · 3 escuro com
 * traço em cor de destaque.
 */
const SKINS = [
  { bg: "bg-foreground", ink: "text-background", stroke: "hsl(var(--background))" },
  { bg: "bg-background", ink: "text-foreground", stroke: "hsl(var(--foreground))" },
  { bg: "bg-accent/40", ink: "text-foreground", stroke: "hsl(var(--foreground))" },
  { bg: "bg-foreground", ink: "text-background", stroke: "hsl(var(--primary))" },
] as const;

const OutboxBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const skin = SKINS[treatment % SKINS.length];

  const typo = content.typos.length > 0 ? rng.pick(content.typos) : undefined;
  const phrase = typo
    ? `${typo.lead} ${typo.big} ${typo.tail}`
    : (() => {
        const h = rng.pick(content.headlines);
        return `${h.strong} ${h.rest}`;
      })();

  /** Máximo de 5 linhas curtas: a arte vive do silêncio ao redor. */
  const words = phrase.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  words.forEach((word) => {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length <= 11 && lines.length >= 1) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  });
  const shown = lines.slice(0, 5);

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center justify-center overflow-hidden px-8 py-16 ${skin.bg}`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-md items-center justify-center gap-0 pb-20"
      >
        <div className="flex flex-col items-end pr-3">
          {shown.map((line, i) => (
            <span
              key={`${line}-${i}`}
              className={`block text-[13px] font-light uppercase leading-[2.1] tracking-[0.24em] md:text-base ${skin.ink}`}
            >
              {line}
            </span>
          ))}
        </div>

        {/* A caixa aberta: só três lados, o traço encosta na tipografia. */}
        <svg
          viewBox="0 0 120 160"
          className="h-[calc(1.9em*5)] w-24 shrink-0 md:w-28"
          style={{ height: `${shown.length * 2.1}em` }}
          aria-hidden
        >
          <motion.path
            d="M 0 3 L 117 3 L 117 157 L 0 157"
            fill="none"
            stroke={skin.stroke}
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.3, ease: "easeInOut" }}
          />
        </svg>
      </motion.div>
    </section>
  );
};

export default OutboxBlock;
