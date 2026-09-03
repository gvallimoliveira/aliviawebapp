import { motion } from "framer-motion";
import { pickPhotoForTopics } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";
import { BRAND_HANDLE } from "../brand";
import { condensePhrase } from "@/pages/studio-pro/textFit";

/**
 * PERGUNTA ELEGANTE (referência estilística: foto em plano de fundo escurecido,
 * pergunta em sans bold com UMA palavra em serifada itálica dourada no meio)
 *
 * É o padrão mais comum de post de captação — e o mais fácil de ficar feio.
 * Aqui a elegância vem de três decisões: a pergunta é curta e vem do
 * vocabulário real do público (cenário "antes", objeções, buscas), a palavra
 * que dói fica isolada numa linha em serifada itálica, e o resto do quadro
 * respira sem nenhum enfeite.
 *
 * Tratamentos: 0 foto do acervo com véu, 1 chapa escura, 2 papel claro com
 * tinta da marca, 3 chapa primária. Sem acervo o tratamento 0 vira chapa
 * escura — a arte nunca deixa de existir por falta de foto.
 */

/** Palavra protagonista: a mais longa da frase (a que carrega o peso). */
const splitAccent = (phrase: string) => {
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length < 3) return null;
  let at = 0;
  words.forEach((w, i) => {
    if (w.replace(/[^\p{L}]/gu, "").length > words[at].replace(/[^\p{L}]/gu, "").length) at = i;
  });
  return {
    before: words.slice(0, at).join(" "),
    accent: words[at].replace(/[.,;:!?]+$/g, ""),
    after: words.slice(at + 1).join(" "),
  };
};

const ElegantAskBlock = ({ content, rng, treatment, format, picker, photos }: BlockProps) => {
  const pool = [
    ...content.compare.flatMap((c) => c.before),
    ...content.sales.objections,
    ...(content.searchQueries ?? []),
  ]
    /* Pergunta curta: a arte só respira com frase de uma leitura (até 8 palavras). */
    .map((p) => condensePhrase(p, 52))
    .filter((p) => {
      const words = p.split(/\s+/).filter(Boolean).length;
      return words >= 3 && words <= 8;
    });
  if (pool.length === 0) return null;

  const raw = rng.pick(pool).replace(/[.!?…:;]+$/g, "").trim();
  const parts = splitAccent(raw);
  if (!parts) return null;

  const [feature] = picker.pick(content.features, 1, rng, (f) => [f.topic]);
  const photo = treatment === 0 ? pickPhotoForTopics(photos, treatment + rng.int(4), [feature.topic], undefined, artKey) : undefined;
  const kicker = rng.pick(content.kickers);

  const onDark = treatment !== 2;
  const bg = photo
    ? undefined
    : treatment === 2
      ? "hsl(var(--background))"
      : treatment === 3
        ? "hsl(var(--primary))"
        : "hsl(var(--foreground))";
  const ink = onDark || !!photo ? "#f7f5f0" : "hsl(var(--foreground))";
  /* Palavra protagonista: acento do kit em fundo escuro, cor de marca em fundo claro. */
  const accentInk = onDark || !!photo ? "hsl(var(--accent))" : "hsl(var(--primary))";
  const bigSize = "clamp(1.7rem, 8.4vw, 4rem)";

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-end overflow-hidden`}
      style={{ backgroundColor: bg ?? "#0c0c12" }}
    >
      {photo && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <PhotoFrame
              photo={photo}
              className="h-full w-full rounded-none"
              imgClassName="opacity-95 brightness-[0.78] saturate-[0.9]"
            />
          </div>
          <div
            aria-hidden
            data-studio-overlay="1"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(8,8,12,0.9) 0%, rgba(8,8,12,0.6) 40%, rgba(8,8,12,0.18) 74%, rgba(8,8,12,0.32) 100%)",
            }}
          />
        </>
      )}

      <div className={`container relative ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl text-left"
          style={{ color: ink }}
        >
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.32em]" style={{ opacity: 0.72 }}>
            {kicker}
          </p>

          <h2 className="font-bold tracking-tight" style={{ fontSize: bigSize, lineHeight: 1.06 }}>
            {parts.before && <span>{parts.before} </span>}
            <span
              className="[font-family:Georgia,'Times_New_Roman',serif]"
              style={{ fontStyle: "italic", color: accentInk }}
            >
              {parts.accent}
            </span>
            {parts.after && <span> {parts.after}</span>}
            <span>?</span>
          </h2>

          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ opacity: 0.75 }}>
            {BRAND_HANDLE}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ElegantAskBlock;
