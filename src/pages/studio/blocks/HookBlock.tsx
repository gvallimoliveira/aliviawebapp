import { motion } from "framer-motion";
import { BRAND_HANDLE, BRAND_NAME } from "../brand";
import { blockPadding, personaSurface, sectionHeight, type BlockProps } from "./shared";

/**
 * GANCHO (biblioteca de frases virais adaptadas à marca)
 *
 * Arte de PARADA DE SCROLL: o gancho ocupa o quadro quase inteiro, o apoio
 * fecha a ideia e o convite fica no pé. O texto vem de `content.hooks`
 * (acervo curado da marca + mecanismo de ganchos); sem gancho disponível,
 * o bloco cai na headline para nunca renderizar vazio.
 *
 * Tratamentos: 0 chapa clara com barra de cor, 1 chapa escura, 2 chapa
 * primária, 3 cartão com aspas e etiqueta do gancho no topo.
 */

const HookBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  if (!content.headlines?.length || !content.closings?.length) return null;
  const hooks = content.hooks ?? [];
  const fallback = (() => {
    const h = rng.pick(content.headlines);
    return { hook: "Olha isso", strong: h.strong, rest: h.rest, sub: rng.pick(content.subs), cta: rng.pick(content.closings).cta };
  })();
  const hook = hooks.length > 0 ? rng.pick(hooks) : fallback;
  const strong = (hook.strong ?? "").trim();
  if (!strong) return null;
  const rest = (hook.rest ?? "").trim();
  const sub = (hook.sub ?? "").trim();
  const cta = (hook.cta ?? "").trim();

  const dark = treatment === 1;
  const primary = treatment === 2;
  const bg = dark
    ? "hsl(var(--foreground))"
    : primary
      ? "hsl(var(--primary))"
      : undefined;
  const fg = dark
    ? "hsl(var(--background))"
    : primary
      ? "hsl(var(--primary-foreground))"
      : "hsl(var(--foreground))";
  const soft = dark
    ? "hsl(var(--background) / 0.72)"
    : primary
      ? "hsl(var(--primary-foreground) / 0.78)"
      : "hsl(var(--foreground) / 0.68)";
  const accent = dark || primary ? fg : "hsl(var(--primary))";

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${bg ? "" : personaSurface(persona, treatment)}`}
      style={bg ? { backgroundColor: bg } : undefined}
    >
      <div className={`container relative flex h-full flex-col justify-center ${blockPadding(format)}`} style={{ color: fg }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={treatment === 3 ? "mx-auto w-full max-w-xl rounded-[2rem] p-[7%] shadow-xl" : "w-full"}
          style={
            treatment === 3
              ? { backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }
              : undefined
          }
        >
          {treatment === 3 ? (
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.3em] md:text-xs"
              style={{ color: "hsl(var(--primary))" }}
            >
              {hook.hook}
            </p>
          ) : (
            <span
              className="mb-6 block h-1.5 w-16 rounded-full"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
          )}

          <h2
            className="mt-3 break-words text-3xl font-black leading-[1.06] tracking-tight [overflow-wrap:anywhere] md:text-6xl"
            data-studio-learn-frame
          >
            <span data-studio-learn>{strong}</span>
            {rest ? (
              <span className="font-medium" style={{ color: treatment === 3 ? "hsl(var(--foreground) / 0.66)" : soft }}>
                {rest.startsWith(".") || rest.startsWith(",") ? rest : ` ${rest}`}
              </span>
            ) : null}
          </h2>

          {sub ? (
            <p
              className="mt-6 max-w-xl text-sm leading-relaxed md:text-xl"
              style={{ color: treatment === 3 ? "hsl(var(--foreground) / 0.7)" : soft }}
            >
              {sub}
            </p>
          ) : null}

          {cta ? (
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] md:text-sm" style={{ color: accent }}>
              {cta} →
            </p>
          ) : null}

          <p
            className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] md:text-xs"
            style={{ color: treatment === 3 ? "hsl(var(--foreground) / 0.55)" : soft }}
          >
            {BRAND_HANDLE || BRAND_NAME}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HookBlock;
