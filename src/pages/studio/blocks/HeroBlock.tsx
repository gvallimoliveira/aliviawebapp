import { motion } from "framer-motion";
import logoAlivia from "@/assets/logo-alivia.png";
import { ALIGNMENTS, alignClasses, MESH_STYLE, sectionHeight, surfaceFor, type BlockProps } from "./shared";

/**
 * Hero statement — a full-frame manifesto line for the selected world.
 * Treatments: 0 centered + logo halo, 1 editorial left, 2 asymmetric with mesh.
 */
const HeroBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const align = ALIGNMENTS[treatment % ALIGNMENTS.length];
  const classes = alignClasses(align);
  const headline = rng.pick(content.headlines);
  const kicker = rng.pick(content.kickers);
  const sub = rng.pick(content.subs);
  const surface = surfaceFor(treatment);
  const showMesh = treatment === 2;

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${surface}`}>
      {showMesh && <div aria-hidden className="absolute inset-0 opacity-60" style={MESH_STYLE} />}
      <div aria-hidden className="pointer-events-none absolute -top-24 right-[-20%] h-[60vh] w-[60vh] rounded-full bg-primary/10 blur-[110px]" />

      <div className="container relative py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={`flex flex-col gap-6 ${classes.wrapper}`}
        >
          <img
            src={logoAlivia}
            alt="Aliv.iA"
            className={`h-20 w-20 md:h-24 md:w-24 ${treatment === 0 ? "drop-shadow-[0_0_30px_hsl(var(--primary)/0.35)]" : ""}`}
          />

          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-primary md:text-xs">{kicker}</p>

          <h1 className="text-3xl font-bold leading-[1.08] tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {headline.strong}{" "}
            <span className="text-muted-foreground">{headline.rest}</span>
          </h1>

          <p className="text-base text-muted-foreground md:text-lg">{sub}</p>

          <div className={`mt-2 h-px w-24 bg-primary/50 ${align === "center" ? "mx-auto" : ""}`} />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroBlock;
