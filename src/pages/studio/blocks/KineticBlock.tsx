import KineticStatement from "@/components/scroll/KineticStatement";
import { TEXTURE_COUNT, textureFor } from "./Texture";
import type { BlockProps } from "./shared";

/**
 * Momento escuro da página — seleção também ponderada pela dívida editorial.
 * A trama geométrica (versão escura do kit) é sorteada por versão e rotacionada
 * pela persona, então o momento cinético muda de textura entre landings.
 */
const KineticBlock = ({ content, rng, picker, persona }: BlockProps) => {
  if (!content.kinetic?.length) return null;
  const [item] = picker.pick(content.kinetic, 1, rng, (k) => [k.topic]);
  const texture = textureFor(persona, rng.int(TEXTURE_COUNT));
  return (
    <KineticStatement
      kicker={item.kicker}
      word={item.word}
      caption={item.caption}
      textureStyle={{ ...texture.style(true), opacity: texture.opacity * 0.7 }}
    />
  );
};

export default KineticBlock;
