import { FORMAT_LABEL, type ShowcaseItem } from "./showcase";

/**
 * MINIATURAS DE DEMONSTRAÇÃO
 *
 * Recriam a gramática visual dos blocos do Studio (mono, eco, tipografia-herói,
 * split, stats, lista, citação e lockup de marca) em escala de vitrine. Só
 * tokens semânticos: nenhuma cor solta, nenhum asset externo.
 */

const ratio: Record<ShowcaseItem["format"], string> = {
  story: "9 / 16",
  post: "1 / 1",
  carousel: "4 / 5",
};

const grid =
  "linear-gradient(hsl(var(--foreground)/0.09) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)/0.09) 1px, transparent 1px)";

/** Destaca a palavra escolhida dentro da frase. */
const Accent = ({
  text,
  accent,
  className = "text-primary",
}: {
  text: string;
  accent?: string;
  className?: string;
}) => {
  if (!accent || !text.includes(accent)) return <>{text}</>;
  const [before, ...rest] = text.split(accent);
  return (
    <>
      {before}
      <span className={className}>{accent}</span>
      {rest.join(accent)}
    </>
  );
};

const Signature = ({ tone = "muted" }: { tone?: "muted" | "paper" }) => (
  <span
    className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] ${
      tone === "paper" ? "text-mono-paper/70" : "text-muted-foreground"
    }`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
    Studio
  </span>
);

const Body = ({ item }: { item: ShowcaseItem }) => {
  switch (item.kind) {
    case "mono":
      return (
        <div className="flex h-full flex-col justify-between bg-mono-ink p-5">
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-mono-mid">
            {item.kicker}
          </span>
          <p className="text-[clamp(1.1rem,2.4vw,1.9rem)] font-black leading-[1.02] tracking-tight text-mono-paper">
            <Accent text={item.headline} accent={item.accent} />
          </p>
          <div className="flex items-end justify-between gap-3">
            <p className="max-w-[70%] text-[10px] leading-snug text-mono-mid">{item.support}</p>
            <Signature tone="paper" />
          </div>
        </div>
      );

    case "echo":
      return (
        <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-foreground p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`text-[clamp(0.9rem,2vw,1.4rem)] font-black uppercase leading-[1.05] tracking-tight ${
                i === 2 ? "text-primary" : "text-background/25"
              }`}
              style={
                i === 2
                  ? undefined
                  : { WebkitTextStroke: "1px hsl(var(--background)/0.5)", color: "transparent" }
              }
            >
              {item.headline}
            </span>
          ))}
          <p className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[9px] text-background/60">
            <span>{item.support}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </p>
        </div>
      );

    case "typo":
      return (
        <div className="relative flex h-full flex-col justify-between bg-card p-5">
          <div aria-hidden className="absolute inset-0" style={{ backgroundImage: grid, backgroundSize: "22px 22px" }} />
          <span className="relative text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {item.kicker}
          </span>
          <p className="relative text-[clamp(1.1rem,2.5vw,2rem)] font-black leading-[0.98] tracking-tight text-foreground">
            <Accent text={item.headline} accent={item.accent} />
          </p>
          <div className="relative flex items-end justify-between gap-3">
            <p className="max-w-[70%] text-[10px] leading-snug text-muted-foreground">{item.support}</p>
            <Signature />
          </div>
        </div>
      );

    case "split":
      return (
        <div className="grid h-full grid-cols-5">
          <div className="col-span-3 flex flex-col justify-between bg-background p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary">
              {item.kicker}
            </span>
            <p className="text-[clamp(1rem,2.2vw,1.6rem)] font-black leading-[1.02] tracking-tight text-foreground">
              <Accent text={item.headline} accent={item.accent} />
            </p>
            <Signature />
          </div>
          <div className="col-span-2 relative overflow-hidden bg-primary/15">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, hsl(var(--primary)/0.35) 0 2px, transparent 2px 9px)",
              }}
            />
            <p className="absolute bottom-4 left-3 right-3 text-[9px] leading-snug text-foreground/70">
              {item.support}
            </p>
          </div>
        </div>
      );

    case "stats":
      return (
        <div className="flex h-full flex-col justify-between bg-background p-5">
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {item.kicker}
          </span>
          <div>
            <p className="text-[clamp(2.4rem,7vw,4.5rem)] font-black leading-none tracking-tighter text-primary">
              {item.value}
            </p>
            <p className="mt-1 text-[clamp(0.8rem,1.6vw,1.1rem)] font-bold leading-tight text-foreground">
              <Accent text={item.headline} accent={item.accent} className="underline decoration-primary decoration-4 underline-offset-2" />
            </p>
          </div>
          <div className="flex items-end justify-between gap-3">
            <p className="text-[10px] text-muted-foreground">{item.support}</p>
            <Signature />
          </div>
        </div>
      );

    case "list":
      return (
        <div className="flex h-full flex-col justify-between bg-card p-5">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary">
              {item.kicker}
            </span>
            <p className="mt-2 text-[clamp(0.9rem,1.9vw,1.3rem)] font-black leading-tight tracking-tight text-foreground">
              <Accent text={item.headline} accent={item.accent} />
            </p>
          </div>
          <ul className="space-y-2">
            {item.lines?.map((line, i) => (
              <li key={line} className="flex gap-2 text-[10px] leading-snug text-muted-foreground">
                <span className="font-black text-primary">{i + 1}</span>
                {line}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between">
            <span className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${i === 1 ? "bg-primary" : "bg-muted-foreground/30"}`}
                />
              ))}
            </span>
            <Signature />
          </div>
        </div>
      );

    case "quote":
      return (
        <div className="flex h-full flex-col justify-between bg-primary/10 p-5">
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary">
            {item.kicker}
          </span>
          <p className="text-[clamp(0.95rem,2vw,1.5rem)] font-bold italic leading-tight text-foreground">
            “<Accent text={item.headline} accent={item.accent} />”
          </p>
          <div className="flex items-end justify-between gap-3">
            <p className="text-[10px] text-muted-foreground">{item.support}</p>
            <Signature />
          </div>
        </div>
      );

    case "brand":
    default:
      return (
        <div className="relative flex h-full items-center overflow-hidden bg-foreground p-5">
          <div className="absolute -right-1 top-4 flex flex-col leading-[0.82]">
            {item.brand.slice(0, 8).split("").map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                className="text-[clamp(1.2rem,3vw,2rem)] font-black uppercase"
                style={{ WebkitTextStroke: "1px hsl(var(--background)/0.45)", color: "transparent" }}
              >
                {ch}
              </span>
            ))}
          </div>
          <div className="relative pr-10">
            <p className="text-[clamp(1rem,2.2vw,1.6rem)] font-black leading-[1.03] tracking-tight text-background">
              <Accent text={item.headline} accent={item.accent} />
            </p>
            <p className="mt-2 text-[10px] leading-snug text-background/60">{item.support}</p>
            <div className="mt-3">
              <Signature tone="paper" />
            </div>
          </div>
        </div>
      );
  }
};

/** Cartão de exemplo com etiqueta de nicho e formato. */
const StudioProShowcase = ({ item }: { item: ShowcaseItem }) => (
  <figure className="group">
    <div
      className="overflow-hidden rounded-2xl border border-border shadow-[0_20px_50px_-35px_hsl(var(--foreground)/0.6)] transition-transform duration-300 group-hover:-translate-y-1"
      style={{ aspectRatio: ratio[item.format] }}
    >
      <Body item={item} />
    </div>
    <figcaption className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
      <span className="font-semibold text-foreground">{item.niche}</span>
      <span className="rounded-full border border-border px-2 py-0.5">{FORMAT_LABEL[item.format]}</span>
    </figcaption>
  </figure>
);

export default StudioProShowcase;
