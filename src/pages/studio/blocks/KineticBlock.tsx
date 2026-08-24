import KineticStatement from "@/components/scroll/KineticStatement";
import type { BlockProps } from "./shared";

/** The single dark moment of the page. */
const KineticBlock = ({ content, rng }: BlockProps) => {
  const item = rng.pick(content.kinetic);
  return <KineticStatement kicker={item.kicker} word={item.word} caption={item.caption} />;
};

export default KineticBlock;
