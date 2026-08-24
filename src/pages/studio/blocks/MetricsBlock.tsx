import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import { sectionHeight, surfaceFor, type BlockProps } from "./shared";
import type { StudioMetric } from "../content/types";

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

/** Numbers with count-up. Treatments: 0 cards grid, 1 stacked editorial list. */
const MetricsBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const metrics = rng.pick(content.metrics);
  const stacked = treatment % 2 === 1;

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center ${surfaceFor(treatment + 1)}`}>
      <div className="container py-16">
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
            Números que sustentam o discurso
          </h2>

          <div className={stacked ? "flex flex-col gap-6" : "grid gap-4 sm:grid-cols-3"}>
            {metrics.map((metric) => (
              <Metric key={metric.label} metric={metric} stacked={stacked} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MetricsBlock;
