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
import { BRAND_HANDLE, BRAND_LOGO, BRAND_NAME } from "../brand";
import { carouselTweetCopy } from "../typographyGuards";

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

const pickCarousel = <T,>(items: T[], script: number): T => items[script % items.length];

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
      alt={`Tela de ${BRAND_NAME}`}
      className="mt-6 max-h-[34vh] w-auto max-w-full rounded-2xl border border-border shadow-sm md:max-w-md"
    />
  );
};

const TweetVerified = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="h-[1em] w-[1em] shrink-0 text-primary">
    <path
      fill="currentColor"
      d="M12 1.5l2.4 1.9 3-.4 1.1 2.9 2.6 1.6-.8 2.9.8 2.9-2.6 1.6-1.1 2.9-3-.4L12 22.5l-2.4-1.9-3 .4-1.1-2.9-2.6-1.6.8-2.9-.8-2.9L5.5 6.9 6.6 4l3 .4L12 1.5zm-1.3 13.6l5.3-5.3-1.3-1.4-4 4-2-2-1.4 1.4 3.4 3.3z"
    />
  </svg>
);

const TWEET_ACTION_PATHS = [
  "M4 4h16v11H9l-5 4V4z",
  "M7 7h9l-3-3M17 17H8l3 3M17 7v10M7 17V7",
  "M12 20s-7-4.35-7-9a4 4 0 017-2.65A4 4 0 0119 11c0 4.65-7 9-7 9z",
  "M4 20V10M9.3 20V4M14.7 20v-7M20 20V7",
] as const;

