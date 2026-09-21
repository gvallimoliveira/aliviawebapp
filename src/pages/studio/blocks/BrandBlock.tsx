import { motion } from "framer-motion";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { ACCENT_STYLES, GeoOrnament, TextureLayer, renderAccent } from "./Texture";
import { BRAND_LOGO, BRAND_NAME, BRAND_SLOGAN } from "../brand";
import { joinCopyParts } from "../typographyGuards";

/**
 * Brand block — lockups institucionais: a marca como assunto da arte.
 * Treatments: 0 logo gigante ao fundo + statement, 1 logo pequena no canto +
 * frase central, 2 wordmark tipográfico puro, 3 selo com slogan oficial,
 * 4 wordmark vertical em contorno cortado na lateral direita + statement
 * central, 5 wordmark vertical preenchido (baixa opacidade) na lateral
 * esquerda + statement central com logo.
 * Todo lockup vem do módulo único `brand.ts` (fundação do Studio-as-product).
 */

/**
 * Wordmark vertical cortado na borda (inspiração: cartaz "marun"). As letras
 * são spans empilhados (não writing-mode), para que o repintador de contorno
 * do exportImage.ts consiga repintar cada glifo no canvas — writing-mode
 * vertical não é reproduzido pelo repaint.
 */
const VerticalWordmark = ({ stroke }: { stroke?: boolean }) => (
  <div aria-hidden className="flex select-none flex-col items-center leading-[0.82]">
    {Array.from(BRAND_NAME).map((ch, i) => (
      <span
        key={i}
        data-studio-stroke={stroke ? "1" : undefined}
        className={`text-5xl font-bold tracking-tight md:text-7xl ${
          stroke
            ? "text-transparent [-webkit-text-stroke:2px_hsl(var(--foreground)/0.35)]"
            : "text-foreground/10"
        }`}
      >
        {ch}
      </span>
    ))}
  </div>
);

const BrandBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  const statementPool = [
    ...content.closings.map((item) => item.title),
    ...content.subs,
    ...content.headlines.map((item) => joinCopyParts(item.strong, item.rest)),
  ].filter(Boolean);
  const statement = rng.pick(statementPool);
  const accentVariant = rng.int(ACCENT_STYLES.length);

  if (treatment === 1) {
    // Logo pequena no canto + frase central com palavra em destaque.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <GeoOrnament index={treatment + persona.textureShift} />
        <img
          src={BRAND_LOGO}
          alt={BRAND_NAME}
          className="absolute left-6 top-6 h-10 w-10 md:left-10 md:top-10 md:h-12 md:w-12"
        />
        <div className="container relative py-20">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-3xl font-bold leading-[1.15] tracking-tight text-foreground md:text-5xl">
              {renderAccent(statement, accentVariant)}
            </p>
            <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              {BRAND_NAME}
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  if (treatment === 2) {
    // Wordmark tipográfico puro: o nome é a arte, slogan como legenda.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <div className="container relative py-20">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            <p className="text-6xl font-bold leading-none tracking-tight text-foreground md:text-9xl">
              {BRAND_NAME}
            </p>
            <p className="mx-auto mt-8 max-w-xl text-lg font-medium leading-snug text-muted-foreground md:text-2xl">
              {BRAND_SLOGAN}
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  if (treatment === 3) {
    // Selo institucional: logo em card central, slogan e assinatura.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <GeoOrnament index={treatment + persona.textureShift} />
        <div className="container relative py-20">
          <motion.figure
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex max-w-md flex-col items-center rounded-[2rem] border border-border bg-card px-10 py-12 text-center shadow-sm"
          >
            <img src={BRAND_LOGO} alt={BRAND_NAME} className="h-20 w-20 md:h-24 md:w-24" />
            <figcaption className="mt-6 text-2xl font-bold tracking-tight text-foreground">{BRAND_NAME}</figcaption>
            <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">{BRAND_SLOGAN}</p>
            <span aria-hidden className="mt-8 h-px w-16 bg-primary/50" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-primary">{statement}</p>
          </motion.figure>
        </div>
      </section>
    );
  }

  if (treatment === 4) {
    // Wordmark vertical em contorno, cortado na lateral direita + statement central.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <div className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 opacity-90 md:-right-2">
          <VerticalWordmark stroke />
        </div>
        <div className="container relative py-20">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl pl-4 pr-20 text-center md:pr-28"
          >
            <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">{BRAND_NAME}</p>
            <p className="text-3xl font-bold leading-[1.15] tracking-tight text-foreground md:text-5xl">
              {renderAccent(statement, accentVariant)}
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  if (treatment === 5) {
    // Wordmark vertical preenchido em baixa opacidade na esquerda + frase e logo.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <GeoOrnament index={treatment + persona.textureShift} />
        <div className="pointer-events-none absolute -left-6 top-1/2 -translate-y-1/2 md:-left-2">
          <VerticalWordmark />
        </div>
        <div className="container relative py-20">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex max-w-2xl flex-col items-center pl-20 pr-4 text-center md:pl-28"
          >
            <img src={BRAND_LOGO} alt={BRAND_NAME} className="mb-8 h-12 w-12 md:h-14 md:w-14" />
            <p className="text-3xl font-bold leading-[1.15] tracking-tight text-foreground md:text-5xl">
              {renderAccent(statement, accentVariant)}
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  // Treatment 0 — logo gigante ao fundo, statement em primeiro plano.
  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
      <img
        src={BRAND_LOGO}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-16 top-1/2 h-[26rem] w-[26rem] -translate-y-1/2 opacity-[0.07] md:-right-8 md:h-[34rem] md:w-[34rem]"
      />
      <TextureLayer persona={persona} index={treatment} />
      <div className="container relative py-20">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="ml-0 max-w-2xl text-left md:ml-[8%]"
        >
          <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">{BRAND_NAME}</p>
          <p className="text-3xl font-bold leading-[1.12] tracking-tight text-foreground md:text-6xl">
            {renderAccent(statement, accentVariant)}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default BrandBlock;
