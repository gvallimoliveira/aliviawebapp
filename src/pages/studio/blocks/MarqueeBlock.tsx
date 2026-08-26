import type { BlockProps } from "./shared";

/**
 * Continuous CSS-only strip. A paridade escuro/claro é deslocada pela persona,
 * então a mesma posição de marquee muda de clima entre membros da equipe.
 */
const MarqueeBlock = ({ content, rng, treatment, persona }: BlockProps) => {
  const items = rng.pick(content.marquee);
  const loop = [...items, ...items, ...items];
  const dark = (treatment + persona.surfaceShift) % 2 === 1;
  const duration = 22 + (treatment % 4) * 6;
  // Separador geométrico também muda de mão em mão: ponto, losango, plus, quadrado.
  const separator = (treatment + persona.surfaceShift + persona.textureShift) % 4;

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
            {separator === 1 ? (
              <span className="h-2 w-2 rotate-45 bg-primary" aria-hidden />
            ) : separator === 2 ? (
              <span className="text-base font-light leading-none text-primary" aria-hidden>+</span>
            ) : separator === 3 ? (
              <span className="h-1.5 w-1.5 rounded-[2px] bg-primary" aria-hidden />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            )}
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarqueeBlock;
