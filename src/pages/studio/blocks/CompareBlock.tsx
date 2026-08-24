import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { sectionHeight, surfaceFor, type BlockProps } from "./shared";

/** Before / after columns. Treatments: 0 side-by-side cards, 1 stacked bands. */
const CompareBlock = ({ content, rng, treatment, format, picker }: BlockProps) => {
  const [compare] = picker.pick(content.compare, 1, rng, (c) => c.topics ?? []);
  const stacked = treatment % 2 === 1;


  return (
    <section className={`relative flex ${sectionHeight(format)} items-center ${surfaceFor(treatment + 2)}`}>
      <div className="container py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="mb-8 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
            {compare.title}
          </h2>

          <div className={stacked ? "flex flex-col gap-4" : "grid gap-4 md:grid-cols-2"}>
            <div className="rounded-2xl border border-border bg-muted/60 p-6">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Sem Aliv.iA</p>
              <ul className="flex flex-col gap-3">
                {compare.before.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground md:text-base">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <span className="line-through decoration-muted-foreground/40">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-primary">Com Aliv.iA</p>
              <ul className="flex flex-col gap-3">
                {compare.after.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-foreground md:text-base">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CompareBlock;
