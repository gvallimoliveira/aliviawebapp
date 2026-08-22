import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "framer-motion";
import { useRef } from "react";

type ScrollWordsProps = {
  kicker?: string;
  /** Sentence revealed word by word as the section is scrolled through */
  text: string;
  /** Optional line shown under the sentence */
  footnote?: string;
};

const Word = ({
  progress,
  range,
  children,
  reduced,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  children: string;
  reduced: boolean | null;
}) => {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <span className="relative mr-[0.28em] inline-block">
      <motion.span style={reduced ? undefined : { opacity }} className="text-foreground">
        {children}
      </motion.span>
    </span>
  );
};

/**
 * Scroll-linked manifesto: each word lights up as the reader scrolls.
 * Only opacity animates, so it stays cheap on mobile.
 */
const ScrollWords = ({ kicker, text, footnote }: ScrollWordsProps) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");

  return (
    <section className="bg-background py-20 md:py-28">
      <div className="container max-w-3xl">
        {kicker && (
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-primary md:text-xs">
            {kicker}
          </p>
        )}
        <p
          ref={ref}
          className="flex flex-wrap text-2xl font-semibold leading-snug tracking-tight text-foreground/20 md:text-4xl md:leading-[1.25]"
        >
          {words.map((word, i) => {
            const start = i / words.length;
            const end = Math.min(1, start + 1 / words.length);
            return (
              <Word key={`${word}-${i}`} progress={scrollYProgress} range={[start, end]} reduced={reduced}>
                {word}
              </Word>
            );
          })}
        </p>
        {footnote && (
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">{footnote}</p>
        )}
      </div>
    </section>
  );
};

export default ScrollWords;
