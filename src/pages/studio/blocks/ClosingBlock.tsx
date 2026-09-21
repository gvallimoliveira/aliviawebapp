import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BRAND_LOGO, BRAND_NAME, BRAND_SITE } from "../brand";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { ACCENT_STYLES, DARK_ACCENT_INDEXES, GeoOrnament, TextureLayer, renderAccent } from "./Texture";

/**
 * Brand signature + CTA.
 * Treatments: 0 claro centrado, 1 statement escuro, 2 assinatura minimalista
 * (sem pílula de CTA), 3 editorial à esquerda.
 * O título ganha palavra-destaque contrastante; no statement escuro o sorteio
 * fica restrito às variantes legíveis sobre fundo tinta.
 */
const ClosingBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  const closing = rng.pick(content.closings);
  const accentVariant =
    treatment === 1
      ? DARK_ACCENT_INDEXES[rng.int(DARK_ACCENT_INDEXES.length)]
      : rng.int(ACCENT_STYLES.length);
  const title = renderAccent(closing.title, accentVariant);

  if (treatment === 2) {
    // Assinatura minimalista: marca, frase e endereço — nada mais.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <div className="container relative py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex max-w-xl flex-col items-center gap-5"
          >
             <img src={BRAND_LOGO} alt={BRAND_NAME} data-brand-logo="1" className="h-14 w-auto max-w-52 object-contain md:h-16" />
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
              {title}
            </h2>
            <span aria-hidden className="h-px w-20 bg-primary/40" />
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{closing.sub}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
              {BRAND_SITE}
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  if (treatment === 3) {
    // Editorial à esquerda: fecho com jeito de coluna de revista.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <GeoOrnament index={treatment + persona.textureShift} />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-1/2 h-[50vh] w-[50vh] -translate-y-1/2 rounded-full bg-primary/10 blur-[110px]"
        />
        <div className="container relative py-20">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex max-w-3xl flex-col items-start gap-6 text-left md:ml-[6%]"
          >
             <img src={BRAND_LOGO} alt={BRAND_NAME} data-brand-logo="1" className="h-12 w-auto max-w-48 object-contain md:h-14" />
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
              {title}
            </h2>
            <p className="max-w-xl text-base text-muted-foreground md:text-lg">{closing.sub}</p>
            <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground md:text-base">
              {closing.cta}
              <ArrowRight className="h-4 w-4" />
            </div>
            <p className="mt-4 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
              {BRAND_SITE}
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  const dark = treatment === 1;

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${
        dark ? "bg-foreground text-background" : "bg-background"
      }`}
    >
      <TextureLayer persona={persona} index={treatment} dark={dark} />
      <div
        aria-hidden
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] ${
          dark ? "bg-primary/30" : "bg-primary/10"
        }`}
      />

      <div className="container relative py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex max-w-2xl flex-col items-center gap-6"
        >
          <img src={BRAND_LOGO} alt={BRAND_NAME} data-brand-logo="1" className="h-16 w-auto max-w-56 object-contain md:h-20" />
          <h2 className={`text-3xl font-bold leading-tight tracking-tight md:text-5xl ${dark ? "" : "text-foreground"}`}>
            {title}
          </h2>
          <p className={`text-base md:text-lg ${dark ? "text-background/70" : "text-muted-foreground"}`}>
            {closing.sub}
          </p>

          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground md:text-base">
            {closing.cta}
            <ArrowRight className="h-4 w-4" />
          </div>

          <p className={`mt-6 text-[11px] uppercase tracking-[0.32em] ${dark ? "text-background/50" : "text-muted-foreground"}`}>
            {BRAND_SITE}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ClosingBlock;
