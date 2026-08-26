import { motion } from "framer-motion";
import { MESH_STYLE, personaSurface, sectionHeight, type BlockProps } from "./shared";

/**
 * Typo block — tipografia como arte: uma frase enorme com uma palavra em destaque.
 * A variação vem da persona (deslocamento de superfície) e do tratamento
 * (acento em cor primária, contorno vazado ou sublinhado).
 */
const TypoBlock = ({ content, treatment, format, persona }: BlockProps) => {
  const typo = content.typos[treatment % content.typos.length];

  const accentClass =
    treatment % 3 === 1
      ? "text-transparent [-webkit-text-stroke:2px_hsl(var(--primary))]"
      : treatment % 3 === 2
        ? "text-foreground underline decoration-primary decoration-[6px] underline-offset-8"
        : "text-primary";

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
      {treatment % 3 === 1 && <div aria-hidden className="absolute inset-0 opacity-60" style={MESH_STYLE} />}
      <div className="container relative py-20">
        <motion.p
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl text-4xl font-bold leading-[1.02] tracking-tight text-foreground md:text-7xl"
        >
          {typo.lead && <span>{typo.lead} </span>}
          <span className={accentClass}>{typo.big}</span>
          <span>{typo.tail}</span>
        </motion.p>
      </div>
    </section>
  );
};

export default TypoBlock;
