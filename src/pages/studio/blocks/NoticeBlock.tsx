import { motion } from "framer-motion";
import { BRAND_HANDLE, BRAND_NAME } from "../brand";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";

/**
 * RECADO IMPORTANTE (referência: arte quadrada com chapa de cor, cartão claro
 * arredondado e ícone volumoso de exclamação)
 *
 * Arte de AVISO: uma informação que o público precisa ler agora (mudança de
 * agenda, vagas, prazo, orientação). Mantém os detalhes da referência — chapa
 * de cor inteira, cartão claro com cantos bem arredondados, selo redondo com o
 * ponto de exclamação em relevo e o @ da marca no pé.
 *
 * Tratamentos: 0 chapa primária / cartão claro, 1 chapa escura / cartão claro,
 * 2 chapa clara / cartão escuro, 3 chapa primária com selo deslocado no canto.
 */

const LABELS = ["Recado importante", "Aviso rápido", "Atenção", "Comunicado"];

const Bang = ({ bg, fg }: { bg: string; fg: string }) => (
  <span
    className="relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg md:h-20 md:w-20"
    style={{ backgroundColor: bg, color: fg }}
    aria-hidden
  >
    <span className="text-3xl font-black leading-none md:text-4xl">!</span>
    <span
      className="pointer-events-none absolute inset-0 rounded-full"
      style={{ background: "linear-gradient(160deg, hsl(0 0% 100% / 0.35), transparent 55%)" }}
    />
  </span>
);

const NoticeBlock = ({ content, rng, treatment, format, picker }: BlockProps) => {
  const [feature] = picker.pick(content.features, 1, rng, (f) => [f.topic]);
  const closing = rng.pick(content.closings);
  const title = feature?.headline ?? feature?.title ?? closing.title;
  const message = feature?.description ?? closing.sub;
  if (!title || !message) return null;

  const label = rng.pick(LABELS);
  const invertedCard = treatment === 2;
  const stage =
    treatment === 1 ? "hsl(var(--foreground))" : treatment === 2 ? "hsl(var(--secondary))" : "hsl(var(--primary))";
  const cardBg = invertedCard ? "hsl(var(--foreground))" : "hsl(var(--background))";
  const cardText = invertedCard ? "hsl(var(--background))" : "hsl(var(--foreground))";
  const soft = invertedCard ? "hsl(var(--background) / 0.72)" : "hsl(var(--foreground) / 0.68)";
  const footText = treatment === 2 ? "hsl(var(--foreground) / 0.7)" : "hsl(var(--background) / 0.8)";

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center justify-center overflow-hidden`}
      style={{ backgroundColor: stage }}
    >
      <div className={`container relative flex h-full flex-col justify-center ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-lg"
        >
          <div
            className="relative rounded-[2rem] p-[8%] shadow-xl"
            style={{ backgroundColor: cardBg, color: cardText }}
          >
            {treatment === 3 ? (
              <div className="absolute -right-3 -top-6 md:-right-5 md:-top-8">
                <Bang bg="hsl(var(--primary))" fg="hsl(var(--primary-foreground))" />
              </div>
            ) : (
              <div className="mb-5 flex justify-center">
                <Bang
                  bg={invertedCard ? "hsl(var(--background))" : "hsl(var(--primary))"}
                  fg={invertedCard ? "hsl(var(--foreground))" : "hsl(var(--primary-foreground))"}
                />
              </div>
            )}

            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.3em] md:text-xs" style={{ color: soft }}>
              {label}
            </p>
            <h2 className="mt-3 break-words text-center text-2xl font-bold leading-[1.14] tracking-tight [overflow-wrap:anywhere] md:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-center text-sm leading-relaxed md:text-lg" style={{ color: soft }}>
              {message}
            </p>
          </div>

          <p
            className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[0.24em] md:text-xs"
            style={{ color: footText }}
          >
            {BRAND_HANDLE || BRAND_NAME}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default NoticeBlock;
