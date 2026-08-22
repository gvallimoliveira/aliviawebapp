import { motion, useScroll, useTransform, useMotionValueEvent, useReducedMotion, useSpring } from "framer-motion";
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
 * Pinned visual + scroll-driven steps ("scrollytelling").
 *
 * Layout contract — the pinned child MUST fit inside the viewport (h-[100svh],
 * no min-h), otherwise sticky positioning releases early and the tall spacer
 * section shows up as a long blank gap on mobile. That is why the mobile
 * variant crossfades ONLY the active step instead of stacking all of them.
 */
const StickyShowcase = ({ kicker, heading, steps }: StickyShowcaseProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Continuous progress (smoothed) drives the rail + image; discrete index
  // drives the copy. Both come from the same scroll value, so the highlight
  // never lags behind the rail.
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  const railScale = useTransform(smooth, [0, 1], [0.02, 1]);
  const imageScale = useTransform(smooth, [0, 1], [1.08, 1]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // Nudge the thresholds so a step lights up as soon as its band starts.
    const raw = v * steps.length - 0.15;
    const idx = Math.min(steps.length - 1, Math.max(0, Math.round(raw)));
    setActive(idx);
  });

  return (
    <section
      ref={ref}
      className="relative bg-secondary/30"
      style={{ height: `${steps.length * 85 + 15}vh` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden py-10 md:py-16">
        <div className="container">
          {kicker && (
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-primary md:text-xs">
              {kicker}
            </p>
          )}
          <h2 className="mb-5 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-foreground md:mb-10 md:text-4xl">
            {heading}
          </h2>

          <div className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
            {/* Pinned visual */}
            <div className="relative order-1 mx-auto aspect-[16/11] w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_-40px_hsl(var(--foreground)/0.35)] md:order-2 md:aspect-[4/5] md:max-w-md">
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
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
                  {active + 1}/{steps.length} · {steps[active].title}
                </span>
                <span className="flex gap-1.5">
                  {steps.map((step, i) => (
                    <span
                      key={step.title}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        i === active ? "w-5 bg-primary" : "w-1.5 bg-background/70"
                      }`}
                    />
                  ))}
                </span>
              </div>
            </div>

            {/* Steps copy — mobile: only the active step (keeps the pinned
                child inside the viewport). Desktop: full list. */}
            <div className="order-2 md:order-1">
              {/* Mobile: rail + single card */}
              <div className="flex gap-4 md:hidden">
                <div className="relative w-1 shrink-0 overflow-hidden rounded-full bg-border">
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-full origin-top rounded-full bg-primary"
                    style={{ scaleY: reduced ? 1 : railScale }}
                  />
                </div>
                <div className="relative min-h-[9.5rem] flex-1">
                  {steps.map((step, i) => (
                    <div
                      key={step.title}
                      aria-hidden={i !== active}
                      className={`transition-all duration-500 ${
                        i === active
                          ? "relative opacity-100 translate-y-0"
                          : "pointer-events-none absolute inset-0 translate-y-2 opacity-0"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {i + 1}
                        </span>
                        <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop: full list with active emphasis */}
              <ol className="hidden md:block md:space-y-5">
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
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StickyShowcase;
