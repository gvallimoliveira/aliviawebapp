import { motion } from "framer-motion";
import { blockPadding, personaSurface, sectionHeight, type BlockProps } from "./shared";
import { TextureLayer } from "./Texture";
import { joinCopyParts } from "../typographyGuards";

/**
 * ÍNDICE (antigo marquee).
 *
 * Era uma faixa animada de uma linha: no feed virava uma tarja fina com o
 * resto do quadro vazio — arte impublicável. Agora é uma composição ESTÁTICA
 * que ocupa o quadro inteiro: os mesmos termos viram um índice editorial
 * numerado, uma linha por termo, sem animação e sem sobra de branco.
 *
 * REGRA DE SENTIDO: uma lista de palavras soltas não comunica nada. Por isso o
 * índice SEMPRE vem com uma afirmação em cima (o que essa lista é) e um fecho
 * embaixo (o que fazer com ela). Sem essas duas linhas a arte não se explica.
 */
const MarqueeBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  if (!content.marquee?.length || !content.kickers?.length || !content.headlines?.length) return null;
  const items = rng.pick(content.marquee);
  const kicker = rng.pick(content.kickers);
  const dark = (treatment + persona.surfaceShift) % 2 === 1;
  // O nome da marca já está na assinatura: repetido como item do índice, vira
  // ruído ("01 Nome da Marca") e rouba a linha de um tópico de verdade.
  const label = content.label.toLowerCase();
  const rows = [...new Set(items.map((t) => t.trim()).filter(Boolean))]
    .filter((t) => t.length > 2 && !label.includes(t.toLowerCase()))
    .slice(0, 5);

  const bullet = (treatment + persona.textureShift) % 3;

  const head = rng.pick(content.headlines);
  const statement = joinCopyParts(head.strong, head.rest);
  const closing =
    content.lists.find((l) => !!l.closing)?.closing ??
    content.closings[0]?.sub ??
    content.subs[0] ??
    "";


  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${
        dark ? "bg-foreground" : personaSurface(persona, treatment)
      }`}
    >
      {!dark && <TextureLayer persona={persona} index={treatment + 1} />}
      <div className={`relative w-full ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p
            className={`mb-6 text-[11px] font-medium uppercase tracking-[0.32em] md:text-xs ${
              dark ? "text-background/60" : "text-primary"
            }`}
          >
            {kicker}
          </p>

          {statement && (
            <h2
              className={`mb-5 max-w-[22ch] text-2xl font-semibold leading-[1.1] tracking-tight md:text-4xl ${
                dark ? "text-background" : "text-foreground"
              }`}
            >
              {statement}
            </h2>
          )}



          <ul
            className={`divide-y ${
              dark ? "divide-background/15 border-y border-background/15" : "divide-border border-y border-border"
            }`}
          >
            {rows.map((label, i) => (
              <li key={`${label}-${i}`} className="flex min-w-0 items-baseline gap-4 py-4">
                <span
                  className={`shrink-0 text-[11px] font-medium tabular-nums tracking-[0.18em] ${
                    dark ? "text-background/45" : "text-muted-foreground"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {bullet === 1 ? (
                  <span className="mb-1 h-2 w-2 shrink-0 rotate-45 bg-primary" aria-hidden />
                ) : bullet === 2 ? (
                  <span className="mb-1 h-1.5 w-1.5 shrink-0 rounded-[2px] bg-primary" aria-hidden />
                ) : (
                  <span className="mb-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                )}
                <span
                  className={`min-w-0 break-words text-xl font-semibold leading-tight tracking-tight md:text-3xl ${
                    dark ? "text-background" : "text-foreground"
                  }`}
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>

          {closing && (
            <p
              className={`mt-5 max-w-[38ch] text-sm leading-snug md:text-base ${
                dark ? "text-background/70" : "text-muted-foreground"
              }`}
            >
              {closing}
            </p>
          )}
        </motion.div>

      </div>
    </section>
  );
};

export default MarqueeBlock;
