import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { TextureLayer } from "./Texture";
import type { StudioMetric } from "../content/types";

/** O título da seção também varia — nunca a mesma arte de números duas vezes. */
const HEADINGS = [
  "Números que sustentam o discurso",
  "Prova em números",
  "O resultado, medido",
];

const Metric = ({ metric, stacked }: { metric: StudioMetric; stacked: boolean }) => {
  const { count, ref } = useCountUp(metric.value, 1600);

  return (
    <div
      ref={ref}
      className={`flex flex-col gap-2 ${
        stacked ? "border-b border-border pb-6 last:border-0 last:pb-0" : "rounded-2xl border border-border bg-card p-6"
      }`}
    >
      <span className="text-4xl font-bold tracking-tight text-primary md:text-6xl">
        {metric.prefix}
        {count}
        {metric.suffix}
      </span>
      <span className="text-sm leading-snug text-muted-foreground md:text-base">{metric.label}</span>
    </div>
  );
};

/** Número gigante sem card — tratamento "linha de força" e coluna do spotlight. */
const GiantMetric = ({ metric }: { metric: StudioMetric }) => {
  const { count, ref } = useCountUp(metric.value, 1600);

  return (
    <div ref={ref} className="flex flex-col gap-2">
      <span className="text-5xl font-bold tracking-tight text-primary md:text-7xl">
        {metric.prefix}
        {count}
        {metric.suffix}
      </span>
      <span className="text-sm leading-snug text-muted-foreground md:text-base">{metric.label}</span>
    </div>
  );
};

/** Métrica protagonista do tratamento spotlight. */
const SpotMetric = ({ metric }: { metric: StudioMetric }) => {
  const { count, ref } = useCountUp(metric.value, 1800);

  return (
    <div ref={ref} className="flex flex-col gap-3">
      <span className="text-6xl font-bold tracking-tight text-primary md:text-8xl">
        {metric.prefix}
        {count}
        {metric.suffix}
      </span>
      <span className="max-w-xs text-base leading-snug text-muted-foreground md:text-lg">{metric.label}</span>
    </div>
  );
};

/**
 * Numbers with count-up.
 * Treatments: 0 cards grid, 1 stacked editorial list, 2 linha de força
 * (números gigantes em fileira, sem cards), 3 spotlight (um protagonista + apoio).
 */
const MetricsBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  const metrics = rng.pick(content.metrics);
  const heading = rng.pick(HEADINGS);
  const stacked = treatment === 1;
  const giantRow = treatment === 2;
  const spotlight = treatment === 3 && metrics.length > 1;

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment + 1)}`}>
      {(treatment === 2 || treatment === 3) && <TextureLayer persona={persona} index={treatment + 1} />}
      <div className="container relative py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.32em] text-primary md:text-xs">
            {rng.pick(content.kickers)}
          </p>
          <h2 className="mb-10 max-w-xl text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
            {heading}
          </h2>

          {spotlight ? (
            <div className="grid items-end gap-10 md:grid-cols-[1.35fr_1fr]">
              <SpotMetric metric={metrics[0]} />
              <div className="flex flex-col gap-6 border-l border-border pl-6 md:pl-10">
                {metrics.slice(1).map((metric) => (
                  <Metric key={metric.label} metric={metric} stacked />
                ))}
              </div>
            </div>
          ) : giantRow ? (
            <div className="grid gap-10 border-t border-border pt-10 sm:grid-cols-3">
              {metrics.map((metric) => (
                <GiantMetric key={metric.label} metric={metric} />
              ))}
            </div>
          ) : (
            <div className={stacked ? "flex flex-col gap-6" : "grid gap-4 sm:grid-cols-3"}>
              {metrics.map((metric) => (
                <Metric key={metric.label} metric={metric} stacked={stacked} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default MetricsBlock;
