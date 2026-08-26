import { motion } from "framer-motion";
import { pickPhoto } from "../photos";
import { TextureLayer } from "./Texture";
import { personaSurface, pickHeadline, sectionHeight, type BlockProps } from "./shared";

/**
 * TIPOGRAFIA GIGANTE ATRÁS DO SUJEITO
 *
 * A palavra-chave ocupa a tela inteira e a foto real (fundo removido ou não)
 * entra por cima, recortada, criando profundidade editorial. Sem foto no
 * acervo do usuário o bloco não renderiza — nunca inventa imagem.
 */
const PhotoTypeBlock = ({ content, rng, treatment, format, persona, photos }: BlockProps) => {
  const photo = pickPhoto(photos, treatment + rng.int(3), ["institucional", "atendimento"]);
  if (!photo) return null;

  const headline = pickHeadline(rng, content.headlines, persona.headlineTaste);
  const word = headline.strong.split(/\s+/)[0]?.toUpperCase() ?? "ALIV.IA";
  const bottom = treatment % 2 === 0;

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
        <img
          src={photo.src}
          alt={photo.label || "Aliv.iA"}
          className={`w-full max-w-[86%] object-cover ${bottom ? "max-h-[62svh] rounded-t-[2rem]" : "max-h-[56svh] rounded-[2rem]"}`}
        />

        <div className="w-full px-6 pb-10 pt-5 text-center">
          <h2 className="mx-auto max-w-xl text-lg font-bold leading-tight tracking-tight text-foreground md:text-2xl">
            {headline.strong}
          </h2>
          {photo.credit && (
            <p className="mt-3 text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{photo.credit}</p>
          )}
        </div>
      </motion.div>
    </section>
  );
};

export default PhotoTypeBlock;
