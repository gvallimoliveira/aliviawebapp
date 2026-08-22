import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";

type KineticStatementProps = {
  /** Small kicker above the big word */
  kicker?: string;
  /** The hero word — scales up as the section is scrolled through */
  word: string;
  /** Supporting line revealed after the word settles */
  caption?: string;
};

/**
 * Immersive dark "statement" moment: a single word grows while framing
 * brackets close in, inspired by premium product pages. Kept to a single
 * section so the warm/teal identity still dominates the page.
 */
const KineticStatement = ({ kicker, word, caption }: KineticStatementProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.65, 1, 1.25]);
  const letterSpacing = useTransform(scrollYProgress, [0, 0.5], ["0.25em", "-0.02em"]);
  const wordOpacity = useTransform(scrollYProgress, [0, 0.18, 0.8, 1], [0, 1, 1, 0.15]);
  const bracketInset = useTransform(scrollYProgress, [0, 0.55], ["2rem", "6rem"]);
  const bracketOpacity = useTransform(scrollYProgress, [0.1, 0.4, 0.7], [0, 0.55, 0]);
  const captionOpacity = useTransform(scrollYProgress, [0.42, 0.6, 0.9, 1], [0, 1, 1, 0]);
  const glow = useTransform(scrollYProgress, [0.2, 0.5, 0.85], [0.15, 0.5, 0.1]);

  return (
    <section ref={ref} className="relative h-[220vh] bg-foreground text-background">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Teal aura keeps the brand present even in the dark moment */}
        <motion.div
          aria-hidden="true"
          style={{ opacity: reduced ? 0.3 : glow }}
          className="pointer-events-none absolute h-[70vw] w-[70vw] max-h-[520px] max-w-[520px] rounded-full bg-primary/40 blur-[90px]"
        />

        {/* Framing brackets */}
        <motion.div
          aria-hidden="true"
          style={{ inset: reduced ? "3rem" : bracketInset, opacity: reduced ? 0.4 : bracketOpacity }}
          className="pointer-events-none absolute"
        >
          <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-background/70" />
          <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-background/70" />
          <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-background/70" />
          <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-background/70" />
        </motion.div>

        <div className="relative z-10 px-6 text-center">
          {kicker && (
            <motion.p
              style={{ opacity: reduced ? 1 : wordOpacity }}
              className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-primary"
            >
              {kicker}
            </motion.p>
          )}
          <motion.h2
            style={
              reduced
                ? undefined
                : { scale, letterSpacing, opacity: wordOpacity }
            }
            className="text-5xl font-semibold leading-none text-background md:text-7xl"
          >
            {word}
          </motion.h2>
          {caption && (
            <motion.p
              style={{ opacity: reduced ? 1 : captionOpacity }}
              className="mx-auto mt-8 max-w-md text-base leading-relaxed text-background/70 md:text-lg"
            >
              {caption}
            </motion.p>
          )}
        </div>
      </div>
    </section>
  );
};

export default KineticStatement;
