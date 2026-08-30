import { motion } from "framer-motion";
import { BRAND_HANDLE, BRAND_LOGO, BRAND_NAME } from "../brand";
import { pickPhotoForTopics } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";

/**
 * FRASE DE IMPACTO (referência: cartaz minimalista com um único elemento no
 * alto, nota pequena ao lado e frase gigante embaixo, assinatura no pé)
 *
 * Peça de PROVOCAÇÃO: pouquíssimo texto, muito branco (ou muito preto) e uma
 * frase curta que para o dedo. A nota pequena leva a condição/oferta e o pé
 * leva a assinatura da marca — o mesmo ritmo de leitura do template.
 *
 * Regra do formato: só funciona com frase curta. Se a frase disponível for
 * longa, o bloco recorta até o trecho de impacto; se nem assim couber, não
 * renderiza (melhor não existir do que sair atropelado).
 *
 * Tratamentos: 0 claro com foto no alto, 1 escuro com foto no alto,
 * 2 claro sem foto (frase sozinha + filete), 3 chapa da cor primária.
 */

/** Frase de impacto: corta na primeira pontuação e limita o comprimento. */
const punchOf = (raw: string): string | null => {
  const first = raw.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
  const clean = first.replace(/[.]+$/, "").trim();
  if (!clean) return null;
  const words = clean.split(/\s+/);
  const short = words.length > 6 ? words.slice(0, 6).join(" ") : clean;
  if (short.length > 42 || short.length < 6) return null;
  return short;
};

const PunchBlock = ({ content, rng, treatment, format, picker, photos }: BlockProps) => {
  const [item] = picker.pick(content.features, 1, rng, (f) => [f.topic]);

  /* Acervo de frases candidatas: headline curta, fala curta e fecho. */
  const candidates = [
    ...content.headlines.map((h) => `${h.strong} ${h.rest}`),
    ...content.headlines.map((h) => h.strong),
    ...(content.quotes ?? []).map((q) => q.text),
    ...content.closings.map((c) => c.title),
  ];
  const punches = candidates.map(punchOf).filter((t): t is string => Boolean(t));
  if (punches.length === 0) return null;
  const punch = rng.pick(punches);

  /* Nota pequena: condição de oferta, chamada ou apoio — sempre 1 linha curta. */
  const note =
    rng.pick([
      ...(content.sales?.offers ?? []),
      ...content.closings.map((c) => c.cta),
      ...content.subs,
    ]) ?? "";

  const dark = treatment === 1;
  const primary = treatment === 3;
  const withPhoto = treatment === 0 || treatment === 1;
  const photo = withPhoto
    ? pickPhotoForTopics(photos, treatment + rng.int(4), [item.topic])
    : null;

  const ink = dark ? "hsl(var(--background))" : primary ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))";
  const soft = dark
    ? "hsl(var(--background) / 0.66)"
    : primary
      ? "hsl(var(--primary-foreground) / 0.72)"
      : "hsl(var(--foreground) / 0.6)";
  const stage = dark
    ? "hsl(var(--foreground))"
    : primary
      ? "hsl(var(--primary))"
      : "hsl(var(--background))";

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center justify-center overflow-hidden`}
      style={{ backgroundColor: stage }}
    >
      <div className={`container relative flex h-full flex-col ${blockPadding(format)}`}>
        {/* ALTO: elemento único (foto em recorte) + nota pequena ao lado. */}
        <div className="relative flex flex-1 items-center justify-center">
          {photo ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-[78%] max-w-md"
            >
              <PhotoFrame
                photo={photo}
                className="h-full w-full rounded-[1.5rem]"
                imgClassName={dark ? "grayscale contrast-[1.05] brightness-[0.95]" : "grayscale contrast-[1.08]"}
              />
            </motion.div>
          ) : (
            /* Sem foto: um único gesto gráfico — arco fino, nada mais. */
            <div
              aria-hidden
              className="h-[52%] w-[62%] rounded-t-full border-t-2"
              style={{ borderColor: soft }}
            />
          )}

          <p
            className="absolute bottom-[6%] right-0 max-w-[42%] text-right text-[10px] leading-snug md:text-xs"
            style={{ color: soft }}
          >
            {note}
          </p>
        </div>

        {/* BAIXO: a frase gigante — protagonista absoluta da arte. */}
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-[6%] break-words text-center text-4xl font-black leading-[0.98] tracking-tight [overflow-wrap:anywhere] md:text-6xl"
          style={{ color: ink }}
        >
          {punch}
        </motion.h2>

        {/* PÉ: assinatura discreta da marca. */}
        <div className="mt-[6%] flex flex-col items-center gap-2">
          {BRAND_LOGO ? (
            <img src={BRAND_LOGO} alt={BRAND_NAME} className="h-9 w-9 object-contain md:h-11 md:w-11" />
          ) : null}
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.28em] md:text-xs"
            style={{ color: soft }}
          >
            {BRAND_HANDLE || BRAND_NAME}
          </p>
        </div>
      </div>
    </section>
  );
};

export default PunchBlock;
