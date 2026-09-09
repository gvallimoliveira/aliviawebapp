import { motion } from "framer-motion";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { GeoOrnament, TextureLayer } from "./Texture";
import { sentenceLead } from "../typographyGuards";

/**
 * Typo block — tipografia como arte: uma frase enorme com uma palavra em destaque.
 * A variação vem da persona (trama geométrica + superfície rotacionadas) e do
 * tratamento do destaque: cor teal, contorno vazado, sublinhado grosso ou
 * chips contrastantes (teal, tinta, areia) — sempre cores Aliv.iA ou neutras.
 */
const ACCENTS = [
  "text-primary",
  "text-transparent [-webkit-text-stroke:2px_hsl(var(--primary))]",
  "text-foreground underline decoration-primary decoration-[6px] underline-offset-8",
  "relative inline-block rounded-2xl bg-primary px-[0.25em] py-[0.08em] leading-[1.05] text-primary-foreground box-decoration-clone",
  "relative inline-block rounded-2xl bg-foreground px-[0.25em] py-[0.08em] leading-[1.05] text-background box-decoration-clone",
  "relative inline-block rounded-2xl bg-accent px-[0.25em] py-[0.08em] leading-[1.05] text-accent-foreground box-decoration-clone",
] as const;

const TypoBlock = ({ content, treatment, format, persona }: BlockProps) => {
  const typo = content.typos[treatment % content.typos.length];
  /**
   * INÍCIO, MEIO E FIM
   *
   * A arte tipográfica sempre fecha: abertura em caixa de frase, destaque e
   * fecho de leitura. Cauda que só tinha pontuação virava um ponto solto numa
   * linha — agora ela é descartada e o fecho vem do convite da marca.
   */
  const lead = sentenceLead(typo.lead);
  const hasTail = /\p{L}/u.test(typo.tail ?? "");
  const tail = hasTail ? typo.tail : ".";
  const closing = content.sales.ctas[0] ?? content.closings[0]?.title ?? "";
  const accentIndex = treatment % ACCENTS.length;
  const accentClass = ACCENTS[accentIndex];
  // Contorno vazado (índice 1): marcado para ser repintado no export de imagem.
  const isStroke = accentIndex === 1;

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
      <TextureLayer persona={persona} index={treatment} />
      {treatment % 2 === 0 && <GeoOrnament index={treatment + persona.textureShift} />}
      <div className="container relative py-20">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl"
        >
          <p className="text-4xl font-bold leading-[1.2] tracking-tight text-foreground md:text-7xl">
            {lead && <span>{lead} </span>}
            <span className={accentClass} data-studio-stroke={isStroke ? "1" : undefined}>
              {typo.big}
            </span>
            <span>{tail}</span>
          </p>
          {closing && (
            <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {closing}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default TypoBlock;
