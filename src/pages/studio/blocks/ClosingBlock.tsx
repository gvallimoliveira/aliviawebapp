import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import logoAlivia from "@/assets/logo-alivia.png";
import { sectionHeight, type BlockProps } from "./shared";

/** Brand signature + CTA. Treatment 1 uses the dark statement surface. */
const ClosingBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const closing = rng.pick(content.closings);
  const dark = treatment === 1;

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${
        dark ? "bg-foreground text-background" : "bg-background"
      }`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[70vw] w-[70vw] max-h-[560px] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] ${
          dark ? "bg-primary/30" : "bg-primary/10"
        }`}
      />

      <div className="container relative py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex max-w-2xl flex-col items-center gap-6"
        >
          <img src={logoAlivia} alt="Aliv.iA" className="h-16 w-16 md:h-20 md:w-20" />
          <h2 className={`text-3xl font-bold leading-tight tracking-tight md:text-5xl ${dark ? "" : "text-foreground"}`}>
            {closing.title}
          </h2>
          <p className={`text-base md:text-lg ${dark ? "text-background/70" : "text-muted-foreground"}`}>
            {closing.sub}
          </p>

          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground md:text-base">
            {closing.cta}
            <ArrowRight className="h-4 w-4" />
          </div>

          <p className={`mt-6 text-[11px] uppercase tracking-[0.32em] ${dark ? "text-background/50" : "text-muted-foreground"}`}>
            aliviawebapp.com.br
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ClosingBlock;