const CarouselBlock = ({ content, rng, treatment, format, persona, slide }: BlockProps) => {
  const group = slide?.group ?? 0;
  const index = slide?.index ?? 0;
  const carousel = pickCarousel(content.carousels, slide?.script ?? group);

  /**
   * Roteiro: capa = 0, miolo = 1..n, CTA = último. O total precisa ser o MESMO
   * que a composição expandiu (`slide.total`); calcular pelo roteiro fazia a
   * arte anunciar 7 peças quando o scroll entregava 6.
   */
  const total = slide?.total ?? carousel.slides.length + 2;
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

  if (treatment === 3) {
    // Palco central: marca pequena no topo, headline gigante centrada, pill de CTA.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <div className="container relative flex h-full flex-col py-16">
          <div className="flex items-center justify-center gap-2">
            <img src={BRAND_LOGO} alt="" aria-hidden className="h-6 w-6" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{BRAND_NAME}</span>
          </div>
          <motion.div {...anim} className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              {carousel.kicker} · {counter}
            </p>
            {isCover && (
              <>
                <h2 className="max-w-3xl text-3xl font-bold leading-[1.1] tracking-tight text-foreground md:text-6xl">
                  {renderAccent(carousel.title, accentVariant)}
                </h2>
                <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">{carousel.coverSub}</p>
              </>
            )}
            {middle && (
              <>
                <h2 className="max-w-3xl text-2xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
                  {renderAccent(middle.heading, accentVariant)}
                </h2>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{middle.body}</p>
                <SlideImage topic={middle.topic} />
              </>
            )}
            {isCta && (
              <>
                <h2 className="max-w-3xl text-3xl font-bold leading-[1.1] tracking-tight text-foreground md:text-5xl">
                  {renderAccent(carousel.cta.title, accentVariant)}
                </h2>
                <p className="mt-5 max-w-xl text-lg text-muted-foreground md:text-xl">{carousel.cta.sub}</p>
                <span className="mt-8 inline-flex items-center rounded-full border-2 border-foreground px-8 py-3 text-sm font-bold uppercase tracking-[0.18em] text-foreground">
                  link na bio
                </span>
              </>
            )}
          </motion.div>
          <div className="flex items-center justify-between">
            <Dots total={total} active={index} />
            {!isCta ? (
              <span className="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                arraste →
              </span>
            ) : (
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{BRAND_NAME}</span>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (treatment === 4) {
    /**
     * Glossário em cartão (referência: cartões de cantos arredondados
     * alternando claro/escuro, número no topo, termo em pill e setas no pé).
     */
     const inverted = index % 2 === 1;
    const cardBg = inverted ? "hsl(var(--foreground))" : "hsl(var(--background))";
    const cardInk = inverted ? "hsl(var(--background))" : "hsl(var(--foreground))";
    const pillBg = inverted ? "hsl(var(--background))" : "hsl(var(--foreground))";
    const pillInk = inverted ? "hsl(var(--foreground))" : "hsl(var(--background))";
    const label = middle ? middle.heading : isCover ? carousel.title : carousel.cta.title;
    const body = middle ? middle.body : isCover ? carousel.coverSub : carousel.cta.sub;

    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <div className="relative h-full w-full p-[4%]">
          <div
            className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[2.2rem] px-[9%] text-center"
            style={{ backgroundColor: cardBg, color: cardInk }}
          >
            {/* Cantos arredondados fantasmas, como no template de referência. */}
            <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-8 opacity-25">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="absolute block rounded-[1.6rem] border"
                  style={{
                    width: `${90 + i * 46}px`,
                    height: `${90 + i * 46}px`,
                    borderColor: cardInk,
                    opacity: 0.5,
                    bottom: `${i * 12}px`,
                    left: `${i * 12}px`,
                  }}
                />
              ))}
            </div>

            <motion.div {...anim} className="relative flex w-full max-w-sm flex-col items-center">
              {isCover ? (
                <>
                  <span className="text-5xl font-light leading-none md:text-7xl">{carousel.slides.length}</span>
                  <span aria-hidden className="my-4 block h-px w-16" style={{ backgroundColor: cardInk }} />
                  <h2 className="text-xl font-normal leading-snug md:text-3xl">{carousel.title}</h2>
                  <p className="mt-4 text-sm leading-relaxed opacity-75 md:text-base">{carousel.coverSub}</p>
                </>
              ) : (
                <>
                  {middle && <span className="text-2xl font-semibold leading-none md:text-4xl">{index}</span>}
                  <span
                    className="mt-4 inline-block rounded-full px-5 py-2 text-sm font-bold uppercase tracking-[0.08em] md:text-lg"
                    style={{ backgroundColor: pillBg, color: pillInk }}
                  >
                    {label}
                  </span>
                  <p className="mt-6 text-sm leading-relaxed opacity-80 md:text-base">{body}</p>
                  {isCta && (
                    <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70">{BRAND_NAME}</p>
                  )}
                </>
              )}
            </motion.div>

            {!isCta && (
              <span
                aria-hidden
                className="absolute bottom-[6%] right-[8%] text-lg font-bold tracking-[-0.1em] opacity-70"
              >
                &gt;&gt;&gt;
              </span>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (treatment === 5) {
    /**
     * Editorial escuro numerado (referência: capa com número fantasma e
     * "veja mais", miolo 01/02/03 e fecho em cartão de mensagem).
     */
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden bg-foreground text-background`}>
        <TextureLayer persona={persona} index={treatment} dark />
        <div className="container relative flex h-full flex-col justify-center px-[8%] py-[9%]">
          {isCover && (
            <motion.div {...anim} className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-2 -top-6 select-none font-bold leading-none text-background/15"
                style={{ fontSize: "clamp(6rem, 34vw, 14rem)" }}
              >
                {carousel.slides.length}
              </span>
              <h2 className="relative text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl">
                {renderAccent(carousel.title, accentVariant)}
              </h2>
              <p className="relative mt-5 max-w-md text-base text-background/70 md:text-lg">{carousel.coverSub}</p>
              <p className="relative mt-10 text-sm font-semibold italic text-background/80">veja mais →</p>
            </motion.div>
          )}

          {middle && (
            <motion.div {...anim}>
              <span className="block text-4xl font-bold leading-none text-background/35 md:text-6xl">
                {bigIndex(index - 1)}
              </span>
              <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight md:text-4xl">
                {renderAccent(middle.heading, accentVariant)}
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-background/75 md:text-base">{middle.body}</p>
            </motion.div>
          )}

          {isCta && (
            <motion.div {...anim} className="rounded-2xl bg-background/10 p-5 backdrop-blur-sm md:p-7">
              <div className="flex items-center gap-3">
                <img src={BRAND_LOGO} alt="" aria-hidden className="h-9 w-9 rounded-full object-contain ring-1 ring-background/30" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{BRAND_NAME}</p>
                  <p className="truncate text-xs text-background/60">{BRAND_HANDLE}</p>
                </div>
              </div>
              <p className="mt-4 text-lg font-semibold italic leading-snug md:text-2xl">{carousel.cta.title}</p>
              <p className="mt-2 text-sm text-background/75 md:text-base">{carousel.cta.sub}</p>
            </motion.div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Dots total={total} active={index} dark />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/50">
              {counter}
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (treatment === 6) {
    /**
     * Fio de posts: o mesmo roteiro indivisível do carrossel ganha a linguagem
     * visual do mockup de tweet. Cada slide mantém uma ideia curta e completa;
     * capa abre a tese, miolo desenvolve e o último post fecha com a ação.
     */
    const rawTitle = middle ? middle.heading : isCover ? carousel.title : carousel.cta.title;
    const rawSupport = middle ? middle.body : isCover ? carousel.coverSub : carousel.cta.sub;
    const post = carouselTweetCopy(rawTitle, rawSupport);
    const dark = (group + index) % 2 === 0;
    const stage = dark ? "hsl(var(--muted))" : "hsl(var(--primary))";
    const cardBg = dark ? "hsl(var(--foreground))" : "hsl(var(--background))";
    const cardText = dark ? "hsl(var(--background))" : "hsl(var(--foreground))";
    const meta = dark ? "hsl(var(--background) / 0.62)" : "hsl(var(--foreground) / 0.58)";
    const hair = dark ? "hsl(var(--background) / 0.18)" : "hsl(var(--foreground) / 0.14)";
    const baseCount = post.title.length + post.support.length + group + index * 11;
    const counts = [
      String(8 + (baseCount % 37)),
      String(3 + (baseCount % 19)),
      String(40 + (baseCount % 430)),
      `${1 + (baseCount % 8)},${1 + (index % 8)} mil`,
    ];
    const hour = `${8 + (baseCount % 12)}:${String(10 + (baseCount % 48)).padStart(2, "0")}`;

    return (
      <section
        className={`relative flex ${sectionHeight(format)} items-center justify-center overflow-hidden`}
        style={{ backgroundColor: stage }}
      >
        <TextureLayer persona={persona} index={treatment + group} dark={dark} />
        <div className="container relative flex h-full flex-col justify-center px-[7%] py-[8%]">
          <motion.article
            {...anim}
            className="mx-auto flex w-full max-w-xl flex-col rounded-[1.6rem] p-[7%] shadow-lg"
            style={{ backgroundColor: cardBg, color: cardText }}
          >
            <header className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full md:h-14 md:w-14"
                style={{ backgroundColor: dark ? "hsl(var(--background) / 0.12)" : "hsl(var(--secondary))" }}
              >
                <img src={BRAND_LOGO} alt="" aria-hidden className="h-3/4 w-3/4 object-contain" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-base font-bold leading-tight md:text-lg">
                  <span className="truncate">{BRAND_NAME}</span>
                  <TweetVerified />
                </p>
                <p className="truncate text-sm md:text-base" style={{ color: meta }}>{BRAND_HANDLE}</p>
              </div>
            </header>

            <div className="my-auto py-[8%]">
              <p className="break-words text-xl font-semibold leading-[1.25] [overflow-wrap:anywhere] md:text-3xl">
                {post.title}
              </p>
              {post.support && (
                <p className="mt-4 break-words text-base leading-[1.45] [overflow-wrap:anywhere] md:text-xl">
                  {post.support}
                </p>
              )}
            </div>

            <p className="text-xs md:text-sm" style={{ color: meta }}>
              {hour} · Fio {index + 1}/{total} · {isCta ? "Conclusão" : isCover ? "Ideia central" : carousel.kicker}
            </p>
            <div aria-hidden className="my-4 h-px w-full" style={{ backgroundColor: hair }} />
            <div className="flex items-center justify-between" style={{ color: meta }}>
              {TWEET_ACTION_PATHS.map((d, actionIndex) => (
                <span key={d} className="flex items-center gap-1.5 text-xs md:text-sm">
                  <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 md:h-5 md:w-5">
                    <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {counts[actionIndex]}
                </span>
              ))}
            </div>
          </motion.article>
          <div className="mx-auto mt-5 flex w-full max-w-xl items-center justify-between">
            <Dots total={total} active={index} dark={dark} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: dark ? cardText : "hsl(var(--primary-foreground))" }}>
              {isCta ? BRAND_NAME : "continue →"}
            </span>
          </div>
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
