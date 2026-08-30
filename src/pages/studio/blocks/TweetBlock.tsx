import { motion } from "framer-motion";
import { BRAND_HANDLE, BRAND_LOGO, BRAND_NAME } from "../brand";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";

/**
 * MOCKUP DE TWEET (referência: as duas últimas fotos — post de rede social em
 * tema escuro e tema claro)
 *
 * Modelo diferenciado: a arte é o print de um post curto. Os elementos que
 * fazem o público reconhecer o formato na hora são obrigatórios e ficam
 * sempre na mesma ordem: avatar redondo, nome + selo de verificado, @ da
 * marca, corpo do post em texto grande, horário e data, filete, e a barra de
 * ações (responder, repostar, curtir, visualizações) com contadores.
 *
 * O texto NUNCA é inventado: sai de uma fala do acervo (`quotes`) ou de uma
 * headline curta da marca — assim funciona para qualquer cliente do Studio.
 *
 * Tratamentos: 0 escuro em fundo neutro, 1 claro em chapa da cor primária,
 * 2 escuro com o post inclinado sobre trama, 3 claro em fundo escuro.
 */

const Verified = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className="h-[1em] w-[1em] shrink-0" style={{ color }}>
    <path
      fill="currentColor"
      d="M12 1.5l2.4 1.9 3-.4 1.1 2.9 2.6 1.6-.8 2.9.8 2.9-2.6 1.6-1.1 2.9-3-.4L12 22.5l-2.4-1.9-3 .4-1.1-2.9-2.6-1.6.8-2.9-.8-2.9L5.5 6.9 6.6 4l3 .4L12 1.5zm-1.3 13.6l5.3-5.3-1.3-1.4-4 4-2-2-1.4 1.4 3.4 3.3z"
    />
  </svg>
);

/** Ícones da barra de ações — traço simples, reconhecíveis como no print. */
const ACTION_PATHS = [
  // responder
  "M4 4h16v11H9l-5 4V4z",
  // repostar
  "M7 7h9l-3-3M17 17H8l3 3M17 7v10M7 17V7",
  // curtir
  "M12 20s-7-4.35-7-9a4 4 0 017-2.65A4 4 0 0119 11c0 4.65-7 9-7 9z",
  // visualizações
  "M4 20V10M9.3 20V4M14.7 20v-7M20 20V7",
];

const numbers = (seedA: number, seedB: number) => [
  `${12 + (seedA % 40)}`,
  `${4 + (seedB % 19)}`,
  `${90 + ((seedA * 7 + seedB) % 620)}`,
  `${3 + ((seedA + seedB) % 9)},${1 + (seedB % 8)} mil`,
];

const TweetBlock = ({ content, rng, treatment, format, picker }: BlockProps) => {
  const [quote] = picker.pick(content.quotes, 1, rng, (q) => (q.topic ? [q.topic] : []));
  const headline = rng.pick(content.headlines);
  const body = (quote?.text ?? `${headline.strong} ${headline.rest}`).replace(/^["“]|["”]$/g, "").trim();
  if (body.length < 12) return null;

  const light = treatment === 1 || treatment === 3;
  const cardBg = light ? "hsl(var(--background))" : "hsl(var(--foreground))";
  const cardText = light ? "hsl(var(--foreground))" : "hsl(var(--background))";
  const meta = light ? "hsl(var(--foreground) / 0.55)" : "hsl(var(--background) / 0.6)";
  const hair = light ? "hsl(var(--foreground) / 0.12)" : "hsl(var(--background) / 0.18)";
  const stage =
    treatment === 1
      ? "hsl(var(--primary))"
      : treatment === 3
        ? "hsl(var(--foreground))"
        : treatment === 2
          ? "hsl(var(--secondary))"
          : "hsl(var(--muted))";

  const counts = numbers(body.length, treatment + 3);
  const hour = `${8 + (body.length % 12)}:${String(10 + (body.length % 48)).padStart(2, "0")}`;
  const tilt = treatment === 2 ? "-2.2deg" : "0deg";

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center justify-center overflow-hidden`}
      style={{ backgroundColor: stage }}
    >
      <div className={`container relative flex h-full flex-col justify-center ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-xl rounded-[1.6rem] p-[6%] shadow-lg"
          style={{ backgroundColor: cardBg, color: cardText, transform: `rotate(${tilt})` }}
        >
          {/* Cabeçalho do post: avatar, nome, selo e @ */}
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full md:h-14 md:w-14"
              style={{ backgroundColor: light ? "hsl(var(--secondary))" : "hsl(var(--background) / 0.12)" }}
            >
              <img src={BRAND_LOGO} alt="" aria-hidden className="h-3/4 w-3/4 object-contain" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-base font-bold leading-tight md:text-lg">
                <span className="truncate">{BRAND_NAME}</span>
                <Verified color="hsl(var(--primary))" />
              </p>
              <p className="truncate text-sm md:text-base" style={{ color: meta }}>
                {BRAND_HANDLE}
              </p>
            </div>
          </div>

          {/* Corpo do post — protagonista da arte */}
          <p className="mt-5 break-words text-xl font-medium leading-[1.3] [overflow-wrap:anywhere] md:text-3xl">
            {body}
          </p>

          {/* Horário + data, como no print */}
          <p className="mt-5 text-xs md:text-sm" style={{ color: meta }}>
            {hour} · Publicado por {BRAND_NAME}
          </p>

          <div aria-hidden className="my-4 h-px w-full" style={{ backgroundColor: hair }} />

          {/* Barra de ações com contadores */}
          <div className="flex items-center justify-between" style={{ color: meta }}>
            {ACTION_PATHS.map((d, i) => (
              <span key={d} className="flex items-center gap-1.5 text-xs md:text-sm">
                <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 md:h-5 md:w-5">
                  <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {counts[i]}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TweetBlock;
