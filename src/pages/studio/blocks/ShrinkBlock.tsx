import { motion } from "framer-motion";
import { BRAND_HANDLE } from "../brand";
import { blockPadding, personaSurface, sectionHeight, type BlockProps } from "./shared";

/**
 * FRASE QUE DIMINUI (referência estilística: chapa de cor cheia, mesma frase
 * repetida em escala decrescente até virar um fio no papel)
 *
 * A arte é uma brincadeira visual com a mensagem: aquilo que atrapalha o
 * público — dor, medo de se mover, limitação, insegurança — vai perdendo
 * tamanho linha após linha. A repetição não é enfeite: é o próprio argumento,
 * porque o olho vê o incômodo encolher antes de ler qualquer explicação.
 *
 * O alvo (o que precisa diminuir) NUNCA é inventado: sai do vocabulário real
 * da marca (cenário "antes", objeções e buscas do público).
 *
 * Tratamentos: 0 chapa de destaque, 1 chapa escura, 2 papel claro com tinta da
 * marca, 3 chapa primária.
 */

/** Vocabulário de incômodo aceito na brincadeira — sempre com artigo. */
const TARGETS: { re: RegExp; label: string }[] = [
  { re: /\bmedos?\b/i, label: "o medo" },
  { re: /\bdores?\b/i, label: "a dor" },
  { re: /\binseguran[çc]a/i, label: "a insegurança" },
  { re: /\blimita[çc]/i, label: "a limitação" },
  { re: /\bd[úu]vidas?\b/i, label: "a dúvida" },
  { re: /\btravad|\brigidez/i, label: "a rigidez" },
  { re: /\bcansa[çc]o|\bfadiga/i, label: "o cansaço" },
  { re: /\bretrabalho|\bbagun[çc]a|\bplanilha/i, label: "a bagunça" },
  { re: /\bdemora|\batraso|\bespera/i, label: "a demora" },
  { re: /\bincerteza|\bachismo/i, label: "o achismo" },
];

/** Verbos de ação da marca — o que a pessoa faz até o incômodo encolher. */
const MOVES = ["seguir", "treinar", "cuidar", "insistir", "avançar", "fazer"];

const ShrinkBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  const haystack = [
    ...content.compare.flatMap((c) => c.before),
    ...content.sales.objections,
    ...(content.searchQueries ?? []),
    ...content.subs,
  ]
    .join(" ")
    .toLowerCase();

  const found = TARGETS.filter((t) => t.re.test(haystack));
  const target = (found.length > 0 ? rng.pick(found) : rng.pick(TARGETS)).label;
  const phrase = `${rng.pick(MOVES)} até ${target} perder o tamanho`;

  const dark = treatment === 1;
  const paperLight = treatment === 2;
  const chapa = treatment === 0 || treatment === 3;
  const bg =
    treatment === 0
      ? "hsl(var(--destructive))"
      : treatment === 1
        ? "hsl(var(--foreground))"
        : treatment === 3
          ? "hsl(var(--primary))"
          : undefined;
  const ink = paperLight ? "hsl(var(--primary))" : "hsl(var(--background))";

  /** 13 linhas: cada uma com 78% do tamanho da anterior. */
  const lines = Array.from({ length: 13 }, (_, i) => 0.78 ** i);

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${
        chapa || dark ? "" : personaSurface(persona, treatment + 2)
      }`}
      style={bg ? { backgroundColor: bg } : undefined}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1px)",
          backgroundSize: "11px 11px",
        }}
      />

      <div className={`container relative flex h-full flex-col justify-center ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start"
          style={{ color: ink }}
        >
          {lines.map((factor, i) =>
            i === 0 ? (
              <h2
                key={i}
                className="block w-full font-bold tracking-tight"
                style={{ fontSize: "clamp(1rem, 6.2vw, 3.1rem)", lineHeight: 1.08 }}
              >
                {phrase}
              </h2>
            ) : (
              <span
                key={i}
                aria-hidden
                className="block w-full font-bold tracking-tight"
                style={{
                  fontSize: `calc(clamp(1rem, 6.2vw, 3.1rem) * ${factor.toFixed(4)})`,
                  lineHeight: 1.12,
                  opacity: 1 - i * 0.02,
                }}
              >
                {phrase}
              </span>
            ),
          )}
        </motion.div>

        <p
          className="mt-10 text-[11px] font-bold uppercase tracking-[0.24em] md:text-xs"
          style={{ color: ink, opacity: 0.9 }}
        >
          {BRAND_HANDLE}
        </p>
      </div>
    </section>
  );
};

export default ShrinkBlock;
