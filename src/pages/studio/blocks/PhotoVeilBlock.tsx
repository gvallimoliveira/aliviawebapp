import { motion } from "framer-motion";
import { pickPhotoForTopics } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";

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
 * Tratamentos: 0 fundo total centralizado, 1 fundo total à esquerda,
 * 2 faixa inferior centralizada, 3 faixa inferior à esquerda.
 */
const PhotoVeilBlock = ({ content, rng, treatment, format, picker, photos }: BlockProps) => {
  const [item] = picker.pick(content.features, 1, rng, (f) => [f.topic]);
  const photo = pickPhotoForTopics(photos, treatment + rng.int(5), [item.topic]);
  if (!photo) return null;

  const partial = treatment >= 2;
  const centered = treatment % 2 === 0;
  const sub = item.description;
  const kicker = rng.pick(content.kickers);

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden`}
      style={{ backgroundColor: "#0c0c12" }}
    >
      {/* A foto é sempre camada absoluta atrás do texto — PhotoFrame é
          `relative`, então o enquadramento absoluto fica no wrapper. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 ${partial ? "bottom-0 h-[45%]" : "inset-y-0"}`}
      >
        <PhotoFrame
          photo={photo}
          className="h-full w-full rounded-none"
          imgClassName="opacity-50 brightness-[0.6] saturate-[0.6] contrast-[0.95]"
        />
      </div>

      {/* Película translúcida levemente escurecida: leitura garantida em
          qualquer foto, sem apagar a imagem. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: partial
            ? "linear-gradient(to top, rgba(8,8,12,0.82) 0%, rgba(8,8,12,0.55) 34%, rgba(8,8,12,0.25) 55%, rgba(8,8,12,0.55) 100%)"
            : "rgba(8,8,12,0.55)",
        }}
      />

      <div className={`container relative ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl text-left"}
          style={{ color: "#f5f5f4" }}
        >
          <p
            className="mb-4 text-[10px] font-semibold uppercase tracking-[0.32em]"
            style={{ color: "rgba(245,245,244,0.7)" }}
          >
            {kicker}
          </p>

          <h2
            className="font-semibold tracking-tight text-inherit"
            style={{ fontSize: "clamp(1.9rem, 8vw, 4.2rem)", lineHeight: 1.05 }}
          >
            {item.strong} {item.rest}
          </h2>

          <p
            className="mt-6 max-w-xl text-sm leading-relaxed md:text-base"
            style={{ color: "rgba(245,245,244,0.85)", marginInline: centered ? "auto" : undefined }}
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
