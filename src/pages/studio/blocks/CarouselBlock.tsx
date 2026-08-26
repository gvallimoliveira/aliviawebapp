import { motion } from "framer-motion";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import {
  ACCENT_STYLES,
  DARK_ACCENT_INDEXES,
  GeoOrnament,
  TextureLayer,
  renderAccent,
} from "./Texture";
import { imageForTopic, type TopicId } from "../topics";
import { BRAND_LOGO, BRAND_NAME } from "../brand";

/**
 * Carousel block — sequência de artes numeradas (capa → miolo → CTA final)
 * geradas a partir do mesmo roteiro (`content.carousels`). O compositor
 * expande UM bloco `carousel` em várias instâncias com `slide.index` fixo,
 * e a escolha do roteiro é estável por grupo: todos os slides da sequência
 * usam o mesmo carrossel, independente do índice.
 *
 * Contracto fixo: carrossel = 1 capa + 2-4 slides + 1 CTA.
 * Treatments: 0 moldura editorial clara, 1 revista escura, 2 card emoldurado,
 * 3 palco central (marca no topo, headline gigante, pill de CTA embaixo).
 */

const pickCarousel = <T,>(items: T[], group: number): T => items[group % items.length];

/** Número gigante do slide atual, usado como ornamentação em alguns treatments. */
const bigIndex = (index: number) => String(index + 1).padStart(2, "0");

const Dots = ({ total, active, dark }: { total: number; active: number; dark?: boolean }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }, (_, i) => (
      <span
        key={i}
        aria-hidden
        className={`h-1.5 rounded-full transition-all ${
          i === active ? "w-6 bg-primary" : dark ? "w-1.5 bg-background/30" : "w-1.5 bg-foreground/20"
        }`}
      />
    ))}
  </div>
);

const SlideImage = ({ topic }: { topic?: TopicId }) => {
  const src = topic ? imageForTopic(topic) : undefined;
  if (!src) return null;
  return (
    <img
      src={src}
      alt="Tela do Aliv.iA"
      className="mt-6 max-h-[34vh] w-auto max-w-full rounded-2xl border border-border shadow-sm md:max-w-md"
    />
  );
};

