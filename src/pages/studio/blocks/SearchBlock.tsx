import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { BRAND_NAME } from "../brand";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { TextureLayer } from "./Texture";

/**
 * BUSCA SIMULADA (referência: barra de busca com sugestões digitando)
 *
 * Reproduz a cena de alguém digitando na busca e vendo sugestões. É o formato
 * de DOR/DESEJO por excelência: as sugestões são as perguntas que o público
 * realmente faz antes de chegar na marca — a última linha é a resposta do
 * produto.
 *
 * O conteúdo nunca é inventado aqui: o prefixo vem dos kickers/headlines e as
 * sugestões vêm do acervo editorial da marca (features, quotes, marquee).
 */
const PREFIXES = ["como tratar", "por que sinto", "o que fazer com", "vale a pena"] as const;

/** Normaliza um trecho de copy em algo que caberia numa busca real. */
const asQuery = (raw: string) =>
  raw
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 48);

const SearchBlock = ({ content, rng, treatment, format, persona, picker }: BlockProps) => {
  const prefix = PREFIXES[treatment % PREFIXES.length];

  const features = picker.pick(content.features, 2, rng, (f) => [f.topic]);
  const pool = [
    ...features.map((f) => f.title),
    ...content.marquee.flat(),
    ...content.typos.map((t) => t.big),
    ...content.quotes.map((q) => q.text),
  ]
    .map(asQuery)
    .filter((q) => q.length > 6 && q.split(" ").length <= 6);

  const suggestions = rng.shuffle(Array.from(new Set(pool))).slice(0, 4);
  if (suggestions.length < 3) return null;

  const answer = content.closings[treatment % content.closings.length];
  const dark = treatment % 2 === 1;

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center justify-center overflow-hidden pb-24 ${
        dark ? "bg-foreground" : personaSurface(persona, treatment)
      }`}
    >
      <TextureLayer persona={persona} index={treatment + 3} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <p
          className={`mb-5 text-[10px] font-semibold uppercase tracking-[0.34em] ${
            dark ? "text-background/70" : "text-muted-foreground"
          }`}
        >
          {rng.pick(content.kickers)}
        </p>

        {/* Barra de busca */}
        <div
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur ${
            dark ? "bg-background/12 text-background" : "bg-foreground/[0.06] text-foreground"
          }`}
        >
          <Search className="h-4 w-4 shrink-0 opacity-70" />
          <span className="truncate text-sm md:text-base">{prefix}</span>
          {/* Cursor de digitação */}
          <span
            className={`ml-0.5 inline-block h-4 w-[2px] ${dark ? "bg-background" : "bg-foreground"}`}
            aria-hidden
          />
        </div>

        {/* Sugestões */}
        <div
          className={`mt-2 overflow-hidden rounded-2xl ${
            dark ? "bg-background/10" : "bg-foreground/[0.05]"
          }`}
        >
          {suggestions.map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-3 px-4 py-3 ${
                i % 2 === 1 ? (dark ? "bg-background/[0.06]" : "bg-foreground/[0.03]") : ""
              }`}
            >
              <Search className={`h-3.5 w-3.5 shrink-0 ${dark ? "text-background/60" : "text-muted-foreground"}`} />
              <span className={`truncate text-[13px] ${dark ? "text-background/85" : "text-foreground/80"}`}>
                {s}
              </span>
            </div>
          ))}
        </div>

        <p
          className={`mt-7 text-2xl font-bold leading-[1.12] tracking-tight md:text-3xl ${
            dark ? "text-background" : "text-foreground"
          }`}
        >
          {answer.title}
        </p>
        <p className={`mt-2 text-sm ${dark ? "text-background/70" : "text-muted-foreground"}`}>
          {answer.sub} <span className="font-semibold">{BRAND_NAME}</span>
        </p>
      </motion.div>
    </section>
  );
};

export default SearchBlock;
