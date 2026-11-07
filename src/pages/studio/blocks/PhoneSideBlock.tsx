import { motion } from "framer-motion";
import { BRAND_LOGO, BRAND_NAME, BRAND_SITE } from "../brand";
import { pickPhotoForTopics, pickScreenPhoto } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";

/**
 * MOCKUP LADO A LADO (referência: celular à esquerda com a cena na tela e o
 * texto explicativo à direita, com título, parágrafo e chamada)
 *
 * Mantém o enquadramento da referência: aparelho inteiro em pé, notch e botões
 * laterais visíveis, sombra suave, e a coluna de texto alinhada pelo topo com
 * kicker, título, explicação e CTA. Em formatos estreitos (story/1x1) a coluna
 * desce para baixo do aparelho — mesmo layout, sem esmagar a leitura.
 *
 * A tela mostra uma foto do acervo quando existe; sem acervo, uma maquete
 * tipográfica com o próprio conteúdo editorial da marca.
 *
 * Tratamentos: 0 fundo claro/aparelho à esquerda, 1 fundo escuro/aparelho à
 * direita, 2 chapa da cor primária/aparelho à esquerda.
 */

const PhoneSideBlock = ({ content, rng, treatment, format, picker, photos, artKey, shot }: BlockProps) => {
  const [feature] = picker.pick(content.features, 1, rng, (f) => [f.topic]);
  if (!feature) return null;
  const closing = rng.pick(content.closings);
  const seed = treatment + rng.int(7);
  const screenPhoto = pickScreenPhoto(photos, seed, [feature.topic], artKey, shot?.affinity);
  const photo = screenPhoto ?? pickPhotoForTopics(photos, seed, [feature.topic], undefined, artKey, shot?.affinity);

  const dark = treatment === 1;
  const stage = dark ? "hsl(var(--foreground))" : treatment === 2 ? "hsl(var(--primary))" : "hsl(var(--background))";
  const text = dark || treatment === 2 ? "hsl(var(--background))" : "hsl(var(--foreground))";
  const soft = dark || treatment === 2 ? "hsl(var(--background) / 0.72)" : "hsl(var(--foreground) / 0.68)";
  const ctaBg = treatment === 2 ? "hsl(var(--background))" : "hsl(var(--primary))";
  const ctaText = treatment === 2 ? "hsl(var(--primary))" : "hsl(var(--primary-foreground))";
  const flip = treatment === 1;

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden`}
      style={{ backgroundColor: stage }}
    >
      <div className={`container relative flex h-full flex-col justify-center ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className={`flex w-full flex-col items-center gap-[6%] md:flex-row md:items-center ${
            flip ? "md:flex-row-reverse" : ""
          }`}
          style={{ color: text }}
        >
          {/* Aparelho */}
          <div className="relative w-[46%] min-w-[38%] max-w-[240px] shrink-0">
            <div
              className="relative overflow-hidden rounded-[2rem] border-[6px] p-1 shadow-2xl"
              style={{
                borderColor: dark ? "hsl(var(--background) / 0.85)" : "hsl(var(--foreground))",
                backgroundColor: dark ? "hsl(var(--background) / 0.85)" : "hsl(var(--foreground))",
                aspectRatio: "9 / 19",
              }}
            >
              <div className="relative h-full w-full overflow-hidden rounded-[1.6rem] bg-background">
                {photo ? (
                  <PhotoFrame photo={screenPhoto ? { ...photo, safeArea: "none" } : photo} className="h-full w-full rounded-none" imgClassName="" exportLayer="foreground" />
                ) : (
                  <div className="flex h-full w-full flex-col p-3">
                    <div className="flex items-center gap-1.5">
                      <img src={BRAND_LOGO} alt="" aria-hidden className="h-3 w-3 object-contain" />
                      <span className="text-[7px] font-semibold uppercase tracking-[0.2em] text-foreground">
                        {BRAND_NAME}
                      </span>
                    </div>
                    <p className="mt-3 text-[10px] font-bold leading-tight text-foreground">{feature.title}</p>
                    <p className="mt-2 line-clamp-6 text-[7px] leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                    <div className="mt-auto rounded-md bg-primary px-2 py-1.5 text-center text-[7px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                      {closing.cta}
                    </div>
                  </div>
                )}
              </div>
              {/* Notch */}
              <span
                aria-hidden
                className="absolute left-1/2 top-[2%] h-[1.2%] w-[26%] -translate-x-1/2 rounded-full"
                style={{ backgroundColor: dark ? "hsl(var(--foreground) / 0.6)" : "hsl(var(--background) / 0.5)" }}
              />
            </div>
            {/* Botões laterais */}
            <span
              aria-hidden
              className="absolute -right-[3px] top-[24%] h-[12%] w-[3px] rounded-full"
              style={{ backgroundColor: dark ? "hsl(var(--background) / 0.5)" : "hsl(var(--foreground) / 0.6)" }}
            />
            <span
              aria-hidden
              className="absolute -left-[3px] top-[20%] h-[7%] w-[3px] rounded-full"
              style={{ backgroundColor: dark ? "hsl(var(--background) / 0.5)" : "hsl(var(--foreground) / 0.6)" }}
            />
          </div>

          {/* Coluna de texto */}
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] md:text-xs" style={{ color: soft }}>
              {feature.tag}
            </p>
            <h2 className="mt-2 break-words text-2xl font-bold leading-[1.12] tracking-tight [overflow-wrap:anywhere] md:text-4xl">
              {feature.headline ?? feature.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed md:text-lg" style={{ color: soft }}>
              {feature.description}
            </p>
            <span
              className="mt-5 inline-flex items-center rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] md:text-sm"
              style={{ backgroundColor: ctaBg, color: ctaText }}
            >
              {closing.cta}
            </span>
            {BRAND_SITE && (
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] md:text-xs" style={{ color: soft }}>
                {BRAND_SITE}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PhoneSideBlock;
