import { motion } from "framer-motion";
import { BRAND_LOGO, BRAND_NAME } from "../brand";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { TextureLayer } from "./Texture";
import { pickScreenPhoto } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";
import type { StudioPhoto } from "../photos";

/**
 * MOCKUP DE DISPOSITIVO (referência: notebook, tablet e celular em cena limpa)
 *
 * Mostra o produto "aberto" na tela — notebook, tablet ou celular — em um
 * ambiente de luz suave. Quando o acervo tem prints do sistema (uso "Produto"
 * com legenda de tela/interface), o print real ocupa a tela do aparelho; sem
 * prints, a tela vira uma maquete tipográfica com o conteúdo da marca.
 *
 * Tratamentos: 0 notebook · 1 tablet · 2 celular
 */
const DEVICES = ["laptop", "tablet", "phone"] as const;

/** Maquete de interface: cabeçalho da marca + destaque + linhas de conteúdo. */
const ScreenUi = ({
  title,
  rows,
  compact,
}: {
  title: string;
  rows: string[];
  compact?: boolean;
}) => (
  <div className="flex h-full w-full flex-col bg-background">
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      <img src={BRAND_LOGO} alt="" className="h-3.5 w-3.5 object-contain" />
      <span className="text-[8px] font-semibold uppercase tracking-[0.22em] text-foreground">{BRAND_NAME}</span>
      <span className="ml-auto flex gap-1" aria-hidden>
        <i className="block h-1 w-1 rounded-full bg-muted-foreground/40" />
        <i className="block h-1 w-1 rounded-full bg-muted-foreground/40" />
        <i className="block h-1 w-1 rounded-full bg-muted-foreground/40" />
      </span>
    </div>

    <div className="flex-1 px-3 py-3">
      <p className={`font-bold leading-tight text-foreground ${compact ? "text-[10px]" : "text-[12px]"}`}>{title}</p>
      <div className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <div key={`${row}-${i}`} className="rounded-md border border-border bg-secondary/30 px-2 py-1.5">
            <p className="truncate text-[7px] leading-tight text-muted-foreground">{row}</p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="px-3 pb-3">
      <div className="rounded-md bg-primary px-2 py-1.5 text-center text-[7px] font-semibold uppercase tracking-[0.2em] text-primary-foreground">
        {BRAND_NAME}
      </div>
    </div>
  </div>
);

/** Print real na tela, sem véu de texto (a tela não recebe tipografia por cima). */
const ScreenShot = ({ photo }: { photo: StudioPhoto }) => (
  <PhotoFrame photo={{ ...photo, safeArea: "none" }} className="h-full w-full rounded-none" exportLayer="foreground" />
);

const DeviceBlock = ({ content, rng, treatment, format, persona, picker, photos, artKey, shot }: BlockProps) => {
  if (!content.features?.length || !content.kickers?.length || !content.subs?.length) return null;
  const device = DEVICES[treatment % DEVICES.length];
  const features = picker.pick(content.features, 4, rng, (f) => [f.topic]);
  if (features.length < 2) return null;

  const lead = features[0];
  const rows = features.slice(1).map((f) => f.title);
  const screenPhoto = pickScreenPhoto(photos, treatment + rng.int(5), [lead.topic], artKey, shot?.affinity);
  const screen = (compact?: boolean) =>
    screenPhoto ? <ScreenShot photo={screenPhoto} /> : <ScreenUi title={lead.description} rows={rows} compact={compact} />;

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden ${personaSurface(
        persona,
        treatment + 1,
      )}`}
    >
      <TextureLayer persona={persona} index={treatment + 6} />
      {/* Luz difusa de estúdio, na direção da referência de cena limpa. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 70% 10%, hsl(var(--background) / 0.9), transparent 60%), linear-gradient(160deg, transparent 40%, hsl(var(--foreground) / 0.07))",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full flex-col items-center px-7 py-14 text-center"
      >
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
          {rng.pick(content.kickers)}
        </p>
        <h2 className="mb-8 max-w-md text-3xl font-bold leading-[1.08] tracking-tight text-foreground md:text-5xl">
          {lead.headline ?? lead.title}
        </h2>

        {device === "laptop" && (
          <div className="w-full max-w-[400px]">
            <div className="relative rounded-t-2xl border border-border bg-foreground/90 px-[7px] pb-[7px] pt-[12px] shadow-[0_40px_80px_-40px_hsl(var(--foreground)/0.8)]">
              <span aria-hidden className="absolute left-1/2 top-[4px] h-1 w-1 -translate-x-1/2 rounded-full bg-background/40" />
              <div className="aspect-[16/10] overflow-hidden rounded-md">{screen(true)}</div>
            </div>
            <div className="relative mx-auto h-3 w-[114%] -translate-x-[6%] rounded-b-2xl bg-gradient-to-b from-muted to-muted-foreground/30">
              <span aria-hidden className="absolute left-1/2 top-0 h-1 w-14 -translate-x-1/2 rounded-b-md bg-muted-foreground/30" />
            </div>
          </div>
        )}

        {device === "tablet" && (
          <div className="w-full max-w-[290px] rotate-[-2deg]">
            <div className="rounded-[24px] border border-border bg-foreground/90 p-[10px] shadow-[0_40px_80px_-40px_hsl(var(--foreground)/0.8)]">
              <div className={`${screenPhoto ? "aspect-[4/3]" : "aspect-[3/4]"} overflow-hidden rounded-[14px]`}>{screen()}</div>
            </div>
          </div>
        )}

        {device === "phone" && (
          <div className="relative w-full max-w-[200px]">
            <span aria-hidden className="absolute -left-[3px] top-[22%] h-8 w-[3px] rounded-l bg-foreground/70" />
            <span aria-hidden className="absolute -right-[3px] top-[28%] h-12 w-[3px] rounded-r bg-foreground/70" />
            <div className="rounded-[30px] border border-border bg-foreground/90 p-[7px] shadow-[0_40px_80px_-40px_hsl(var(--foreground)/0.8)]">
              <div className="relative aspect-[9/19] overflow-hidden rounded-[24px]">
                <span className="absolute left-1/2 top-1.5 z-10 h-2 w-12 -translate-x-1/2 rounded-full bg-foreground" />
                {screen(true)}
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 max-w-sm text-[12px] leading-relaxed text-muted-foreground md:text-sm">
          {rng.pick(content.subs)}
        </p>
      </motion.div>
    </section>
  );
};

export default DeviceBlock;
