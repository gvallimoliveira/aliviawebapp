import { TEXTURE_COUNT, textureFor } from "./Texture";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";
import { displayWordContainer, displayWordStyle } from "../typographyGuards";

/**
 * Momento escuro da página — seleção também ponderada pela dívida editorial.
 * A trama geométrica (versão escura do kit) é sorteada por versão e rotacionada
 * pela persona, então o momento cinético muda de textura entre landings.
 */
const KineticBlock = ({ content, rng, picker, persona, format }: BlockProps) => {
  if (!content.kinetic?.length) return null;
  const [item] = picker.pick(content.kinetic, 1, rng, (k) => [k.topic]);
  const texture = textureFor(persona, rng.int(TEXTURE_COUNT));
  return (
    <section className={`relative flex ${sectionHeight(format)} items-center justify-center overflow-hidden bg-foreground text-background`}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ ...texture.style(true), opacity: texture.opacity * 0.7 }} />
      <div aria-hidden className="pointer-events-none absolute inset-[10%] opacity-40">
        <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-background/70" />
        <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-background/70" />
        <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-background/70" />
        <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-background/70" />
      </div>
      <div className={`relative z-10 w-full text-center ${blockPadding(format)}`}>
        {item.kicker && <p className="mb-5 text-xs font-medium uppercase text-background/80">{item.kicker}</p>}
        <div style={displayWordContainer}>
          <h2 className="font-semibold leading-none text-background" style={displayWordStyle(item.word, { widthPct: 92, maxRem: 5 })}>{item.word}</h2>
        </div>
        {item.caption && <p className="mx-auto mt-8 max-w-md text-sm leading-relaxed text-background/80 md:text-base">{item.caption}</p>}
      </div>
    </section>
  );
};

export default KineticBlock;
