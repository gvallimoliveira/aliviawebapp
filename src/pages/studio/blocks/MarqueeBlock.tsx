import type { BlockProps } from "./shared";

/** Continuous CSS-only strip. Treatment 1 runs on the dark surface. */
const MarqueeBlock = ({ content, rng, treatment }: BlockProps) => {
  const items = rng.pick(content.marquee);
  const loop = [...items, ...items, ...items];
  const dark = treatment % 2 === 1;
  const duration = 22 + treatment * 6;

  return (
    <div
      className={`relative overflow-hidden border-y py-5 ${
        dark ? "border-foreground/20 bg-foreground text-background" : "border-border bg-background"
      }`}
    >
      <style>{`
        @keyframes studioMarquee { from { transform: translateX(0) } to { transform: translateX(-33.333%) } }
        @media (prefers-reduced-motion: reduce) { .studio-marquee { animation: none !important } }
      `}</style>
      <div
        className="studio-marquee flex w-max items-center gap-10"
        style={{ animation: `studioMarquee ${duration}s linear infinite`, willChange: "transform" }}
      >
        {loop.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className={`flex items-center gap-10 text-sm font-medium uppercase tracking-[0.18em] md:text-base ${
              dark ? "text-background/80" : "text-muted-foreground"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarqueeBlock;
