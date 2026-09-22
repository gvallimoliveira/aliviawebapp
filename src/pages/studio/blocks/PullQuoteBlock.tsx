import { motion } from "framer-motion";
import { BRAND_HANDLE, BRAND_LOGO, BRAND_NAME } from "../brand";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";
import { quoteCopy } from "../typographyGuards";

/**
 * CITAÇÃO ASSINADA (referência estilística: fundo profundo, aspas gigantes em
 * dourado, frase em sans bold com o fecho em serifada itálica, rodapé com
 * avatar da marca, nome e @ do perfil, e a logo no canto oposto)
 *
 * É o post de posicionamento: a frase é a única protagonista e o rodapé diz de
 * quem ela é. O fecho em serifada itálica dá a cadência de fala — o olho lê a
 * última linha mais devagar, e é justo ali que a frase vira convicção.
 *
 * Tratamentos: 0 fundo profundo, 1 papel claro, 2 chapa primária,
 * 3 fundo profundo com trama.
 */

/** Fecho da citação: as últimas palavras ganham a serifada itálica. */
const splitTail = (text: string) => {
  /* As aspas gigantes do desenho já marcam a citação — texto entra limpo. */
  const clean = text.replace(/\s+/g, " ").trim().replace(/^["“”\u2018\u2019']+|["“”\u2018\u2019']+$/g, "").trim();
  const words = clean.split(" ");
  if (words.length < 5) return { head: "", tail: words.join(" ") };
  const tailSize = words.length >= 10 ? 3 : 2;
  return {
    head: words.slice(0, words.length - tailSize).join(" "),
    tail: words.slice(words.length - tailSize).join(" "),
  };
};

const PullQuoteBlock = ({ content, rng, treatment, format, picker }: BlockProps) => {
  const [quote] = picker.pick(content.quotes, 1, rng, (q) => [q.topic]);
  const { head, tail } = splitTail(quoteCopy(quote.text));

  const light = treatment === 1;
  const primary = treatment === 2;
  const bg = light
    ? "hsl(var(--background))"
    : primary
      ? "hsl(var(--primary))"
      : "hsl(var(--foreground))";
  const ink = light ? "hsl(var(--foreground))" : "hsl(var(--background))";
  const accentInk = light ? "hsl(var(--primary))" : "hsl(var(--accent))";
  const big = "clamp(1.6rem, 7.4vw, 3.6rem)";

  return (
    <section
      data-studio-own-lockup="1"
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden`}
      style={{ backgroundColor: bg }}
    >
      {treatment === 3 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(60% 45% at 20% 12%, hsl(var(--background) / 0.08) 0%, transparent 70%), radial-gradient(50% 40% at 85% 88%, hsl(var(--background) / 0.06) 0%, transparent 70%)",
          }}
        />
      )}

      <div className={`container relative flex h-full flex-col justify-between ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col justify-center"
        >
          <span
            aria-hidden
            className="mb-2 block select-none font-bold leading-[0.62] [font-family:Georgia,'Times_New_Roman',serif]"
            style={{ fontSize: `calc(${big} * 2.1)`, color: accentInk }}
          >
            &ldquo;
          </span>

          <blockquote className="max-w-3xl text-left" style={{ color: ink }}>
            {head && (
              <span className="block font-bold tracking-tight" style={{ fontSize: big, lineHeight: 1.06 }}>
                {head}
              </span>
            )}
            <span
              className="block tracking-tight [font-family:Georgia,'Times_New_Roman',serif]"
              style={{ fontSize: `calc(${big} * 1.06)`, lineHeight: 1.1, fontStyle: "italic", color: accentInk }}
            >
              {tail}
            </span>
          </blockquote>
        </motion.div>

        {/* Assinatura: avatar da marca, nome e @ do perfil — como no template. */}
        <div className="flex items-center justify-between gap-4" style={{ color: ink }}>
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full md:h-14 md:w-14"
              style={{ border: `1px solid ${accentInk}` }}
            >
              <img src={BRAND_LOGO} alt="" data-brand-logo="1" className="h-full w-full object-contain p-1.5" loading="lazy" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight md:text-base">{BRAND_NAME}</span>
              <span className="block truncate text-xs tracking-tight md:text-sm" style={{ opacity: 0.7 }}>
                {BRAND_HANDLE}
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PullQuoteBlock;
