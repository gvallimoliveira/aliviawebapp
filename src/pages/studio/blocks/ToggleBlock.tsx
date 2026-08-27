import { motion } from "framer-motion";
import { sectionHeight, type BlockProps } from "./shared";

/**
 * INTERRUPTORES (referência: "Motivation" desligado / "Discipline" ligado)
 *
 * Leitura da referência: duas palavras e dois botões dizem tudo — uma escolha
 * de postura. Aqui o par vem do comparativo da marca: o que fica DESLIGADO é a
 * dor/hábito antigo; o que fica LIGADO é o jeito que a marca defende.
 *
 * Tratamentos: 0 branco absoluto · 1 fundo areia · 2 tinta escura · 3 dois
 * pares (quatro interruptores).
 */
const SKINS = [
  { bg: "bg-background", ink: "text-foreground", off: "bg-muted-foreground/45" },
  { bg: "bg-accent/40", ink: "text-foreground", off: "bg-foreground/25" },
  { bg: "bg-foreground", ink: "text-background", off: "bg-background/30" },
  { bg: "bg-background", ink: "text-foreground", off: "bg-muted-foreground/45" },
] as const;

const Switch = ({ on, off }: { on: boolean; off: string }) => (
  <span
    className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full transition-colors ${
      on ? "bg-primary" : off
    }`}
  >
    <span
      className={`absolute h-7 w-7 rounded-full bg-background shadow-md transition-all ${on ? "left-8" : "left-1"}`}
    />
  </span>
);

const ToggleBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const skin = SKINS[treatment % SKINS.length];
  const pairs = treatment % SKINS.length === 3 ? 2 : 1;

  const rows = Array.from({ length: pairs }, (_, i) => {
    const pair = content.compare.length > 0 ? content.compare[(rng.int(content.compare.length) + i) % content.compare.length] : undefined;
    const offLabel = pair && pair.before.length > 0 ? rng.pick(pair.before) : rng.pick(content.sales.objections);
    const onLabel = pair && pair.after.length > 0 ? rng.pick(pair.after) : rng.pick(content.sales.proofs);
    return { offLabel, onLabel };
  });

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden px-8 py-16 ${skin.bg}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md pb-20"
      >
        <p className={`mb-10 text-[10px] font-semibold uppercase tracking-[0.32em] ${skin.ink} opacity-70`}>
          {rng.pick(content.kickers)}
        </p>

        <div className="space-y-10">
          {rows.map((row, i) => (
            <div key={i} className="space-y-7">
              <div className="flex items-center justify-between gap-5">
                <span className={`text-xl font-normal leading-tight opacity-55 md:text-2xl ${skin.ink}`}>
                  {row.offLabel}
                </span>
                <Switch on={false} off={skin.off} />
              </div>
              <div className="flex items-center justify-between gap-5">
                <span className={`text-xl font-semibold leading-tight md:text-2xl ${skin.ink}`}>{row.onLabel}</span>
                <Switch on off={skin.off} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default ToggleBlock;
