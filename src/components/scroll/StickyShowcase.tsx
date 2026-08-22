import { motion, useScroll, useTransform, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";

export type ShowcaseStep = {
  title: string;
  description: string;
  image: string;
};

type StickyShowcaseProps = {
  kicker?: string;
  heading: string;
  steps: ShowcaseStep[];
};

/**
 * Pinned visual + scroll-driven steps. The image column stays fixed while the
 * copy advances, mirroring the "scrollytelling" feel of premium product pages.
 * On reduced-motion / no-JS-scroll cases it degrades to a simple stacked list.
 */
const StickyShowcase = ({ kicker, heading, steps }: StickyShowcaseProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(steps.length - 1, Math.max(0, Math.floor(v * steps.length)));
    setActive(idx);
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [1.06, 1]);

  return (
    <section ref={ref} className="relative bg-secondary/30" style={{ height: `${steps.length * 90 + 40}vh` }}>
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden py-16">
        <div className="container">
          {kicker && (
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.28em] text-primary">{kicker}</p>
          )}
          <h2 className="mb-10 max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {heading}
          </h2>

          <div className="grid items-center gap-10 md:grid-cols-2">
            {/* Pinned visual */}
            <div className="relative order-1 aspect-[4/5] w-full max-w-sm justify-self-center overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_-40px_hsl(var(--foreground)/0.35)] md:order-2 md:max-w-md">
              {steps.map((step, i) => (
                <motion.img
                  key={step.image}
                  src={step.image}
                  alt={step.title}
                  loading="lazy"
                  style={reduced ? undefined : { scale: imageScale }}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                    i === active ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/45 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
                  {active + 1}/{steps.length} · {steps[active].title}
                </span>
              </div>
            </div>

            {/* Steps copy */}
            <ol className="order-2 space-y-6 md:order-1">
              {steps.map((step, i) => {
                const isActive = i === active;
                return (
                  <li
                    key={step.title}
                    className={`flex gap-4 rounded-2xl border p-4 transition-all duration-500 ${
                      isActive
                        ? "border-primary/30 bg-card opacity-100 shadow-sm"
                        : "border-transparent bg-transparent opacity-40"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StickyShowcase;
