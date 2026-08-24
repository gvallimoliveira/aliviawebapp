import { motion } from "framer-motion";
import { MESH_STYLE, sectionHeight, type BlockProps } from "./shared";

/**
 * Typographic manifesto moment — the format that performs best as a still post.
 * Treatments: 0 tinted primary surface, 1 warm accent surface, 2 mesh + framed.
 */
const QuoteBlock = ({ content, rng, treatment, format, picker }: BlockProps) => {
  const [quote] = picker.pick(content.quotes, 1, rng, (q) => [q.topic]);
  const surface = treatment === 0 ? "bg-primary/10" : treatment === 1 ? "bg-accent/50" : "bg-secondary/40";


  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${surface}`}>
      {treatment === 2 && <div aria-hidden className="absolute inset-0 opacity-70" style={MESH_STYLE} />}

      <div className="container relative py-20">
        <motion.blockquote
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className={`mx-auto max-w-3xl text-center ${treatment === 2 ? "rounded-3xl border border-primary/20 bg-background/70 p-8 md:p-14" : ""}`}
        >
          <p className="text-2xl font-semibold italic leading-snug tracking-tight text-primary md:text-4xl">
            {quote.text}
          </p>

          <footer className="mt-8 text-[11px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
            Aliv.iA · {content.label}
          </footer>
        </motion.blockquote>
      </div>
    </section>
  );
};

export default QuoteBlock;