const CarouselBlock = ({ content, rng, treatment, format, persona, slide }: BlockProps) => {
  const group = slide?.group ?? 0;
  const index = slide?.index ?? 0;
  const carousel = pickCarousel(content.carousels, group);

  // Roteiro: capa = 0, miolo = 1..slides.length, CTA = slides.length + 1.
  const total = carousel.slides.length + 2;
  const isCover = index === 0;
  const isCta = index === total - 1;
  const middle = !isCover && !isCta ? carousel.slides[index - 1] : undefined;

  // Identidade visual estável por grupo: mesmo treatment + mesmo acento.
  const accentPool = treatment === 1 ? DARK_ACCENT_INDEXES : ACCENT_STYLES.map((_, i) => i);
  const accentVariant = accentPool[(group + treatment) % accentPool.length];

  const anim = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  };

  const counter = `${bigIndex(index)} / ${String(total).padStart(2, "0")}`;

  if (treatment === 1) {
    // Revista escura: sequência noturna, número fantasma gigante.
    const surface = "bg-foreground text-background";
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${surface}`}>
        <TextureLayer persona={persona} index={treatment} dark />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 bottom-0 select-none text-[12rem] font-bold leading-none text-background/10 md:text-[18rem]"
        >
          {bigIndex(index)}
        </span>
        <div className="container relative py-20">
          <motion.div {...anim} className="ml-0 max-w-3xl md:ml-[6%]">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-background/60">
              {carousel.kicker} · {counter}
            </p>
            {isCover && (
              <>
                <h2 className="mb-6 text-3xl font-bold leading-[1.12] tracking-tight md:text-6xl">
                  {renderAccent(carousel.title, accentVariant)}
                </h2>
                <p className="text-lg text-background/70 md:text-xl">{carousel.coverSub}</p>
              </>
            )}
            {middle && (
              <>
                <h2 className="mb-5 text-2xl font-bold leading-tight tracking-tight md:text-5xl">
                  {renderAccent(middle.heading, accentVariant)}
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-background/75 md:text-lg">{middle.body}</p>
                <div className="[&_img]:border-background/20">
                  <SlideImage topic={middle.topic} />
                </div>
              </>
            )}
            {isCta && (
              <>
                <img src={BRAND_LOGO} alt={BRAND_NAME} className="mb-6 h-12 w-12 md:h-14 md:w-14" />
                <h2 className="mb-4 text-3xl font-bold leading-[1.12] tracking-tight md:text-5xl">
                  {renderAccent(carousel.cta.title, accentVariant)}
                </h2>
                <p className="text-lg text-background/70 md:text-xl">{carousel.cta.sub}</p>
              </>
            )}
            <div className="mt-10 flex items-center gap-6">
              <Dots total={total} active={index} dark />
              {!isCta && <span className="text-xs font-semibold uppercase tracking-[0.24em] text-background/50">arraste →</span>}
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  if (treatment === 2) {
    // Card emoldurado: cada arte é um cartão central sobre fundo de trama.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <div className="container relative py-20">
          <motion.div
            {...anim}
            className="mx-auto max-w-2xl rounded-[2rem] border border-border bg-card p-8 shadow-sm md:p-12"
          >
            <div className="mb-6 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                {carousel.kicker}
              </p>
              <span className="text-sm font-bold tracking-tight text-primary">{counter}</span>
            </div>
            {isCover && (
              <>
                <h2 className="mb-6 text-3xl font-bold leading-[1.12] tracking-tight text-foreground md:text-5xl">
                  {renderAccent(carousel.title, accentVariant)}
                </h2>
                <p className="text-lg text-muted-foreground md:text-xl">{carousel.coverSub}</p>
              </>
            )}
            {middle && (
              <>
                <h2 className="mb-5 text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
                  {renderAccent(middle.heading, accentVariant)}
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground md:text-lg">{middle.body}</p>
                <SlideImage topic={middle.topic} />
              </>
            )}
            {isCta && (
              <div className="flex flex-col items-center text-center">
                <img src={BRAND_LOGO} alt={BRAND_NAME} className="mb-6 h-14 w-14" />
                <h2 className="mb-4 text-3xl font-bold leading-[1.12] tracking-tight text-foreground md:text-4xl">
                  {renderAccent(carousel.cta.title, accentVariant)}
                </h2>
                <p className="text-lg text-muted-foreground md:text-xl">{carousel.cta.sub}</p>
              </div>
            )}
            <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
              <Dots total={total} active={index} />
              {!isCta ? (
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">arraste →</span>
              ) : (
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{BRAND_NAME}</span>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  // Treatment 0 — moldura editorial clara: filete superior, contador, progresso.
  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
      <TextureLayer persona={persona} index={treatment} />
      <GeoOrnament index={treatment + persona.textureShift + index} />
      <div className="container relative py-20">
        <motion.div {...anim} className="ml-0 max-w-3xl border-t-4 border-primary pt-10 md:ml-[6%]">
          <div className="mb-5 flex items-center gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{carousel.kicker}</p>
            <span aria-hidden className="h-px flex-1 bg-border" />
            <span className="text-sm font-bold tracking-tight text-primary">{counter}</span>
          </div>
          {isCover && (
            <>
              <h2 className="mb-6 text-3xl font-bold leading-[1.12] tracking-tight text-foreground md:text-6xl">
                {renderAccent(carousel.title, accentVariant)}
              </h2>
              <p className="text-lg text-muted-foreground md:text-xl">{carousel.coverSub}</p>
            </>
          )}
          {middle && (
            <>
              <h2 className="mb-5 text-2xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
                {renderAccent(middle.heading, accentVariant)}
              </h2>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{middle.body}</p>
              <SlideImage topic={middle.topic} />
            </>
          )}
          {isCta && (
            <>
              <img src={BRAND_LOGO} alt={BRAND_NAME} className="mb-6 h-12 w-12 md:h-14 md:w-14" />
              <h2 className="mb-4 text-3xl font-bold leading-[1.12] tracking-tight text-foreground md:text-5xl">
                {renderAccent(carousel.cta.title, accentVariant)}
              </h2>
              <p className="text-lg text-muted-foreground md:text-xl">{carousel.cta.sub}</p>
            </>
          )}
          <div className="mt-10 flex items-center gap-6">
            <Dots total={total} active={index} />
            {!isCta && <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">arraste →</span>}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CarouselBlock;
