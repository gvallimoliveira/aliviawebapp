import { motion } from "framer-motion";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { ACCENT_STYLES, TextureLayer, renderAccent } from "./Texture";

/**
 * Stats block — números editoriais com nota de rodapé (o "recibo de verdade").
 * Treatments: 0 linha editorial (fileira separada por bordas),
 * 1 fichário (cards cantoneira com a nota de cada número em evidência).
 * Ambos recebem trama geométrica da persona e o heading ganha palavra-destaque.
 */
const StatsBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  const stats = rng.pick(content.stats);
  const accentVariant = rng.int(ACCENT_STYLES.length);

  if (treatment === 1) {
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <div className="container relative py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="mb-10 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
              {renderAccent(stats.heading, accentVariant)}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.items.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6"
                >
                  <span className="text-5xl font-bold tracking-tight text-primary md:text-6xl">{item.value}</span>
                  <span className="text-base font-semibold leading-snug text-foreground">{item.label}</span>
                  <span className="text-sm italic leading-snug text-muted-foreground">{item.note}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
      <TextureLayer persona={persona} index={treatment + 2} />
      <div className="container relative py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-10 max-w-2xl text-xl font-semibold leading-snug tracking-tight text-muted-foreground md:text-2xl">
            {renderAccent(stats.heading, accentVariant)}
          </p>
          <div className="grid gap-8 border-y border-border py-10 sm:grid-cols-3 sm:gap-0">
            {stats.items.map((item, i) => (
              <div
                key={item.label}
                className={`flex flex-col gap-1.5 sm:px-8 ${i > 0 ? "sm:border-l sm:border-border" : "sm:pl-0"}`}
              >
                <span className="text-5xl font-bold tracking-tight text-primary md:text-6xl">{item.value}</span>
                <span className="text-base font-medium leading-snug text-foreground md:text-lg">{item.label}</span>
                <span className="text-sm leading-snug text-muted-foreground">{item.note}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default StatsBlock;
