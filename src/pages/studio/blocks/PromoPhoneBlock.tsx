import { motion } from "framer-motion";
import { BRAND_HANDLE, BRAND_LOGO, BRAND_NAME } from "../brand";
import { frameHeight, personaSurface, sectionHeight, type BlockProps } from "./shared";
import { TextureLayer } from "./Texture";

/**
 * PROMOÇÃO COM O PRODUTO NA TELA (referência: template de liquidação com
 * celular ao centro e a palavra repetida em contorno atrás)
 *
 * Arte de OFERTA: o produto / plano de assinatura aparece dentro da tela do
 * celular, e a palavra-chave da promoção repete em contorno atrás do aparelho,
 * fechando com a versão sólida embaixo, a linha de condição e o @ da marca.
 *
 * Nada de copy inventada: palavra-chave vem das palavras de impacto da marca,
 * a linha de condição vem das ofertas/CTAs do acervo e o cartão da tela é
 * montado com recursos reais (título + provas).
 *
 * Tratamentos: 0 papel claro, 1 chapa escura, 2 chapa da cor primária.
 */

/** Palavra única, em caixa alta, boa para empilhar em contorno. */
const asWord = (raw: string) =>
  raw
    .replace(/[.!?,;:]+/g, " ")
    .trim()
    .split(/\s+/)
    .sort((a, b) => b.length - a.length)[0]
    ?.toUpperCase() ?? "";

const PromoPhoneBlock = ({ content, rng, treatment, format, persona, picker }: BlockProps) => {
  const features = picker.pick(content.features, 3, rng, (f) => [f.topic]);
  if (features.length < 2) return null;

  const words = [
    ...content.kinetic.map((k) => k.word),
    ...content.marquee.flat(),
    ...content.headlines.map((h) => h.strong),
  ]
    .map(asWord)
    .filter((w) => w.length >= 4 && w.length <= 13);
  if (words.length === 0) return null;
  const word = rng.pick(Array.from(new Set(words)));

  const condition =
    rng.pick([...(content.sales?.offers ?? []), ...(content.sales?.ctas ?? []), ...content.subs]) ?? "";
  const plan = features[0];
  const proofs = features.slice(1).map((f) => f.title);
  const dark = treatment === 1;
  const primary = treatment === 2;

  const ink = dark || primary ? "hsl(var(--background))" : "hsl(var(--foreground))";
  const outline = dark || primary ? "hsl(var(--background) / 0.35)" : "hsl(var(--foreground) / 0.22)";
  const phoneHeight = frameHeight(format, { "9x16": 42, "4x5": 40, "1x1": 34 });

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden ${
        dark || primary ? "" : personaSurface(persona, treatment + 3)
      }`}
      style={dark ? { backgroundColor: "hsl(var(--foreground))" } : primary ? { backgroundColor: "hsl(var(--primary))" } : undefined}
    >
      <TextureLayer persona={persona} index={treatment + 2} dark={dark || primary} />

      <div className="relative flex h-full w-full max-w-[380px] flex-col items-center justify-center px-[8%] py-[9%]">
        {/* Palavra repetida em contorno, atrás do aparelho. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[18%] flex flex-col items-center">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className="block w-full whitespace-nowrap text-center font-extrabold uppercase leading-[0.92] tracking-tight"
              style={{
                fontSize: "clamp(2rem, 13vw, 4.6rem)",
                color: "transparent",
                WebkitTextStrokeWidth: "1.5px",
                WebkitTextStrokeColor: outline,
              }}
            >
              {word}
            </span>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex w-full flex-col items-center"
          style={{ color: ink }}
        >
          {/* Celular com o plano/produto na tela. */}
          <div
            className="relative mx-auto w-[62%] rounded-[26px] border-[6px] p-[3px] shadow-[0_36px_70px_-40px_hsl(var(--foreground)/0.8)]"
            style={{ ...phoneHeight, borderColor: "hsl(var(--foreground))", backgroundColor: "hsl(var(--foreground))" }}
          >
            <span
              aria-hidden
              className="absolute left-1/2 top-[6px] z-10 h-[5px] w-[34%] -translate-x-1/2 rounded-full"
              style={{ backgroundColor: "hsl(var(--background) / 0.35)" }}
            />
            <div className="flex h-full w-full flex-col overflow-hidden rounded-[20px] bg-background px-3 pb-3 pt-5">
              <div className="flex items-center gap-1.5">
                <img src={BRAND_LOGO} alt="" className="h-4 w-4 object-contain" />
                <span className="truncate text-[8px] font-semibold uppercase tracking-[0.2em] text-foreground">
                  {BRAND_NAME}
                </span>
              </div>

              <p className="mt-2 text-[11px] font-bold leading-tight text-foreground">{plan.title}</p>
              <p className="mt-1 line-clamp-2 text-[7.5px] leading-snug text-muted-foreground">{plan.description}</p>

              <div className="mt-2 flex-1 space-y-1.5">
                {proofs.map((proof, i) => (
                  <div
                    key={`${proof}-${i}`}
                    className="rounded-md border border-border bg-secondary/40 px-2 py-1"
                  >
                    <p className="line-clamp-2 text-[7px] leading-tight text-muted-foreground">{proof}</p>
                  </div>
                ))}
              </div>

              <div className="mt-2 rounded-md bg-primary px-2 py-1.5 text-center text-[7px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                {plan.tag}
              </div>
            </div>
          </div>

          <h2
            className="mt-4 w-full break-words text-center font-extrabold uppercase leading-[0.92] tracking-tight"
            style={{ fontSize: "clamp(1.9rem, 12vw, 4.2rem)" }}
          >
            {word}
          </h2>
          <p className="mt-2 max-w-[95%] text-center text-xs font-semibold uppercase tracking-[0.14em] opacity-85 md:text-sm">
            {condition}
          </p>
          <p className="mt-5 text-xs tracking-wide opacity-80 md:text-sm">{BRAND_HANDLE}</p>
        </motion.div>
      </div>
    </section>
  );
};

export default PromoPhoneBlock;
