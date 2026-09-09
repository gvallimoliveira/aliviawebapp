import { motion } from "framer-motion";
import { pickPhotoForTopics } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";
import { TextureLayer } from "./Texture";
import { frameHeight, personaSurface, sectionHeight, type BlockProps } from "./shared";

/**
 * TIPOGRAFIA GIGANTE ATRÁS DO SUJEITO
 *
 * A palavra-chave ocupa a tela inteira e a foto real (fundo removido ou não)
 * entra por cima, recortada, criando profundidade editorial.
 *
 * NEXO FOTO × ASSUNTO: a copy vem primeiro (picker/cobertura editorial) e a
 * foto é escolhida por afinidade extrapolada com aquele assunto
 * (`pickPhotoForTopics`). Foto sem nexo ⇒ bloco não renderiza. O label da foto
 * nunca vira título — arte literal ("AGACHAMENTO COM BARRA") é proibida.
 */
const PhotoTypeBlock = ({ content, rng, treatment, format, persona, picker, photos, artKey, shot }: BlockProps) => {
  const [item] = picker.pick(content.features, 1, rng, (f) => [f.topic]);
  const photo = pickPhotoForTopics(photos, treatment + rng.int(3), [item.topic], undefined, artKey, shot?.affinity);
  if (!photo) return null;

  /** Palavra-cartaz: a mais forte do assunto, nunca o nome do que está na foto. */
  const word = [...item.title.split(/\s+/)].sort((a, b) => b.length - a.length)[0]?.toUpperCase() ?? "MARCA";
  const bottom = treatment % 2 === 0;
  // Altura percentual do quadro: a faixa da foto acompanha o formato.
  const photoHeight = bottom
    ? frameHeight(format, { "9x16": 45, "4x5": 47, "1x1": 39 })
    : frameHeight(format, { "9x16": 40, "4x5": 42, "1x1": 35 });

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-end overflow-hidden ${personaSurface(persona, treatment)}`}
    >
      <TextureLayer persona={persona} index={treatment + 2} />

      {/* Palavra-cartaz: fica atrás do sujeito e sangra nas laterais. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[14%] z-0 select-none text-center font-black uppercase leading-[0.8] tracking-[-0.04em] text-primary/25"
        style={{ fontSize: "clamp(4.5rem, 26vw, 15rem)" }}
      >
        {word}
      </span>

      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full flex-col items-center"
      >
        <PhotoFrame
          photo={photo}
          className="w-full max-w-[86%] rounded-[2rem]"
          style={photoHeight}
        />

        <div className="w-full px-6 pb-10 pt-5 text-center">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">{item.tag}</p>
          <h2 className="mx-auto max-w-xl text-lg font-bold leading-tight tracking-tight text-foreground md:text-2xl">
            {item.headline ?? item.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[11px] leading-relaxed text-muted-foreground md:text-sm">
            {item.description}
          </p>
          {photo.credit && (
            <p className="mt-3 text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{photo.credit}</p>
          )}
        </div>
      </motion.div>
    </section>
  );
};

export default PhotoTypeBlock;
