import { motion } from "framer-motion";
import { BRAND_NAME } from "../brand";
import { personaSurface, sectionHeight, type BlockProps } from "./shared";
import { TextureLayer } from "./Texture";
import PhotoFrame from "./PhotoFrame";

/** Uma cadeia de 3–5 funcionalidades em um único quadro, sem virar lista solta. */
const EcosystemBlock = ({ content, treatment, format, persona, photos }: BlockProps) => {
  const ecosystems = content.ecosystems ?? [];
  const ecosystem = ecosystems[treatment % Math.max(1, ecosystems.length)];
  if (!ecosystem) return null;
  const dark = treatment % 2 === 1;
  const surface = dark ? "bg-foreground text-background" : personaSurface(persona, treatment);
  const layout = treatment % 3;
  const illustratedSteps = ecosystem.steps.filter((step) =>
    step.photoIds?.some((photoId) => photos?.some((photo) => photo.id === photoId)),
  );
  const illustratedStep = illustratedSteps[treatment % Math.max(1, illustratedSteps.length)];
  const availablePhotos = illustratedStep?.photoIds
    ?.map((photoId) => photos?.find((photo) => photo.id === photoId))
    .filter((photo) => Boolean(photo));
  const featuredPhoto = availablePhotos?.[treatment % Math.max(1, availablePhotos.length)];

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

           {featuredPhoto && illustratedStep && (
             <div className="relative mt-5 h-[20%] min-h-0 w-full md:h-[24%]">
               <PhotoFrame
                 photo={featuredPhoto}
                 className={`h-full w-full border ${dark ? "border-background/20" : "border-border"}`}
                 imgClassName="object-cover"
               />
               <span className="absolute bottom-2 left-2 max-w-[85%] rounded bg-background/90 px-2 py-1 text-[10px] font-bold uppercase text-foreground">
                 {illustratedStep.label}
               </span>
             </div>
           )}

          <ol className={`relative ${featuredPhoto ? "mt-4" : "mt-7"} ${layout === 0 ? `border-l ${dark ? "border-background/20" : "border-primary/30"}` : layout === 1 ? "grid grid-cols-2 gap-2 md:gap-3" : "flex flex-col gap-2"}`}>
            {ecosystem.steps.map((step, index) => (
              <li
                key={step.id}
                className={`relative ${layout === 0 ? "pb-4 pl-7 last:pb-0" : layout === 1 ? `border p-3 ${dark ? "border-background/20" : "border-border"}` : `flex items-start gap-3 border-b pb-3 last:border-0 ${dark ? "border-background/20" : "border-border"}`}`}
              >
                <span className={`${layout === 0 ? "absolute -left-3 top-0" : "shrink-0"} flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground`}>
                  {index + 1}
                </span>
                <div>
                  <h3 className={`text-sm font-bold leading-tight md:text-lg ${dark ? "text-background" : "text-foreground"}`}>
                    {step.label}
                  </h3>
                  {layout !== 1 && (
                    <p className={`mt-1 max-w-3xl text-xs leading-relaxed md:text-sm ${dark ? "text-background/70" : "text-muted-foreground"}`}>
                      {step.body}
                    </p>
                  )}
                </div>
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