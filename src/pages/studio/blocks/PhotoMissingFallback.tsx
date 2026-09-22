import { TextureLayer } from "./Texture";
import { blockPadding, personaSurface, sectionHeight, type BlockProps } from "./shared";

type PhotoMissingFallbackProps = Pick<BlockProps, "format" | "persona" | "treatment"> & {
  tag: string;
  title: string;
  description: string;
};

/**
 * Rebaixa uma vaga fotográfica sem nexo para uma arte editorial completa.
 * A foto nunca é forçada e a vaga nunca desaparece do lote.
 */
const PhotoMissingFallback = ({
  format,
  persona,
  treatment,
  tag,
  title,
  description,
}: PhotoMissingFallbackProps) => (
  <section
    data-studio-photo-fallback="1"
    className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${personaSurface(persona, treatment + 3)}`}
  >
    <TextureLayer persona={persona} index={treatment + 7} />
    <div className={`container relative ${blockPadding(format)}`}>
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary md:text-xs">
          {tag}
        </p>
        <h2 className="break-words [overflow-wrap:anywhere] text-3xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
          {title}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-xl">
          {description}
        </p>
      </div>
    </div>
  </section>
);

export default PhotoMissingFallback;