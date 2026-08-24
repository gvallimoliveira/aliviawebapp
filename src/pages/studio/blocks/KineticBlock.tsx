import KineticStatement from "@/components/scroll/KineticStatement";
import type { BlockProps } from "./shared";

/** Momento escuro da página — seleção também ponderada pela dívida editorial. */
const KineticBlock = ({ content, rng, picker }: BlockProps) => {
  const [item] = picker.pick(content.kinetic, 1, rng, (k) => [k.topic]);
  return <KineticStatement kicker={item.kicker} word={item.word} caption={item.caption} />;
};

export default KineticBlock;
