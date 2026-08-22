import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type CinematicClosingProps = {
  kicker?: string;
  heading: string;
  sub?: string;
  note?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

/**
 * Generic scroll-driven closing CTA (same choreography as the patient landing):
 * the headline rises while two teal auras drift apart.
 */
const CinematicClosing = ({
  kicker,
  heading,
  sub,
  note,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: CinematicClosingProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const titleY = useTransform(scrollYProgress, [0, 0.6], [40, 0]);
  const titleScale = useTransform(scrollYProgress, [0, 0.6], [0.94, 1]);
  const auraLeft = useTransform(scrollYProgress, [0, 1], ["-10%", "-30%"]);
  const auraRight = useTransform(scrollYProgress, [0, 1], ["-10%", "-30%"]);
  const auraOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.15, 0.5, 0.2]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-secondary/40 py-24 md:py-32">
      <motion.div
        aria-hidden="true"
        className="blur-blob absolute top-0 h-[60vw] max-h-[420px] w-[60vw] max-w-[420px] rounded-full bg-primary/30 blur-[90px]"
        style={reduced ? { left: "-20%", opacity: 0.25 } : { left: auraLeft, opacity: auraOpacity }}
      />
      <motion.div
        aria-hidden="true"
        className="blur-blob absolute bottom-0 h-[55vw] max-h-[380px] w-[55vw] max-w-[380px] rounded-full bg-accent-foreground/20 blur-[90px]"
        style={reduced ? { right: "-20%", opacity: 0.25 } : { right: auraRight, opacity: auraOpacity }}
      />

      <div className="container relative z-10 text-center">
        {kicker && (
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-primary md:text-xs">
            {kicker}
          </p>
        )}
        <motion.h2
          style={reduced ? undefined : { y: titleY, scale: titleScale }}
          className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl"
        >
          {heading}
        </motion.h2>
        {sub && (
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {sub}
          </p>
        )}
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="w-full gap-2 rounded-xl sm:w-auto" onClick={onPrimary}>
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {secondaryLabel && onSecondary && (
            <Button size="lg" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </div>
        {note && <p className="mt-5 text-xs text-muted-foreground">{note}</p>}
      </div>
    </section>
  );
};

export default CinematicClosing;
