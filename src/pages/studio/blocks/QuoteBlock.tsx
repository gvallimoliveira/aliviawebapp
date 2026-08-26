import { motion } from "framer-motion";
import { MESH_STYLE, personaSurface, sectionHeight, type BlockProps } from "./shared";

/**
 * Typographic manifesto moment — the format that performs best as a still post.
 * Treatments: 0 tinted primary surface, 1 warm accent surface, 2 mesh + framed,
 * 3 editorial à esquerda com aspas gigantes, 4 minimalista de filete.
 */
const QuoteBlock = ({ content, rng, treatment, format, picker, persona }: BlockProps) => {
  const [quote] = picker.pick(content.quotes, 1, rng, (q) => [q.topic]);

  if (treatment === 3) {
    // Editorial à esquerda: aspas gigantes como elemento gráfico, sem itálico.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 left-2 select-none text-[16rem] font-bold leading-none text-primary/15 md:left-8 md:text-[22rem]"
        >
          &ldquo;
        </span>
        <div className="container relative py-20">
          <motion.blockquote
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="ml-0 max-w-3xl text-left md:ml-[6%]"
          >
            <p className="text-3xl font-semibold leading-[1.15] tracking-tight text-foreground md:text-5xl">
              {quote.text}
            </p>
            <footer className="mt-10 flex items-center gap-4">
              <span aria-hidden className="h-px w-14 bg-primary/60" />
              <span className="text-[11px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
                Aliv.iA · {content.label}
              </span>
            </footer>
          </motion.blockquote>
        </div>
      </section>
    );
  }

  if (treatment === 4) {
    // Minimalista de filete: só tipografia e uma linha de força no topo.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center ${personaSurface(persona, treatment)}`}>
        <div className="container py-20">
          <motion.blockquote
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl border-t-2 border-primary/40 pt-10 text-center"
          >
            <p className="text-xl font-medium leading-relaxed tracking-tight text-foreground md:text-3xl">
              {quote.text}
            </p>
            <footer className="mt-8 text-[11px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
              Aliv.iA · {content.label}
            </footer>
          </motion.blockquote>
        </div>
      </section>
    );
  }

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
