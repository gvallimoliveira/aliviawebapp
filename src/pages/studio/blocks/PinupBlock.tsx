import { motion } from "framer-motion";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { BRAND_NAME, BRAND_SITE } from "../brand";

/**
 * Pin-up block — cartaz de funcionalidade com a arte gerada (personagem/ação).
 * O Aliv.iA aparece como parceiro de palco; a assinatura da marca fica na base.
 *
 * Sem poster no acervo da marca o cartaz vira TIPOGRÁFICO (nunca em branco):
 * antes o bloco devolvia `null` e o usuário recebia uma arte vazia.
 *
 * REGRA DURA: nada de "tapa-buraco". A moldura com a INICIAL da funcionalidade
 * (uma letra solta no meio da arte) foi removida — sem imagem, o cartaz é
 * tipográfico de verdade: selo, frase grande e a explicação embaixo.
 */
const PinupBlock = ({ content, rng, treatment, format, picker, persona }: BlockProps) => {
  const posters = content.features.filter((f) => f.poster);
  const pool = posters.length > 0 ? posters : content.features;
  if (pool.length === 0) {
    const headline = rng.pick(content.headlines);
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <div className="container px-8 py-16 text-center">
          <p className="text-4xl font-bold leading-[1.16] text-foreground md:text-6xl">
            {headline.strong}{headline.rest}
          </p>
        </div>
      </section>
    );
  }

  const [feature] = picker.pick(pool, 1, rng, (f) => [f.topic]);


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

          {feature.poster && (
            <img
              src={feature.poster}
              alt={feature.headline ?? feature.title}
              loading="eager"
              className="max-h-[52vh] w-auto max-w-full rounded-3xl border border-border object-contain shadow-[0_30px_70px_-40px_hsl(var(--foreground)/0.45)]"
            />
          )}


          <h2
            className={`max-w-2xl font-bold leading-tight tracking-tight text-foreground ${
              feature.poster ? "text-2xl md:text-4xl" : "text-3xl md:text-5xl"
            }`}
          >
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
