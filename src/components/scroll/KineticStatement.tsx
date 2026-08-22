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

  const scale = useTransform(scrollYProgress, [0, 0.45, 1], [0.6, 1, 1.3]);
  const letterSpacing = useTransform(scrollYProgress, [0, 0.45], ["0.3em", "-0.03em"]);
  const wordOpacity = useTransform(scrollYProgress, [0, 0.15, 0.82, 1], [0, 1, 1, 0]);
  const wordY = useTransform(scrollYProgress, [0, 0.45], ["2rem", "0rem"]);
  const bracketInset = useTransform(scrollYProgress, [0, 0.5], ["1rem", "7rem"]);
  const bracketOpacity = useTransform(scrollYProgress, [0.08, 0.35, 0.7], [0, 0.7, 0]);
  const captionOpacity = useTransform(scrollYProgress, [0.35, 0.52, 0.9, 1], [0, 1, 1, 0]);
  const glow = useTransform(scrollYProgress, [0.15, 0.45, 0.85], [0.2, 0.6, 0.1]);

  return (
    <section ref={ref} className="relative h-[150vh] bg-foreground text-background">

      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Teal aura keeps the brand present even in the dark moment */}
        <motion.div
          aria-hidden="true"
          style={{ opacity: reduced ? 0.35 : glow }}
          className="pointer-events-none absolute h-[75vw] w-[75vw] max-h-[580px] max-w-[580px] rounded-full bg-primary/40 blur-[120px]"
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
              style={{ opacity: reduced ? 1 : wordOpacity, y: reduced ? 0 : wordY }}
              className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-primary"
            >
              {kicker}
            </motion.p>
          )}
          <motion.h2
            style={
              reduced
                ? undefined
                : { scale, letterSpacing, opacity: wordOpacity, y: wordY, filter: "drop-shadow(0 0 24px rgba(59,130,246,0.35))" }
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
