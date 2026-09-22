import { motion } from "framer-motion";
import { pickPhotoForTopics } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";
import PhotoMissingFallback from "./PhotoMissingFallback";
import { renderAccent } from "./Texture";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";

/**
 * MEIA-FACE / SPLIT VERTICAL
 *
 * A foto é cortada por um painel vertical: metade imagem, metade cor sólida da
 * marca, com a frase atravessando a divisão. Referência editorial "who are
 * you?" — funciona melhor com retrato.
 *
 * NEXO: assunto decidido pela copy (picker) e foto escolhida por afinidade
 * extrapolada. Sem foto com nexo, não entra na composição.
 */
const PhotoSplitBlock = ({ content, rng, treatment, format, persona, picker, photos, artKey, shot }: BlockProps) => {
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

  /** Só o pedaço forte: frase longa atravessando a foto fica ilegível. */
  const phrase = (item.headline ?? item.title).replace(/[.]$/, "").trim();
  const photoLeft = treatment % 2 === 0;

  return (
    <section className={`relative flex ${sectionHeight(format)} overflow-hidden ${personaSurface(persona, treatment)}`}>
      <div className={`absolute inset-0 flex ${photoLeft ? "" : "flex-row-reverse"}`}>
        <div className="relative w-1/2 overflow-hidden">
          <PhotoFrame photo={photo} className="h-full w-full" />
          <div className="absolute inset-0 bg-foreground/10" />
        </div>
        <div className="w-1/2 bg-foreground/95" />
      </div>

      <motion.div
        initial={{ opacity: 0, x: photoLeft ? 24 : -24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full flex-col justify-center px-6 py-16"
      >
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-background/80">
          {item.tag}
        </p>
        <h2
          className="max-w-[92%] font-black uppercase leading-[0.94] tracking-[-0.02em] text-background drop-shadow-[0_2px_10px_hsl(var(--foreground)/0.6)]"
          style={{ fontSize: "clamp(1.6rem, 7vw, 3.4rem)" }}
        >
          {renderAccent(phrase, treatment)}
        </h2>
        <p className="mt-6 max-w-sm self-end rounded-md bg-background/95 px-3 py-2 text-right text-[11px] font-medium leading-relaxed text-foreground shadow-sm md:text-sm">
          {item.description}
        </p>
      </motion.div>
    </section>
  );
};

export default PhotoSplitBlock;
