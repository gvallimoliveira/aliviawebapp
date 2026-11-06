import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { TextureLayer } from "./Texture";
import { BRAND_NAME } from "../brand";
import { finalizeListCoherence } from "../listCoherence";

/**
 * Before / after columns.
 * Treatments: 0 side-by-side cards, 1 stacked bands, 2 duelo "VS" com selo central.
 */
const CompareBlock = ({ content, rng, treatment, format, picker, persona }: BlockProps) => {
  if (!content.compare?.length) return null;
  const [selected] = picker.pick(content.compare, 1, rng, (c) => c.topics ?? []);
  if (!selected) return null;
  const compare = finalizeListCoherence(selected);
  const stacked = treatment === 1;
  const versus = treatment === 2;

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment + 2)}`}>
      {versus && <TextureLayer persona={persona} index={treatment + 4} />}
      <div className="container relative py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            className={`mb-8 font-bold leading-tight tracking-tight text-foreground ${
              versus ? "mx-auto max-w-2xl text-center text-2xl md:text-4xl" : "max-w-2xl text-2xl md:text-4xl"
            }`}
          >
            {compare.title}
          </h2>

          <div className={stacked ? "flex flex-col gap-4" : "relative grid gap-4 md:grid-cols-2"}>
            <div className="rounded-2xl border border-border bg-muted/60 p-6">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">{compare.labels?.[0] || "Antes"}</p>
              <ul className="flex flex-col gap-3">
                {compare.before.map((item, i) => (
                  <li key={`${item}-${i}`} className="flex items-start gap-2.5 text-sm text-muted-foreground md:text-base">
                    {!compare.factual && <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                    <span className={compare.factual ? "" : "line-through decoration-muted-foreground/40"}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-primary">{compare.labels?.[1] || `Com ${BRAND_NAME}`}</p>
              <ul className="flex flex-col gap-3">
                {compare.after.map((item, i) => (
                  <li key={`${item}-${i}`} className="flex items-start gap-2.5 text-sm font-medium text-foreground md:text-base">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {versus && !compare.factual && (
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/30 bg-background text-[11px] font-bold tracking-[0.2em] text-primary shadow-md md:flex"
              >
                VS
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CompareBlock;
