import { motion } from "framer-motion";
import { BRAND_NAME } from "../brand";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { TextureLayer } from "./Texture";

/** Uma cadeia de 3–5 funcionalidades em um único quadro, sem virar lista solta. */
const EcosystemBlock = ({ content, treatment, format, persona }: BlockProps) => {
  const ecosystem = content.ecosystems?.[0];
  if (!ecosystem) return null;
  const dark = treatment % 2 === 1;
  const surface = dark ? "bg-foreground text-background" : personaSurface(persona, treatment);

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${surface}`}>
      <TextureLayer persona={persona} index={treatment + 4} dark={dark} />
      <div className="container relative flex h-full flex-col justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${dark ? "text-primary" : "text-primary"}`}>
            {ecosystem.kicker} · {BRAND_NAME}
          </p>
          <h2 className={`mt-3 max-w-4xl text-2xl font-bold leading-[1.08] md:text-5xl ${dark ? "text-background" : "text-foreground"}`}>
            {ecosystem.title}
          </h2>
          <p className={`mt-3 max-w-3xl text-sm leading-relaxed md:text-lg ${dark ? "text-background/70" : "text-muted-foreground"}`}>
            {ecosystem.promise}
          </p>

          <ol className={`relative mt-7 border-l ${dark ? "border-background/20" : "border-primary/30"}`}>
            {ecosystem.steps.map((step, index) => (
              <li key={step.id} className="relative pb-4 pl-7 last:pb-0">
                <span className="absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className={`text-sm font-bold leading-tight md:text-lg ${dark ? "text-background" : "text-foreground"}`}>
                  {step.label}
                </h3>
                <p className={`mt-1 max-w-3xl text-xs leading-relaxed md:text-sm ${dark ? "text-background/70" : "text-muted-foreground"}`}>
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <div className={`mt-7 border-t pt-4 ${dark ? "border-background/20" : "border-border"}`}>
            <p className={`max-w-3xl text-sm font-semibold leading-relaxed md:text-base ${dark ? "text-background" : "text-foreground"}`}>
              {ecosystem.closing}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">{ecosystem.cta}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default EcosystemBlock;