import { motion } from "framer-motion";
import { sectionHeight, type BlockProps } from "./shared";
import { BRAND_MARK } from "../brand";

/**
 * ONDE FOCAR (referência: pedras em perspectiva, "Don't focus here" no topo e
 * "Focus here" na pedra verde mais próxima)
 *
 * Leitura da referência: ansiedade é olhar o caminho inteiro; progresso é
 * pisar a próxima pedra. O rótulo de cima é a distração/dor do nicho; o de
 * baixo é o próximo passo concreto que a marca entrega.
 *
 * Tratamentos: 0 tinta escura · 1 claro · 2 fundo areia · 3 escuro com pedras
 * maiores.
 */
const SKINS = [
  { bg: "bg-foreground", ink: "text-background", stone: "hsl(var(--background)/0.35)" },
  { bg: "bg-background", ink: "text-foreground", stone: "hsl(var(--foreground)/0.18)" },
  { bg: "bg-accent/40", ink: "text-foreground", stone: "hsl(var(--foreground)/0.16)" },
  { bg: "bg-foreground", ink: "text-background", stone: "hsl(var(--background)/0.28)" },
] as const;

/** Pedras em perspectiva: crescem e alargam conforme se aproximam da base. */
const STONES = [
  { cx: 176, cy: 40, rx: 12, ry: 5 },
  { cx: 150, cy: 52, rx: 8, ry: 3.5 },
  { cx: 200, cy: 62, rx: 18, ry: 8 },
  { cx: 168, cy: 84, rx: 26, ry: 11 },
  { cx: 146, cy: 108, rx: 12, ry: 5 },
  { cx: 198, cy: 116, rx: 24, ry: 10 },
  { cx: 138, cy: 142, rx: 36, ry: 15 },
  { cx: 212, cy: 158, rx: 34, ry: 14 },
  { cx: 148, cy: 190, rx: 46, ry: 19 },
  { cx: 214, cy: 214, rx: 54, ry: 22 },
];

const FocusBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const skin = SKINS[treatment % SKINS.length];
  const pair = content.compare.length > 0 ? rng.pick(content.compare) : undefined;
  const away =
    pair && pair.before.length > 0 ? rng.pick(pair.before) : rng.pick(content.sales.objections);
  const here = pair && pair.after.length > 0 ? rng.pick(pair.after) : rng.pick(content.sales.proofs);

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden px-8 py-16 ${skin.bg}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md pb-20 text-center"
      >
        <p className={`text-sm font-medium leading-snug opacity-70 md:text-base ${skin.ink}`}>{away}</p>
        <p className={`mt-1 text-lg leading-none opacity-70 ${skin.ink}`}>↓</p>

        <svg viewBox="0 0 350 260" className="mx-auto w-full max-w-xs" role="img" aria-label={here}>
          {STONES.map((s, i) => (
            <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={skin.stone} />
          ))}
          {/* A próxima pedra: a única em cor de marca. */}
          <motion.ellipse
            cx={128}
            cy={244}
            rx={62}
            ry={25}
            fill="hsl(var(--primary))"
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            style={{ transformOrigin: "128px 244px" }}
          />
          {BRAND_MARK && (
            <image
              href={BRAND_MARK}
              x={84}
              y={200}
              width={88}
              height={88}
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            />
          )}
        </svg>

        <p className={`mt-1 text-lg leading-none opacity-70 ${skin.ink}`}>↑</p>
        <p className={`mt-1 text-lg font-bold leading-snug md:text-2xl ${skin.ink}`}>{here}</p>
      </motion.div>
    </section>
  );
};

export default FocusBlock;
