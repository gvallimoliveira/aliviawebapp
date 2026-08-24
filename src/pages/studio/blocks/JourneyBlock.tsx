import { motion } from "framer-motion";
import { sectionHeight, surfaceFor, type BlockProps } from "./shared";

/**
 * Journey block — ONE screen, no scroll hijack.
 *
 * The old version reused the sticky scrollytelling primitive, which needs a tall
 * spacer (steps * 85vh). Inside the Studio that broke twice: it left a long blank
 * gap while scrolling and the PNG export captured the whole spacer (mostly empty).
 * Studio arts must always fit the recording frame, so the journey renders as a
 * static, fully exportable composition.
 *
 * Coherence rule: only steps that declare their own screenshot show an image.
 */
const JourneyBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const journey = rng.pick(content.journeys);
  const steps = journey.steps.slice(0, 4);
  const shot = steps.find((s) => s.image)?.image;
  const reversed = treatment === 1;
  const withImage = Boolean(shot) && treatment !== 2;

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center ${surfaceFor(treatment + 1)}`}>
      <div className="container py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.28em] text-primary md:text-xs">
            {journey.kicker}
          </p>
          <h2
            className={`mb-8 font-bold leading-tight tracking-tight text-foreground ${
              withImage ? "max-w-2xl text-2xl md:text-4xl" : "max-w-3xl text-3xl md:text-5xl"
            }`}
          >
            {journey.heading}
          </h2>

          <div className={withImage ? "grid items-center gap-8 md:grid-cols-2" : ""}>
            {withImage && (
              <div className={reversed ? "md:order-2" : ""}>
                <img
                  src={shot}
                  alt={journey.heading}
                  loading="lazy"
                  className="w-full rounded-3xl border border-border object-cover shadow-[0_24px_60px_-30px_hsl(var(--foreground)/0.35)]"
                />
              </div>
            )}

            <ol className={`space-y-4 ${withImage && reversed ? "md:order-1" : ""}`}>
              {steps.map((step, i) => (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-4 rounded-2xl border border-border/70 bg-card/70 p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold leading-tight text-foreground md:text-lg">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground md:text-base">
                      {step.description}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default JourneyBlock;
