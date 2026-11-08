import { motion } from "framer-motion";
import { pickPhotoForTopics } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";
import PhotoMissingFallback from "./PhotoMissingFallback";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";
import { onPhotoTextStyle, photoTextPlate } from "../typographyGuards";

/**
 * FOTO COMO PLANO DE FUNDO (véu translúcido)
 *
 * Mesmo tratamento nascido no modo autoral, agora disponível como MODELO para
 * qualquer marca: a foto do acervo vira plano de fundo com brilho reduzido,
 * uma película translúcida levemente escurecida por cima, e o texto sempre
 * claro destacado à frente.
 *
 * Não substitui os blocos em que a foto é elemento de primeira camada
 * (`photoType`, `photoSplit`, `photoPortrait`, `stage`) — é uma opção a mais.
 *
 * Tratamentos: variam APENAS a ancoragem/alinhamento do texto (rodapé,
 * topo, centro) e a intensidade do véu. A foto é SEMPRE sangrada de borda a
 * borda — é ela a protagonista da arte, como no modo autoral.
 */
const PhotoVeilBlock = ({ content, rng, treatment, format, persona, picker, photos, artKey, shot }: BlockProps) => {
  const [item] = picker.pick(content.features, 1, rng, (f) => [f.topic]);
  const photo = pickPhotoForTopics(photos, treatment + rng.int(5), [item.topic], undefined, artKey, shot?.affinity);
  if (!photo) {
    return (
      <PhotoMissingFallback
        format={format}
        persona={persona}
        treatment={treatment}
        tag={item.tag}
        title={item.headline ?? item.title}
        description={item.description}
      />
    );
  }

  /** 0 rodapé, 1 rodapé à esquerda, 2 topo, 3 centro. */
  const anchor = treatment % 4;
  const centered = anchor === 3 || anchor === 0;
  const justify = anchor === 2 ? "items-start" : anchor === 3 ? "items-center" : "items-end";
  const sub = item.description;
  const kicker = rng.pick(content.kickers);

  /**
   * Película de leitura: sempre forte o suficiente para o texto claro ficar
   * legível, independente da foto (ver `typographyGuards`).
   */
  const veil = photoTextPlate(anchor === 2 ? "top" : anchor === 3 ? "center" : "bottom");

  return (
    <section
      data-studio-photo-background="1"
      className={`relative flex ${sectionHeight(format)} ${justify} overflow-hidden`}
      style={{ backgroundColor: "hsl(var(--studio-deep-surface, var(--primary)))" }}
    >
      {/* Foto sangrada: ocupa o quadro inteiro em qualquer formato. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <PhotoFrame
          photo={photo}
          className="h-full w-full rounded-none"
          imgClassName="opacity-90 brightness-[0.82] saturate-[0.85] contrast-[1.02]"
        />
      </div>

      {/* Película: fica ACIMA da foto e ABAIXO do texto. Na exportação a foto é
          composta por baixo do raster, então esta camada escurece apenas a
          foto — o texto sai com brilho total. */}

      <div
        aria-hidden
        data-studio-overlay="1"
        className="pointer-events-none absolute inset-0"
        style={veil}
      />

      <div className={`container relative ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl text-left"}
          style={onPhotoTextStyle("#f8f6f1")}
        >
          <p
            className="mb-4 text-[10px] font-semibold uppercase tracking-[0.32em]"
            style={{ color: "rgba(245,245,244,0.72)" }}
          >
            {kicker}
          </p>

          <h2
            className="font-semibold tracking-tight text-inherit"
            style={{ fontSize: "clamp(1.9rem, 8vw, 4.2rem)", lineHeight: 1.05 }}
          >
            {item.headline ?? item.title}
          </h2>

          <p
            className="mt-6 max-w-xl text-sm leading-relaxed md:text-base"
            style={{ color: "rgba(245,245,244,0.88)", marginInline: centered ? "auto" : undefined }}
          >
            {sub}
          </p>

          {photo.credit && (
            <p
              className="mt-8 text-[9px] uppercase tracking-[0.3em]"
              style={{ color: "rgba(245,245,244,0.55)" }}
            >
              {photo.credit}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default PhotoVeilBlock;
