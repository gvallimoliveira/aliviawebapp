import { motion } from "framer-motion";
import { BRAND_LOGO, BRAND_NAME } from "../brand";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { TextureLayer } from "./Texture";
import { fallbackScreen, themedScreen, type MockScreen } from "../mockScreens";
import { pickScreenPhoto } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";

/**
 * TUTORIAL COM PÍLULA (referência: posts "Cansou de preencher [prontuário?]",
 * "Como fazer uma [avaliação rápida] pelo app?", "Novidade no app [recurso]")
 *
 * Título em três linhas: abertura + palavra-chave dentro de uma pílula da cor
 * primária com "faíscas" laterais + complemento. Embaixo, o aparelho em cena
 * (notebook, tablet ou celular) com a maquete da tela, e um botão flutuante
 * com a chamada real da marca. Nenhuma promessa de vídeo é inventada: o botão
 * usa o CTA do acervo.
 *
 * Tratamentos: 0 notebook · 1 tablet · 2 celular · 3 notebook em chapa primária.
 */
const DEVICES = ["laptop", "tablet", "phone", "laptop"] as const;

const Sparks = ({ side }: { side: "left" | "right" }) => (
  <span aria-hidden className={`flex flex-col gap-1 ${side === "left" ? "items-end" : "items-start"}`}>
    {[0, 1, 2].map((i) => (
      <i
        key={i}
        className="block h-[3px] rounded-full bg-primary"
        style={{
          width: i === 1 ? 16 : 11,
          transform: `rotate(${(side === "left" ? -1 : 1) * (i - 1) * 24}deg)`,
        }}
      />
    ))}
  </span>
);

