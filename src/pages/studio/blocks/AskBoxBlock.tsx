import { motion } from "framer-motion";
import { BRAND_HANDLE } from "../brand";
import { pickPhotoForTopics } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";

/**
 * CAIXA DE PERGUNTAS (referência: template de engajamento com sticker de
 * pergunta do Instagram sobre foto com véu e filetes metálicos)
 *
 * Arte de ENGAJAMENTO: convida o público a mandar a dúvida sobre um tema da
 * marca. Mantém os detalhes estilísticos da referência — filetes finos em
 * degradê no topo e no rodapé, chapa sólida com a pergunta curta, o tema em
 * serifada itálica, o cartão de resposta em duas faixas (convite + campo) e o
 * @ da marca centralizado no pé.
 *
 * O tema NUNCA é inventado: sai do acervo editorial (tag/título de recurso ou
 * termo real de busca do público). Foto do acervo é opcional — sem foto, o
 * fundo vira chapa da marca.
 *
 * Tratamentos: 0 foto/chapa escura, 1 chapa da cor primária,
 * 2 chapa clara editorial, 3 chapa escura com filete duplo.
 */

/** Perguntas de abertura — todas leem bem antes de um tema curto. */
const OPENERS = [
  "Qual a sua dúvida sobre",
  "O que você quer saber sobre",
  "Ficou com alguma dúvida sobre",
  "Me conta: o que te trava em",
];

const INVITES = ["Conta para a gente!", "Manda aqui, eu respondo.", "Pergunta sem medo."];
const PLACEHOLDERS = ["Faça sua pergunta", "Escreva sua dúvida", "Digite aqui sua pergunta"];

/** Tema curto o suficiente para virar título — em Capitalizado, sem ponto. */
const asTheme = (raw: string) =>
  raw
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");

const AskBoxBlock = ({ content, rng, treatment, format, picker, photos, artKey }: BlockProps) => {
  const [feature] = picker.pick(content.features, 1, rng, (f) => [f.topic]);
  const candidates = [feature?.tag, feature?.title, ...(content.searchQueries ?? [])]
    .filter((t): t is string => !!t && t.trim().length > 3)
    .map(asTheme)
    .filter((t) => t.length > 3 && t.length <= 34);
  if (candidates.length === 0) return null;

  const theme = rng.pick(Array.from(new Set(candidates)));
  const opener = rng.pick(OPENERS);
  const invite = rng.pick(INVITES);
  const placeholder = rng.pick(PLACEHOLDERS);

  const usePhoto = treatment === 0;
  const photo = usePhoto ? pickPhotoForTopics(photos, treatment + rng.int(5), [feature.topic], undefined, artKey) : null;

  const light = treatment === 2;
  const surface = light
    ? "hsl(var(--background))"
    : treatment === 1
      ? "hsl(var(--primary))"
      : "hsl(var(--foreground))";
  const textColor = light ? "hsl(var(--foreground))" : "hsl(var(--background))";
  const chip = light ? "hsl(var(--foreground))" : "hsl(var(--primary))";
  const chipText = light ? "hsl(var(--background))" : "hsl(var(--primary-foreground))";

  /* Filete metálico da referência, traduzido para a paleta da marca. */
  const rule = {
    background: `linear-gradient(90deg, hsl(var(--primary) / 0.35), hsl(var(--primary)), hsl(var(--primary) / 0.35))`,
  };

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center justify-center overflow-hidden`}
      style={{ backgroundColor: surface }}
    >
      {photo && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <PhotoFrame
              photo={photo}
              className="h-full w-full rounded-none"
              imgClassName="opacity-60 brightness-[0.55] saturate-[0.7]"
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "hsl(var(--foreground) / 0.62)" }}
          />
        </>
      )}

      {/* Filetes finos: topo e rodapé, como no template de referência. */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[1.2%] min-h-[6px]" style={rule} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[1.2%] min-h-[6px]" style={rule} />
      {treatment === 3 && (
        <div aria-hidden className="absolute inset-x-[6%] top-[3.5%] h-[2px] opacity-70" style={rule} />
      )}

      <div className={`container relative flex h-full flex-col justify-center ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex w-full max-w-md flex-col items-center text-center"
          style={{ color: textColor }}
        >
          <span
            className="inline-block px-4 py-2 text-sm font-semibold leading-tight md:text-lg"
            style={{ backgroundColor: chip, color: chipText }}
          >
            {opener}
          </span>

          <h2
            className="mt-3 font-semibold italic tracking-tight [font-family:Georgia,'Times_New_Roman',serif]"
            style={{ fontSize: "clamp(1.9rem, 9vw, 3.6rem)", lineHeight: 1.02 }}
          >
            {theme}?
          </h2>

          {/* Cartão do sticker de pergunta: faixa de convite + campo. */}
          <div className="mt-6 w-full overflow-hidden rounded-2xl shadow-lg">
            <div
              className="px-4 py-3 text-base font-semibold md:text-lg"
              style={{
                backgroundColor: "hsl(var(--muted-foreground) / 0.9)",
                color: "hsl(var(--background))",
              }}
            >
              {invite}
            </div>
            <div className="px-4 py-4" style={{ backgroundColor: "hsl(var(--background))" }}>
              <div
                className="rounded-xl px-4 py-3 text-sm md:text-base"
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                {placeholder}
              </div>
            </div>
          </div>

          <p className="mt-8 text-sm tracking-wide opacity-90 md:text-base">{BRAND_HANDLE}</p>
        </motion.div>
      </div>
    </section>
  );
};

export default AskBoxBlock;
