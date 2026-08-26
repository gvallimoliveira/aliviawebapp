import { motion } from "framer-motion";
import { imageForTopic } from "../topics";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";

/**
 * Journey block — ONE screen, no scroll hijack (precisa caber no frame de captura).
 * Treatments: 0 imagem à direita, 1 imagem à esquerda, 2 tipográfico puro,
 * 3 linha do tempo vertical (trilha conectada, sem imagem).
 *
 * REGRA TAXATIVA DE COERÊNCIA: a imagem vem do tópico do PRIMEIRO passo que
 * possui screenshot exato. Nada de screenshot genérico ilustrando a jornada.
 */
const JourneyBlock = ({ content, rng, treatment, format, picker, persona }: BlockProps) => {
  const [journey] = picker.pick(content.journeys, 1, rng, (j) => j.steps.map((s) => s.topic));
  const steps = journey.steps.slice(0, 4);
  const shotStep = steps.find((s) => imageForTopic(s.topic));
  const shot = imageForTopic(shotStep?.topic);
  const reversed = treatment === 1;
  const withImage = Boolean(shot) && treatment < 2;
  const timeline = treatment === 3;

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center ${personaSurface(persona, treatment + 1)}`}>
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

          {timeline ? (
            <ol className="relative ml-3 flex flex-col gap-7 border-l border-primary/25 pl-8 md:ml-5">
              {steps.map((step, i) => (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  <span className="absolute -left-[45px] top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-4 ring-background">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-semibold leading-tight text-foreground md:text-xl">{step.title}</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                    {step.description}
                  </p>
                </motion.li>
              ))}
            </ol>
          ) : (
            <div className={withImage ? "grid items-center gap-8 md:grid-cols-2" : ""}>
              {withImage && shot && (
                <div className={reversed ? "md:order-2" : ""}>
                  <img
                    src={shot}
                    alt={shotStep?.title ?? journey.heading}
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
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default JourneyBlock;
