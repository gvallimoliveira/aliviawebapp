import { motion } from "framer-motion";
import stepDiagnosis from "@/assets/step-diagnosis.jpg";
import { sectionHeight, surfaceFor, type BlockProps } from "./shared";

/**
 * Feature spotlight with a real product screenshot.
 * Treatments: 0 split (image right), 1 split reversed, 2 stacked bento pair.
 */
const FeatureBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const items = rng.pickMany(content.features, treatment === 2 ? 2 : 1);
  const reversed = treatment === 1;

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center ${surfaceFor(treatment + 3)}`}>
      <div className="container py-16">
        <div className={treatment === 2 ? "grid gap-6 md:grid-cols-2" : "grid items-center gap-8 md:grid-cols-2"}>
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={treatment === 2 ? "rounded-3xl border border-border bg-card p-6" : "contents"}
            >
              {treatment === 2 ? (
                <>
                  <img
                    src={item.image ?? stepDiagnosis}
                    alt={item.title}
                    loading="lazy"
                    className="mb-5 aspect-[4/3] w-full rounded-2xl border border-border object-cover"
                  />
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.28em] text-primary">{item.tag}</p>
                  <h3 className="mb-2 text-xl font-bold leading-tight tracking-tight text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </>
              ) : (
                <>
                  <div className={reversed ? "md:order-2" : ""}>
                    <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-primary md:text-xs">
                      {item.tag}
                    </p>
                    <h2 className="mb-4 text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
                      {item.title}
                    </h2>
                    <p className="text-base leading-relaxed text-muted-foreground md:text-lg">{item.description}</p>
                  </div>
                  <div className={reversed ? "md:order-1" : ""}>
                    <img
                      src={item.image ?? stepDiagnosis}
                      alt={item.title}
                      loading="lazy"
                      className="w-full rounded-3xl border border-border object-cover shadow-[0_24px_60px_-30px_hsl(var(--foreground)/0.35)]"
                    />
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureBlock;
