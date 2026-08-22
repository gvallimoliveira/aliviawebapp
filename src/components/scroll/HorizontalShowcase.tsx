import { motion, useScroll, useTransform, useReducedMotion, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

export type HorizontalItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type HorizontalShowcaseProps = {
  kicker?: string;
  heading: string;
  items: HorizontalItem[];
};

/**
 * Pinned section where the card track slides sideways as the page scrolls.
 * On reduced-motion (or when the track fits) it degrades to a normal
 * horizontal swipe list.
 */
const HorizontalShowcase = ({ kicker, heading, items }: HorizontalShowcaseProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [overflow, setOverflow] = useState(0);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });
  const x = useTransform(smooth, [0, 1], [0, -overflow]);

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      setOverflow(Math.max(0, track.scrollWidth - track.clientWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [items.length]);

  const Card = ({ item }: { item: HorizontalItem }) => (
    <article className="flex w-[76vw] shrink-0 flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-[0_20px_50px_-30px_hsl(var(--foreground)/0.3)] sm:w-[46vw] lg:w-[26vw]">
      <span className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <item.icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-lg font-semibold text-foreground md:text-xl">{item.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      </div>
    </article>
  );

  if (reduced) {
    return (
      <section className="bg-accent/30 py-20">
        <div className="container">
          {kicker && (
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.28em] text-primary">{kicker}</p>
          )}
          <h2 className="mb-8 max-w-2xl text-2xl font-bold text-foreground md:text-4xl">{heading}</h2>
          <div className="scrollbar-hide flex gap-5 overflow-x-auto pb-2">
            {items.map((item) => (
              <Card key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative bg-accent/30"
      style={{ height: `${items.length * 55 + 60}vh` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div className="container">
          {kicker && (
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-primary md:text-xs">
              {kicker}
            </p>
          )}
          <h2 className="mb-6 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-foreground md:mb-10 md:text-4xl">
            {heading}
          </h2>
        </div>
        <div ref={trackRef} className="w-full overflow-hidden">
          <motion.div style={{ x }} className="flex gap-5 px-6 md:px-12">
            {items.map((item) => (
              <Card key={item.title} item={item} />
            ))}
          </motion.div>
        </div>
        <div className="container mt-8">
          <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-border">
            <motion.div
              aria-hidden="true"
              className="h-full origin-left rounded-full bg-primary"
              style={{ scaleX: smooth }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HorizontalShowcase;
