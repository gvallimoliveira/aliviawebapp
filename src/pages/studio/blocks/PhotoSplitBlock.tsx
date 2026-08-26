import { motion } from "framer-motion";
import { pickPhoto } from "../photos";
import { renderAccent } from "./Texture";
import { personaSurface, pickHeadline, sectionHeight, type BlockProps } from "./shared";

/**
 * MEIA-FACE / SPLIT VERTICAL
 *
 * A foto é cortada por um painel vertical: metade imagem, metade cor sólida da
 * marca, com a frase atravessando a divisão. Referência editorial "who are
 * you?" — funciona melhor com retrato. Sem foto, não entra na composição.
 */
const PhotoSplitBlock = ({ content, rng, treatment, format, persona, photos }: BlockProps) => {
  const photo = pickPhoto(photos, treatment + rng.int(5), ["institucional", "atendimento"]);
  if (!photo) return null;

  const headline = pickHeadline(rng, content.headlines, persona.headlineTaste);
  /** Só o pedaço forte da headline: frase longa atravessando a foto fica ilegível. */
  const phrase = headline.strong.replace(/[.]$/, "").trim();
  const photoLeft = treatment % 2 === 0;

  return (
    <section className={`relative flex ${sectionHeight(format)} overflow-hidden ${personaSurface(persona, treatment)}`}>
      <div className={`absolute inset-0 flex ${photoLeft ? "" : "flex-row-reverse"}`}>
        <div className="relative w-1/2 overflow-hidden">
          <img src={photo.src} alt={photo.label || "Aliv.iA"} className="h-full w-full object-cover" />
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
          {rng.pick(content.kickers)}
        </p>
        <h2
          className="max-w-[92%] font-black uppercase leading-[0.94] tracking-[-0.02em] text-background drop-shadow-[0_2px_10px_hsl(var(--foreground)/0.6)]"
          style={{ fontSize: "clamp(1.6rem, 7vw, 3.4rem)" }}
        >
          {renderAccent(phrase, treatment)}
        </h2>
        <p className="mt-6 max-w-sm self-end text-right text-[11px] leading-relaxed text-background/85 md:text-sm">
          {headline.rest}
        </p>
      </motion.div>
    </section>
  );
};

export default PhotoSplitBlock;
