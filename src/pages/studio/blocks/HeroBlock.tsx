import { motion } from "framer-motion";
import logoAlivia from "@/assets/logo-alivia.png";
import {
  ALIGNMENTS,
  alignClasses,
  personaSurface,
  pickHeadline,
  sectionHeight,
  type BlockProps,
} from "./shared";
import { ACCENT_STYLES, GeoOrnament, TextureLayer, renderAccent } from "./Texture";

/**
 * Hero statement — a full-frame manifesto line for the selected world.
 * Treatments: 0 centered + logo halo, 1 editorial left, 2 asymmetric,
 * 3 cartaz tipográfico (headline gigante + kicker em pílula),
 * 4 manifesto em coluna dupla (emblema da marca em moldura).
 * A headline respeita o gosto da persona (curta = impacto, longa = editorial)
 * e ganha uma palavra em destaque contrastante (chip/cor/sublinhado da marca).
 */
const HeroBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  const headline = pickHeadline(rng, content.headlines, persona.headlineTaste);
  const kicker = rng.pick(content.kickers);
  const sub = rng.pick(content.subs);
  const surface = personaSurface(persona, treatment);
  const accentVariant = rng.int(ACCENT_STYLES.length);
  const strong = renderAccent(headline.strong, accentVariant);

  if (treatment === 3) {
    // Cartaz tipográfico: a headline é a arte; logo e kicker viram selo no topo.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${surface}`}>
        <TextureLayer persona={persona} index={treatment} />
        <GeoOrnament index={treatment + persona.surfaceShift} />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-[-18%] h-[55vh] w-[55vh] rounded-full bg-accent/30 blur-[110px]"
        />
        <div className="container relative py-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start gap-7 text-left"
          >
            <div className="flex items-center gap-3">
              <img src={logoAlivia} alt="Aliv.iA" className="h-10 w-10 md:h-12 md:w-12" />
              <p className="rounded-full border border-primary/30 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary md:text-[11px]">
                {kicker}
              </p>
            </div>
            <h1 className="max-w-5xl text-4xl font-bold leading-[1.06] tracking-tight text-foreground md:text-7xl">
              {strong}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-2xl">{headline.rest}</p>
            <div className="mt-1 flex items-center gap-4">
              <span aria-hidden className="h-px w-16 bg-primary/60" />
              <p className="text-sm font-medium text-primary md:text-base">{sub}</p>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  if (treatment === 4) {
    // Manifesto em coluna dupla: texto à esquerda, emblema da marca emoldurado.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${surface}`}>
        <TextureLayer persona={persona} index={treatment} />
        <div className="container relative grid items-center gap-12 py-16 md:grid-cols-[1.5fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start gap-6 text-left"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-primary md:text-xs">{kicker}</p>
            <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-foreground md:text-5xl">
              {strong}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-xl">{headline.rest}</p>
            <p className="text-sm font-medium text-primary md:text-base">{sub}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto flex h-48 w-48 items-center justify-center rounded-[2.5rem] border border-primary/20 bg-card shadow-[0_30px_70px_-40px_hsl(var(--foreground)/0.4)] md:h-64 md:w-64"
          >
            <div aria-hidden className="pointer-events-none absolute -inset-8 rounded-full bg-primary/10 blur-3xl" />
            <img src={logoAlivia} alt="Aliv.iA" className="relative h-24 w-24 md:h-32 md:w-32" />
          </motion.div>
        </div>
      </section>
    );
  }

  const align = ALIGNMENTS[treatment % ALIGNMENTS.length];
  const classes = alignClasses(align);

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${surface}`}>
      {treatment > 0 && <TextureLayer persona={persona} index={treatment} />}
      {treatment > 0 && <GeoOrnament index={treatment + persona.textureShift} />}
      <div aria-hidden className="pointer-events-none absolute -top-24 right-[-20%] h-[60vh] w-[60vh] rounded-full bg-primary/10 blur-[110px]" />

      <div className="container relative py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={`flex flex-col gap-6 ${classes.wrapper}`}
        >
          <img
            src={logoAlivia}
            alt="Aliv.iA"
            className={`h-20 w-20 md:h-24 md:w-24 ${treatment === 0 ? "drop-shadow-[0_0_30px_hsl(var(--primary)/0.35)]" : ""}`}
          />

          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-primary md:text-xs">{kicker}</p>

          <h1 className="text-3xl font-bold leading-[1.12] tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {strong}
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-xl">
            {headline.rest}
          </p>

          <p className="text-sm font-medium text-primary md:text-base">{sub}</p>


          <div className={`mt-2 h-px w-24 bg-primary/50 ${align === "center" ? "mx-auto" : ""}`} />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroBlock;
