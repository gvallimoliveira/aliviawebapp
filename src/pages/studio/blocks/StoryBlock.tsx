import { motion } from "framer-motion";
import { blockPadding, personaSurface, sectionHeight, type BlockProps } from "./shared";
import { ACCENT_STYLES, GeoOrnament, TextureLayer, renderAccent } from "./Texture";
import { BRAND_NAME } from "../brand";

/**
 * Story block — storytelling de caso anonimizado (prova real, sem nome).
 * Estrutura de capítulo: kicker → título → beats (cena) → virada → moral.
 * Treatments: 0 timeline editorial à esquerda, 1 card central de capítulo,
 * 2 tipografia corrida com virada em chip.
 */
const StoryBlock = ({ content, rng, treatment, format, picker, persona }: BlockProps) => {
  if (!content.stories?.length) return null;
  const [story] = picker.pick(content.stories, 1, rng, (s) => [s.topic]);
  const accentVariant = rng.int(ACCENT_STYLES.length);

  if (treatment === 1) {
    // Card de capítulo: a história emoldurada, com a virada em cor de força.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <GeoOrnament index={treatment + persona.textureShift} />
        <div className={`container relative ${blockPadding(format)}`}>
          <motion.article
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm md:p-12"
          >
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">{story.kicker}</p>
            <h2 className="mb-8 text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
              {story.title}
            </h2>
            <div className="space-y-3">
              {story.beats.map((beat, i) => (
                <p key={i} className="text-base leading-relaxed text-muted-foreground md:text-lg">
                  {beat}
                </p>
              ))}
            </div>
            <p className="mt-8 text-xl font-semibold leading-snug text-primary md:text-2xl">{story.turn}</p>
            <footer className="mt-8 border-t border-border pt-6 text-sm font-medium italic text-foreground">
              {story.moral}
            </footer>
          </motion.article>
        </div>
      </section>
    );
  }

  if (treatment === 2) {
    // Tipografia corrida: a narrativa em texto grande, virada em chip de destaque.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <div className={`container relative ${blockPadding(format)}`}>
          <motion.article
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{story.kicker}</p>
            <h2 className="mb-10 text-3xl font-bold leading-[1.15] tracking-tight text-foreground md:text-5xl">
              {renderAccent(story.title, accentVariant)}
            </h2>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              {story.beats.join(" ")}
            </p>
            <p className="mx-auto mt-10 inline-block rounded-2xl bg-primary px-5 py-2 text-xl font-semibold leading-snug text-primary-foreground box-decoration-clone md:text-2xl">
              {story.turn}
            </p>
            <p className="mt-10 text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
              {story.moral} · {BRAND_NAME}
            </p>
          </motion.article>
        </div>
      </section>
    );
  }

  // Treatment 0 — timeline editorial à esquerda: beats numerados em degraus.
  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
      <TextureLayer persona={persona} index={treatment} />
      <div className={`container relative ${blockPadding(format)}`}>
        <motion.article
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="ml-0 max-w-3xl md:ml-[6%]"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">{story.kicker}</p>
          <h2 className="mb-10 max-w-2xl text-3xl font-bold leading-[1.12] tracking-tight text-foreground md:text-5xl">
            {renderAccent(story.title, accentVariant)}
          </h2>
          <ol className="space-y-0 border-l-2 border-primary/25">
            {story.beats.map((beat, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="relative py-4 pl-8"
              >
                <span className="absolute -left-[9px] top-5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground" />
                <span className="text-base leading-relaxed text-foreground md:text-lg">{beat}</span>
              </motion.li>
            ))}
          </ol>
          <p className="mt-8 max-w-2xl text-xl font-semibold leading-snug text-primary md:text-2xl">{story.turn}</p>
          <footer className="mt-6 flex items-center gap-4">
            <span aria-hidden className="h-px w-14 bg-primary/60" />
            <span className="text-sm font-medium italic text-muted-foreground">{story.moral}</span>
          </footer>
        </motion.article>
      </div>
    </section>
  );
};

export default StoryBlock;
