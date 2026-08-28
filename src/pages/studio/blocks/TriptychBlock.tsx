import { motion } from "framer-motion";
import { imageForTopic } from "../topics";
import { bigTypeClass, blockPadding, personaSurface, sectionHeight, type BlockProps } from "./shared";
import { ACCENT_STYLES, TextureLayer, renderAccent } from "./Texture";

/**
 * Triptych block — três palavras que resumem a promessa do mundo.
 * Treatments: 0 fileira de palavras gigantes com filete divisório,
 * 1 cartões com imagem (usa apenas painéis cujo tópico tem screenshot exato).
 */
const TriptychBlock = ({ content, rng, treatment, format, picker, persona }: BlockProps) => {
  const [triptych] = picker.pick(content.triptychs, 1, rng, (t) => t.panels.map((p) => p.topic));
  const accentVariant = rng.int(ACCENT_STYLES.length);
  const withImages = treatment === 1 && triptych.panels.every((p) => imageForTopic(p.topic));

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment + 2)}`}>
      <TextureLayer persona={persona} index={treatment + 3} />
      <div className={`relative w-full ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="mx-auto mb-10 max-w-2xl text-center text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl">
            {renderAccent(triptych.heading, accentVariant)}
          </h2>

          {withImages ? (
            <div className="grid gap-5 sm:grid-cols-3">
              {triptych.panels.map((panel, i) => (
                <motion.figure
                  key={panel.word}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card"
                >
                  <img
                    src={imageForTopic(panel.topic)}
                    alt={panel.word}
                    loading="lazy"
                    className="aspect-[4/3] w-full border-b border-border object-cover"
                  />
                  <figcaption className="flex flex-col gap-1.5 p-5">
                    <span className="text-2xl font-bold tracking-tight text-primary">{panel.word}.</span>
                    <span className="text-sm leading-snug text-muted-foreground">{panel.line}</span>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
              {triptych.panels.map((panel, i) => (
                <motion.div
                  key={panel.word}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex min-w-0 flex-col items-center gap-2 text-center sm:px-5 ${i === 0 ? "sm:pl-0" : ""}`}
                >
                  <span className={`font-bold tracking-tight text-primary ${bigTypeClass(panel.word)}`}>
                    {panel.word}.
                  </span>
                  <span className="max-w-[16rem] text-sm leading-snug text-muted-foreground md:text-base">
                    {panel.line}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default TriptychBlock;