const Screen = ({ screen, max = 4 }: { screen: MockScreen; max?: number }) => {
  const rows = screen.rows.slice(0, max);
  return (
    <div className="flex h-full w-full bg-background text-left [hyphens:none]" style={{ wordBreak: "normal", overflowWrap: "normal" }}>
      <div className="hidden w-[26%] flex-col gap-1.5 border-r border-border bg-secondary/40 p-2 sm:flex">
        <div className="mb-1 flex items-center gap-1">
          <img src={BRAND_LOGO} alt="" className="h-3 w-3 object-contain" />
          <span className="truncate text-[6px] font-semibold uppercase tracking-[0.18em] text-foreground">{BRAND_NAME}</span>
        </div>
        {rows.map((r, i) => (
          <span
            key={`${r.label}-${i}`}
            className={`truncate rounded px-1 py-0.5 text-[5.5px] ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {r.label}
          </span>
        ))}
      </div>
      <div className="flex-1 p-2.5">
        <p className="text-[8px] font-bold leading-tight text-foreground [text-wrap:balance]">{screen.title}</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {rows.map((r, i) => (
            <div key={`c-${r.label}-${i}`} className="rounded border border-border bg-card px-1.5 py-1">
              <p className="truncate text-[5.5px] text-muted-foreground">{r.label}</p>
              {r.value && <p className="truncate text-[6.5px] font-bold leading-tight text-foreground">{r.value}</p>}
              <div className="mt-1 h-[3px] w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TutorialBlock = ({ content, rng, treatment, format, persona, picker, photos, artKey, shot }: BlockProps) => {
  if (!content.headlines?.length || !content.closings?.length) return null;
  const features = picker.pick(content.features, 4, rng, (f) => [f.topic]);
  if (features.length < 2) return null;

  const device = DEVICES[treatment % DEVICES.length];
  const primary = treatment === 3;
  const h = rng.pick(content.headlines);
  const kicker = content.kickers?.length ? rng.pick(content.kickers) : "";
  const closing = rng.pick(content.closings);
  const screen =
    themedScreen(`${h.strong} ${h.rest}`, features.map((f) => f.topic)) ??
    fallbackScreen(features, [kicker, ...(content.kickers ?? [])]);
  const shotPhoto = pickScreenPhoto(photos, treatment + rng.int(5), features.map((f) => f.topic), artKey, shot?.affinity);
  if (!shotPhoto && screen.rows.length < 2) return null;
  /** Print real do sistema na tela; sem print, maquete tipográfica coerente com o título. */
  const show = (max?: number) =>
    shotPhoto ? (
      <PhotoFrame photo={{ ...shotPhoto, safeArea: "none" }} className="h-full w-full rounded-none" exportLayer="foreground" />
    ) : (
      <Screen screen={screen} max={max} />
    );

  const ink = primary ? "text-primary-foreground" : "text-foreground";

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col overflow-hidden ${primary ? "" : personaSurface(persona, treatment + 2)}`}
      style={primary ? { backgroundColor: "hsl(var(--primary))" } : undefined}
    >
      {!primary && <TextureLayer persona={persona} index={treatment + 4} />}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: primary
            ? "radial-gradient(90% 60% at 50% 0%, hsl(var(--background) / 0.18), transparent 70%)"
            : "radial-gradient(110% 70% at 50% 0%, hsl(var(--background)), transparent 65%), linear-gradient(180deg, transparent 55%, hsl(var(--primary) / 0.10))",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-1 flex-col items-start px-7 pt-12"
        data-studio-learn-frame
      >
        {kicker && (
          <p className={`mb-2 text-[clamp(1.3rem,5.4vw,2.2rem)] font-semibold leading-[1.05] tracking-tight ${ink}`} data-studio-learn>
            {kicker}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Sparks side="left" />
          <span
            className={`rounded-full px-5 py-1 text-[clamp(1.8rem,8vw,3.4rem)] font-extrabold leading-[1.05] tracking-tight shadow-[0_14px_30px_-16px_hsl(var(--primary)/0.8)] ${
              primary ? "bg-background text-primary" : "bg-primary text-primary-foreground"
            }`}
          >
            {h.strong}
          </span>
          <Sparks side="right" />
        </div>
        <p className={`mt-2 max-w-[92%] text-[clamp(1.3rem,5.4vw,2.2rem)] font-bold leading-[1.08] tracking-tight ${ink}`}>
          {h.rest}
        </p>
      </motion.div>

      <div className="relative z-10 flex flex-1 items-end justify-center overflow-hidden px-6 pb-20">
        {device === "laptop" && (
          <div className="w-[88%] max-w-[380px] translate-y-3 -rotate-2">
            <div className="rounded-t-xl border border-border bg-foreground/90 p-[6px] shadow-[0_40px_80px_-40px_hsl(var(--foreground)/0.8)]">
              <div className="aspect-[16/10] overflow-hidden rounded-md">
                {show()}
              </div>
            </div>
            <div className="mx-auto h-2.5 w-[112%] -translate-x-[5%] rounded-b-xl bg-muted" />
          </div>
        )}
        {device === "tablet" && (
          <div className="w-[78%] max-w-[330px] translate-y-6 rotate-[-6deg]">
            <div className="rounded-[20px] border border-border bg-foreground/90 p-[8px] shadow-[0_40px_80px_-40px_hsl(var(--foreground)/0.8)]">
              <div className="aspect-[4/3] overflow-hidden rounded-[13px]">
                {show()}
              </div>
            </div>
          </div>
        )}
        {device === "phone" && (
          <div className="w-[46%] max-w-[200px] translate-y-10 rotate-[4deg]">
            <div className="rounded-[28px] border border-border bg-foreground/90 p-[7px] shadow-[0_40px_80px_-40px_hsl(var(--foreground)/0.8)]">
              <div className="relative aspect-[9/17] overflow-hidden rounded-[22px]">
                <span className="absolute left-1/2 top-1 z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-foreground/80" />
                <div className={`h-full ${shotPhoto ? "" : "pt-3"}`}>{show(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 z-20 flex max-w-[78%] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/90 py-2 pl-2 pr-4 shadow-lg backdrop-blur">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground" aria-hidden>
          ▶
        </span>
        <span className="text-[11px] font-semibold leading-tight text-foreground [text-wrap:balance]">{closing.cta}</span>
        <span className="text-[13px] text-primary" aria-hidden>→</span>
      </div>
    </section>
  );
};

export default TutorialBlock;
