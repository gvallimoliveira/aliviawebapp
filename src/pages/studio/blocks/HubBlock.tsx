import { motion } from "framer-motion";
import { BRAND_LOGO, BRAND_NAME, BRAND_SITE, BRAND_SLOGAN } from "../brand";
import { sectionHeight, type BlockProps } from "./shared";

/**
 * HUB CONECTADO (referência: "Sua clínica completa na palma da mão" — celular
 * no centro, módulos em selos ligados por linhas tracejadas, CTA largo embaixo)
 *
 * Cabeçalho com logo + nome, título e linha de apoio vindos dos fechamentos da
 * marca, o aparelho no centro com a maquete da tela e até quatro módulos reais
 * (funcionalidades do acervo) orbitando. Rodapé com site e slogan.
 *
 * Tratamentos: 0 fundo claro · 1 areia · 2 secundária · 3 primária suave.
 */
const SURF = ["bg-background", "bg-accent/30", "bg-secondary/50", "bg-primary/5"] as const;
const DOTS = ["bg-primary", "bg-accent-foreground", "bg-secondary-foreground", "bg-primary/70"] as const;

/** Posição dos selos (em % do palco) — dois de cada lado, desencontrados. */
const SLOTS = [
  { x: 3, y: 18, side: "left" },
  { x: 97, y: 18, side: "right" },
  { x: 3, y: 62, side: "left" },
  { x: 97, y: 62, side: "right" },
] as const;

const HubBlock = ({ content, rng, treatment, format, picker }: BlockProps) => {
  if (!content.closings?.length) return null;
  const features = picker.pick(content.features, 4, rng, (f) => [f.topic]);
  if (features.length < 3) return null;
  const closing = rng.pick(content.closings);
  const sub = content.subs?.length ? rng.pick(content.subs) : "";
  const kicker = content.kickers?.length ? rng.pick(content.kickers) : "";
  const lead = features[0];

  return (
    <section className={`relative flex ${sectionHeight(format)} flex-col overflow-hidden px-6 pb-6 pt-7 ${SURF[treatment % SURF.length]}`}>
      <header className="relative z-10 flex items-center gap-2">
        <img src={BRAND_LOGO} alt="" className="h-8 w-8 object-contain" />
        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground">{BRAND_NAME}</p>
          {kicker && <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-primary">{kicker}</p>}
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-4 text-center"
        data-studio-learn-frame
      >
        <h2 className="text-[clamp(1.4rem,6vw,2.4rem)] font-extrabold leading-[1.05] tracking-tight text-foreground" data-studio-learn>
          {closing.title}
        </h2>
        {(closing.sub || sub) && (
          <p className="mx-auto mt-2 max-w-sm text-[11px] leading-snug text-muted-foreground">{closing.sub || sub}</p>
        )}
      </motion.div>

      <div className="relative z-10 mx-auto my-3 w-full max-w-[460px] flex-1">
        <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <ellipse cx="50" cy="50" rx="40" ry="44" fill="none" stroke="hsl(var(--primary) / 0.25)" strokeWidth="0.4" />
          {SLOTS.slice(0, features.length - 0).map((s, i) => (
            <line
              key={i}
              x1={s.side === "left" ? 24 : 76}
              y1={s.y + 4}
              x2={s.side === "left" ? 38 : 62}
              y2={s.y + 4}
              stroke="hsl(var(--foreground) / 0.35)"
              strokeWidth="0.4"
              strokeDasharray="1.4 1.2"
            />
          ))}
        </svg>

        <div className="absolute left-1/2 top-1/2 w-[32%] -translate-x-1/2 -translate-y-1/2">
          <div className="rounded-[24px] border border-border bg-foreground/90 p-[5px] shadow-[0_30px_60px_-30px_hsl(var(--foreground)/0.7)]">
            <div className="relative aspect-[9/19] overflow-hidden rounded-[19px] bg-background">
              <span className="absolute left-1/2 top-1 h-1.5 w-8 -translate-x-1/2 rounded-full bg-foreground/80" />
              <div className="flex h-full flex-col items-center px-2 pt-5 text-center">
                <img src={BRAND_LOGO} alt="" className="h-4 w-4 object-contain" />
                <p className="mt-1 text-[6.5px] font-bold leading-tight text-primary">{lead.title}</p>
                <div className="mt-2 w-full space-y-1">
                  {features.slice(1).map((f, i) => (
                    <div key={`${f.title}-${i}`} className="rounded border border-border px-1 py-0.5 text-left">
                      <p className="truncate text-[5px] text-muted-foreground">{f.title}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-auto mb-2 flex w-full justify-around" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <i key={i} className={`block h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {features.slice(0, 4).map((f, i) => {
          const s = SLOTS[i];
          return (
            <div
              key={`b-${f.title}-${i}`}
              className={`absolute flex max-w-[30%] items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5 shadow-md ${
                s.side === "left" ? "" : "-translate-x-full"
              }`}
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <i className={`block h-3.5 w-3.5 shrink-0 rounded ${DOTS[i % DOTS.length]}`} aria-hidden />
              <span className="text-[9px] font-semibold leading-tight text-foreground">{f.tag || f.title}</span>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 shadow-lg">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] text-primary-foreground" aria-hidden>
          →
        </span>
        <span className="text-sm font-bold text-background">{closing.cta}</span>
      </div>
      <p className="relative z-10 mt-2 text-center text-[10px] font-bold text-foreground">{BRAND_SITE}</p>
      {BRAND_SLOGAN && <p className="relative z-10 text-center text-[8px] text-muted-foreground">{BRAND_SLOGAN}</p>}
    </section>
  );
};

export default HubBlock;
