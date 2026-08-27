import { motion } from "framer-motion";
import { BRAND_NAME } from "../brand";
import { sectionHeight, type BlockProps } from "./shared";

/**
 * PLACA DE RUA (referência: poste com duas placas verdes contra o céu)
 *
 * Contrato semântico do bloco:
 * - placa DE CIMA = "local atual", a DOR do nicho (vem do lado `before` do
 *   comparativo, ou de uma objeção de vendas);
 * - placa DE BAIXO (com seta) = o DESEJO que a marca resolve (lado `after` do
 *   comparativo), sempre amarrado ao nome da empresa.
 *
 * Ex.: "Insegurança na avaliação" → "Clareza com o método Aliv.iA".
 *
 * Tratamentos: 0/1 céu claro · 2 céu noturno · 3 fundo areia.
 */
const SKIES = [
  { bg: "bg-[hsl(210_45%_70%)]", plate: "bg-primary", ink: "text-primary-foreground" },
  { bg: "bg-[hsl(205_50%_78%)]", plate: "bg-primary", ink: "text-primary-foreground" },
  { bg: "bg-foreground", plate: "bg-primary", ink: "text-primary-foreground" },
  { bg: "bg-accent", plate: "bg-primary", ink: "text-primary-foreground" },
] as const;

const Bolt = () => <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-background/70" />;

const SignpostBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const skin = SKIES[treatment % SKIES.length];

  const pair = content.compare.length > 0 ? rng.pick(content.compare) : undefined;
  const pain =
    pair && pair.before.length > 0 ? rng.pick(pair.before) : rng.pick(content.sales.objections);
  const desireRaw = pair && pair.after.length > 0 ? rng.pick(pair.after) : rng.pick(content.subs);
  const desire = desireRaw.toLowerCase().includes(BRAND_NAME.toLowerCase())
    ? desireRaw
    : `${desireRaw} com ${BRAND_NAME}`;

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden px-6 ${skin.bg}`}
    >
      {/* Nuvens discretas — só ambiente, nunca competem com o texto. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(closest-side, hsl(var(--background)) 0%, transparent 70%), radial-gradient(closest-side, hsl(var(--background)) 0%, transparent 70%)",
          backgroundSize: "42% 22%, 30% 16%",
          backgroundPosition: "12% 22%, 78% 68%",
          backgroundRepeat: "no-repeat",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-2xl flex-col items-center"
      >
        <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.34em] text-background/80">
          {rng.pick(content.kickers)}
        </p>

        {/* Placa 1 — onde o nicho está hoje (dor). */}
        <div
          className={`relative w-full rounded-xl border-2 border-background/90 px-6 py-6 text-center shadow-[0_20px_40px_-28px_hsl(var(--foreground)/0.8)] ${skin.plate} ${skin.ink}`}
        >
          <Bolt />
          <p className="my-2 text-lg font-semibold leading-tight md:text-2xl">{pain}</p>
          <Bolt />
        </div>

        {/* Poste entre as placas. */}
        <div className="h-6 w-4 bg-[hsl(0_0%_72%)]" />

        {/* Placa 2 — para onde a marca leva (desejo), com a ponta de seta. */}
        <div
          className={`relative w-full border-2 border-background/90 px-6 py-6 text-center shadow-[0_20px_40px_-28px_hsl(var(--foreground)/0.8)] ${skin.plate} ${skin.ink}`}
          style={{ clipPath: "polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%)", borderRadius: 12 }}
        >
          <Bolt />
          <p className="my-2 pr-8 text-lg font-bold leading-tight md:text-2xl">{desire}</p>
          <Bolt />
        </div>

        {/* Poste até a base da arte. */}
        <div className="h-24 w-4 bg-[hsl(0_0%_72%)] md:h-32" />

        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-background/85">
          {BRAND_NAME}
        </p>
      </motion.div>
    </section>
  );
};

export default SignpostBlock;
