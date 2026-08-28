import { motion } from "framer-motion";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { BRAND_NAME, BRAND_SITE } from "../brand";

/**
 * Pin-up block — cartaz de funcionalidade com a arte gerada (personagem/ação).
 * O Aliv.iA aparece como parceiro de palco; a assinatura da marca fica na base.
 * Só entra em composição quando o mundo tem features com `poster`.
 */
const PinupBlock = ({ content, rng, treatment, format, picker, persona }: BlockProps) => {
  const posters = content.features.filter((f) => f.poster);
  if (posters.length === 0) return null;

  const [feature] = picker.pick(posters, 1, rng, (f) => [f.topic]);

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
      <div className="container py-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-7 text-center"
        >
          <p className="rounded-full border border-primary/30 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary md:text-[11px]">
            {feature.tag}
          </p>

          <img
            src={feature.poster}
            alt={feature.headline ?? feature.title}
            loading="lazy"
            className="max-h-[52vh] w-auto max-w-full rounded-3xl border border-border object-contain shadow-[0_30px_70px_-40px_hsl(var(--foreground)/0.45)]"
          />

          <h2 className="max-w-2xl text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
            {feature.headline ?? feature.title}
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {feature.description}
          </p>

          <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            {BRAND_NAME} · {BRAND_SITE}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PinupBlock;
