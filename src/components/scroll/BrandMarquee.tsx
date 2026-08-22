import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Continuous marquee strip used as a breather between heavy sections.
 * Pure CSS transform animation (no JS per frame) and paused for
 * reduced-motion users.
 */
const BrandMarquee = () => {
  const { t } = useLanguage();
  const items = [1, 2, 3, 4, 5].map((n) => t(`cine.marquee.${n}`));
  const loop = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-border bg-background py-4">
      <style>{`
        @keyframes aliviaMarquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @media (prefers-reduced-motion: reduce) { .alivia-marquee { animation: none !important } }
      `}</style>
      <div
        className="alivia-marquee flex w-max items-center gap-8"
        style={{ animation: "aliviaMarquee 28s linear infinite", willChange: "transform" }}
      >
        {loop.map((label, i) => (
          <span key={`${label}-${i}`} className="flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
};

export default BrandMarquee;
