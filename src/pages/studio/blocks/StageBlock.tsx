import { motion } from "framer-motion";
import { pickPhotoForTopics } from "../photoMeaning";
import { BRAND_HANDLE, BRAND_LOGO, BRAND_NAME, BRAND_SITE } from "../brand";
import PhotoFrame from "./PhotoFrame";
import { frameHeight, personaSurface, sectionHeight, type BlockProps } from "./shared";

/**
 * Triângulo invertido com vértices arredondados ("abrindo para fora da tela").
 * Aplicado como máscara CSS via SVG data-URI para escalar com o frame e
 * sobreviver à exportação PNG (rasterizada pelo próprio navegador).
 */
const POPOUT_TRIANGLE_MASK =
  "url(\"data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
      '<path d="M12 0 L88 0 Q100 0 94.6 11.3 L55.4 88.7 Q50 100 44.6 88.7 L5.4 11.3 Q0 0 12 0 Z" fill="black"/>' +
      "</svg>",
  ) +
  "\")";

/**
 * PESSOA SOBRE O CELULAR (referência: modelo em pé no topo do celular com o
 * perfil da marca aberto)
 *
 * A pessoa do acervo aparece de pé sobre um celular deitado em perspectiva,
 * com o perfil social / site da marca na tela. Serve de convite: "começa por
 * aqui". Sem foto no acervo o bloco não renderiza — nunca inventa figura.
 *
 * Tratamentos: 0 tela de perfil social (@handle) · 1 tela do site.
 */
const StageBlock = ({ content, rng, treatment, format, persona, picker, photos }: BlockProps) => {
  const [feature] = picker.pick(content.features, 1, rng, (f) => [f.topic]);
  const photo = pickPhotoForTopics(photos, treatment + rng.int(5), [feature.topic]);
  if (!photo) return null;

  const showSite = treatment % 2 === 1;
  const headline = rng.pick(content.headlines);
  const highlights = content.marquee.flat().slice(0, 4);
  // Altura percentual do quadro: acompanha o formato em vez da tela do aparelho.
  const popoutHeight = frameHeight(format, { "9x16": 37, "4x5": 35, "1x1": 27 });

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden ${personaSurface(
        persona,
        treatment + 2,
      )}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 60% at 50% 25%, hsl(var(--background) / 0.85), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-[340px] flex-col items-center px-6 py-12"
      >
        <div className="flex w-full items-start justify-between gap-3">
          <p className="max-w-[45%] text-lg font-bold leading-tight tracking-tight text-primary md:text-2xl">
            {headline.strong}
          </p>
          <p className="max-w-[45%] text-right text-lg font-light italic leading-tight text-primary underline decoration-primary/60 underline-offset-4 md:text-2xl">
            {headline.rest}
          </p>
        </div>

        {/* Palco: imagem "saindo" da tela em triângulo invertido arredondado. */}
        <div className="relative mt-6 w-full">
          <div
            className="relative z-20 mx-auto w-[52%]"
            style={{
              ...popoutHeight,
              WebkitMaskImage: POPOUT_TRIANGLE_MASK,
              maskImage: POPOUT_TRIANGLE_MASK,
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              filter: "drop-shadow(0 26px 28px hsl(var(--foreground) / 0.35))",
            }}
          >

            <PhotoFrame photo={photo} className="h-full w-full" />
          </div>

          {/* Celular deitado em perspectiva, com o perfil da marca. */}
          <div
            className="-mt-4 rounded-[26px] border border-border bg-foreground/90 p-[7px] shadow-[0_50px_90px_-50px_hsl(var(--foreground)/0.85)]"
            style={{ transform: "perspective(700px) rotateX(52deg)", transformOrigin: "top center" }}
          >
            <div className="overflow-hidden rounded-[20px] bg-background px-3 pb-4 pt-3">
              <div className="flex items-center gap-2">
                <img src={BRAND_LOGO} alt="" className="h-6 w-6 rounded-full object-contain ring-2 ring-primary/50" />
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-semibold text-foreground">
                    {showSite ? BRAND_SITE : BRAND_HANDLE}
                  </p>
                  <p className="truncate text-[8px] text-muted-foreground">{BRAND_NAME}</p>
                </div>
                <span className="ml-auto rounded-md bg-primary px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.16em] text-primary-foreground">
                  {showSite ? "Abrir" : "Seguir"}
                </span>
              </div>

              <p className="mt-2 line-clamp-2 text-[8px] leading-snug text-muted-foreground">
                {feature.description}
              </p>

              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {highlights.map((word, i) => (
                  <div
                    key={`${word}-${i}`}
                    className="rounded-md border border-border bg-secondary/40 px-1 py-2 text-center text-[6px] uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    <span className="line-clamp-2">{word}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default StageBlock;
