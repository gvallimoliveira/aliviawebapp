import { motion } from "framer-motion";
import { BRAND_NAME } from "../brand";
import { sectionHeight, type BlockProps } from "./shared";

/**
 * CONSTELAÇÃO DA MARCA (referência: "BRAND" com palavras ligadas por alfinetes)
 *
 * O nome da EMPRESA no centro, em tipografia serifada gigante, e os pilares
 * ligados por hastes finas com ponto. As palavras são em português e vêm dos
 * pilares editoriais — nunca termos genéricos em inglês.
 *
 * Tratamentos: 0 tinta escura · 1 teal · 2 areia · 3 fundo claro.
 */
const SKINS = [
  { bg: "bg-foreground", ink: "text-background", word: "text-primary" },
  { bg: "bg-primary", ink: "text-primary-foreground", word: "text-primary-foreground" },
  { bg: "bg-accent", ink: "text-accent-foreground", word: "text-primary" },
  { bg: "bg-background", ink: "text-foreground", word: "text-primary" },
] as const;

/** Pilares em português — a leitura da marca, não jargão importado. */
const PILLARS = [
  "Propósito",
  "Mensagem",
  "Clareza",
  "Valores",
  "História",
  "Autenticidade",
  "Conexão",
  "Método",
  "Confiança",
  "Cuidado",
] as const;

const Pin = ({
  label,
  height,
  up,
  ink,
}: {
  label: string;
  height: number;
  up: boolean;
  ink: string;
}) => (
  <div className={`flex flex-col items-center ${up ? "" : "flex-col-reverse"} ${ink}`}>
    <span className="text-[10px] font-light tracking-[0.22em] md:text-xs">{label}</span>
    <span className="my-1 h-1.5 w-1.5 rounded-full bg-current opacity-90" />
    <span className="w-px bg-current opacity-70" style={{ height }} />
  </div>
);

const ConstellationBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const skin = SKINS[treatment % SKINS.length];
  const pool = rng.shuffle([...PILLARS]);
  const top = pool.slice(0, 4);
  const bottom = pool.slice(4, 7);

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden px-6 ${skin.bg}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-3xl"
      >
        <div className="flex items-end justify-center gap-[8%]">
          {top.map((label, i) => (
            <Pin key={label} label={label} height={26 + ((i * 17) % 44)} up ink={skin.ink} />
          ))}
        </div>

        <h2
          className={`text-center font-serif leading-[0.9] tracking-[-0.01em] ${skin.word}`}
          style={{ fontSize: "clamp(2.6rem, 15vw, 7rem)" }}
        >
          {BRAND_NAME}
        </h2>

        <div className="flex items-start justify-center gap-[12%]">
          {bottom.map((label, i) => (
            <Pin key={label} label={label} height={24 + ((i * 21) % 40)} up={false} ink={skin.ink} />
          ))}
        </div>

        <p className={`mt-10 text-center text-[11px] font-light tracking-[0.18em] opacity-80 md:text-sm ${skin.ink}`}>
          {rng.pick(content.subs)}
        </p>
      </motion.div>
    </section>
  );
};

export default ConstellationBlock;
