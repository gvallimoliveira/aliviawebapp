import { motion } from "framer-motion";
import { blockPadding, personaSurface, sectionHeight, type BlockProps } from "./shared";
import { ACCENT_STYLES, GeoOrnament, TextureLayer, renderAccent } from "./Texture";
import { BRAND_NAME } from "../brand";
import { finalizeListCoherence } from "../listCoherence";

/**
 * List block — lista editorial de valor puro ("4 sinais de que...",
 * "3 erros ao..."). Conteúdo informativo que não depende de tela do produto;
 * o fecho (`closing`) amarra a lista de volta para a marca.
 * Treatments: 0 fileiras numeradas, 1 grade de cards, 2 pilha tipográfica.
 */
const ListBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  if (!content.lists?.length) return null;
  const list = finalizeListCoherence(rng.pick(content.lists));
  const accentVariant = rng.int(ACCENT_STYLES.length);

  if (treatment === 1) {
    // Grade de cards: cada item vira uma peça numerada.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <GeoOrnament index={treatment + persona.textureShift} />
        <div className={`container relative ${blockPadding(format)}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="mb-10 max-w-3xl text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
              {renderAccent(list.heading, accentVariant)}
            </h2>
            <div className={`grid gap-4 ${list.items.length > 3 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {list.items.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6"
                >
                  <span className="text-4xl font-bold tracking-tight text-primary/80">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-base font-medium leading-snug text-foreground md:text-lg">{item}</span>
                </motion.div>
              ))}
            </div>
            <p className="mt-10 max-w-2xl text-lg font-semibold leading-snug text-primary md:text-xl">{list.closing}</p>
          </motion.div>
        </div>
      </section>
    );
  }

  if (treatment === 2) {
    // Pilha tipográfica: itens grandes empilhados, fecho em filete.
    return (
      <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
        <TextureLayer persona={persona} index={treatment} />
        <div className={`container relative ${blockPadding(format)}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {BRAND_NAME} · Lista
            </p>
            <h2 className="mb-12 text-3xl font-bold leading-[1.12] tracking-tight text-foreground md:text-5xl">
              {renderAccent(list.heading, accentVariant)}
            </h2>
            <ul className="space-y-5">
              {list.items.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="text-xl font-medium leading-snug text-foreground md:text-2xl"
                >
                  <span className="mr-3 font-bold text-primary">{i + 1}.</span>
                  {item}
                </motion.li>
              ))}
            </ul>
            <p className="mx-auto mt-12 max-w-xl border-t-2 border-primary/40 pt-8 text-lg font-semibold leading-snug text-foreground md:text-xl">
              {list.closing}
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  // Treatment 0 — fileiras numeradas com divisórias (editorial).
  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment)}`}>
      <TextureLayer persona={persona} index={treatment} />
      <div className={`container relative ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="ml-0 max-w-3xl md:ml-[6%]"
        >
          <h2 className="mb-10 max-w-2xl text-3xl font-bold leading-[1.12] tracking-tight text-foreground md:text-5xl">
            {renderAccent(list.heading, accentVariant)}
          </h2>
          <ol className="divide-y divide-border border-y border-border">
            {list.items.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-baseline gap-6 py-5"
              >
                <span className="shrink-0 text-2xl font-bold tracking-tight text-primary md:text-3xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-lg font-medium leading-snug text-foreground md:text-xl">{item}</span>
              </motion.li>
            ))}
          </ol>
          <p className="mt-10 max-w-2xl text-xl font-semibold leading-snug text-primary md:text-2xl">{list.closing}</p>
        </motion.div>
      </div>
    </section>
  );
};

export default ListBlock;
