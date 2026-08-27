import { motion } from "framer-motion";
import { BRAND_NAME } from "../brand";
import { pickHeadline, sectionHeight, type BlockProps } from "./shared";

/**
 * PORTA QUE SE ABRE (referência: cartaz com porta em recorte e frase curta)
 *
 * Cartaz gráfico de virada: fundo cheio em cor sólida, uma porta aberta em
 * recorte claro e uma frase de duas alturas ao lado. A frase nunca é genérica —
 * vem das headlines/typos da marca, então a metáfora fica ancorada no produto.
 *
 * Tratamentos: 0/1 fundo tinta · 2 fundo teal · 3 fundo areia.
 */
const SURFACES = [
  { bg: "bg-foreground", ink: "text-background", door: "hsl(var(--background))" },
  { bg: "bg-foreground", ink: "text-background", door: "hsl(var(--background))" },
  { bg: "bg-primary", ink: "text-primary-foreground", door: "hsl(var(--primary-foreground))" },
  { bg: "bg-accent", ink: "text-accent-foreground", door: "hsl(var(--accent-foreground))" },
] as const;

const DoorBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  const skin = SURFACES[treatment % SURFACES.length];
  const headline = pickHeadline(rng, content.headlines, persona.headlineTaste);

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${skin.bg} ${skin.ink}`}
    >
      {/* Porta aberta + rasgo de luz no piso, em recorte geométrico. */}
      <svg
        aria-hidden
        viewBox="0 0 100 160"
        preserveAspectRatio="none"
        className="pointer-events-none absolute right-0 top-0 h-full w-[62%] opacity-95"
      >
        <polygon points="48,18 88,24 88,132 48,142 48,136 82,127 82,29 48,24" fill={skin.door} />
        <polygon points="82,127 100,160 24,160 48,136" fill={skin.door} opacity="0.92" />
        <circle cx="79" cy="82" r="1.4" fill={skin.bg === "bg-foreground" ? "hsl(var(--foreground))" : "currentColor"} />
      </svg>

      <motion.div
        initial={{ opacity: 0, x: -18 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-[62%] px-8 md:px-16"
      >
        <p className="text-2xl font-light leading-[1.15] tracking-tight md:text-4xl">
          {rng.pick(content.kickers).toLowerCase()}
        </p>
        <p className="text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl">{headline.strong}</p>
        <p className="text-2xl font-light leading-[1.15] tracking-tight md:text-4xl">{headline.rest}</p>

        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.34em] opacity-70">{BRAND_NAME}</p>
      </motion.div>
    </section>
  );
};

export default DoorBlock;
