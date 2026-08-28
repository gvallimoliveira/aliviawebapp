import { motion } from "framer-motion";
import { blockPadding, personaSurface, sectionHeight, type BlockProps } from "./shared";
import { TextureLayer } from "./Texture";

/**
 * ÍNDICE (antigo marquee).
 *
 * Era uma faixa animada de uma linha: no feed virava uma tarja fina com o
 * resto do quadro vazio — arte impublicável. Agora é uma composição ESTÁTICA
 * que ocupa o quadro inteiro: os mesmos termos viram um índice editorial
 * numerado, uma linha por termo, sem animação e sem sobra de branco.
 */
const MarqueeBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  const items = rng.pick(content.marquee);
  const kicker = rng.pick(content.kickers);
  const dark = (treatment + persona.surfaceShift) % 2 === 1;
  const rows = items.slice(0, 6);
  const bullet = (treatment + persona.textureShift) % 3;

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
        </motion.div>
      </div>
    </section>
  );
};

export default MarqueeBlock;
