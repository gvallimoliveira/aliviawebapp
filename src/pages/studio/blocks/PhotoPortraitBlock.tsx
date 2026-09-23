import { motion } from "framer-motion";
import { pickPhotoForTopics } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";
import PhotoMissingFallback from "./PhotoMissingFallback";
import { renderAccent, TextureLayer } from "./Texture";
import { frameHeight, personaSurface, sectionHeight, type BlockProps } from "./shared";
import { quoteCopy } from "../typographyGuards";

/**
 * RETRATO EDITORIAL COM DESTAQUE
 *
 * Foto vertical estreita ao centro, título grande acima e um parágrafo com
 * palavras-chave destacadas. É o formato de "capa de revista" — bom para
 * institucional (quem está por trás) e para registro real de atendimento.
 *
 * NEXO: o assunto vem da frase de impacto escolhida pelo picker; a foto entra
 * por afinidade extrapolada com esse assunto. O label da foto NUNCA é título.
 */
const PhotoPortraitBlock = ({ content, rng, treatment, format, persona, picker, photos, artKey, shot }: BlockProps) => {
  if (!content.quotes?.length || !content.kickers?.length || !content.subs?.length || !content.features?.length) return null;
  const [item] = picker.pick(content.quotes, 1, rng, (q) => [q.topic]);
  const photo = pickPhotoForTopics(photos, treatment + rng.int(7), [item.topic], undefined, artKey, shot?.affinity);
  if (!photo) {
    return (
      <PhotoMissingFallback
        format={format}
        persona={persona}
        treatment={treatment}
        tag={rng.pick(content.kickers)}
        title={item.text}
        description={rng.pick(content.subs)}
      />
    );
  }

  const quote = quoteCopy(item.text);
  const [feature] = picker.pick(content.features, 1, rng, (f) => [f.topic]);
  const title = (feature.headline ?? feature.title).toUpperCase();
  // Altura percentual do quadro (antes px/svh: achatava num formato e estourava no outro).
  const photoHeight = frameHeight(format, { "9x16": 42, "4x5": 40, "1x1": 32 });

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden ${personaSurface(persona, treatment)}`}
    >
      <TextureLayer persona={persona} index={treatment + 5} />

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full flex-col items-center px-6 py-14 text-center"
      >
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
          {rng.pick(content.kickers)}
        </p>

        <h2
          className="mb-6 font-black uppercase leading-[0.86] tracking-[-0.03em] text-foreground"
          style={{ fontSize: "clamp(2.2rem, 12vw, 5.5rem)" }}
        >
          {title}
        </h2>

        <PhotoFrame
          photo={photo}
          className="w-[58%] rounded-2xl border border-border shadow-[0_30px_70px_-40px_hsl(var(--foreground)/0.5)]"
          style={photoHeight}
        />

        <p className="mt-7 max-w-md text-[12px] leading-relaxed text-muted-foreground md:text-sm">
          {renderAccent(quote, treatment + 1)}
        </p>

        {photo.credit && (
          <p className="mt-4 text-[9px] uppercase tracking-[0.3em] text-muted-foreground/80">{photo.credit}</p>
        )}
      </motion.div>
    </section>
  );
};

export default PhotoPortraitBlock;
