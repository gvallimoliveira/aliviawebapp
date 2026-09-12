import { motion } from "framer-motion";
import { sectionHeight, type BlockProps } from "./shared";

/**
 * SAIR DA FILA (referência: aviões de papel brancos em trilhas paralelas e um
 * amarelo cortando na diagonal — "BE THE DIFFERENCE")
 *
 * Leitura da referência: todo mundo segue a mesma rota; a marca é o desvio.
 * As trilhas horizontais são o mercado; a diagonal é a promessa da marca.
 * Nada de avião realista — geometria limpa, ponta de seta como origami.
 *
 * Tratamentos: 0 grafite · 1 claro · 2 fundo da marca · 3 grafite com
 * tipografia gigante.
 */
const SKINS = [
  { bg: "bg-foreground", ink: "text-background", trail: "hsl(var(--background)/0.45)", plane: "hsl(var(--background)/0.75)" },
  { bg: "bg-background", ink: "text-foreground", trail: "hsl(var(--foreground)/0.3)", plane: "hsl(var(--foreground)/0.35)" },
  { bg: "bg-accent/40", ink: "text-foreground", trail: "hsl(var(--foreground)/0.3)", plane: "hsl(var(--foreground)/0.35)" },
  { bg: "bg-foreground", ink: "text-background", trail: "hsl(var(--background)/0.35)", plane: "hsl(var(--background)/0.6)" },
] as const;

/** Origami em geometria pura: um triângulo com dobra central. */
const Plane = ({ x, y, color, scale = 1 }: { x: number; y: number; color: string; scale?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <polygon points="0,0 34,11 0,22" fill={color} />
    <polygon points="0,0 34,11 6,11" fill={color} opacity="0.55" />
  </g>
);

const DivergeBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const skin = SKINS[treatment % SKINS.length];
  const big = treatment % SKINS.length === 3;
  const headline = rng.pick(content.headlines);
  const rows = [92, 132, 172, 212, 252, 292];

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden px-8 py-16 ${skin.bg}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg pb-20"
      >
        <h2
          className={`mb-4 leading-[1.02] ${skin.ink}`}
          style={{ fontSize: big ? "clamp(2.4rem, 12vw, 4.8rem)" : "clamp(1.7rem, 8vw, 3rem)" }}
        >
          {/* A ordem da frase NUNCA é invertida: inverter quebra a interpretação. */}
          <span className="font-black uppercase tracking-tight">{headline.strong}</span>
          <span className="font-light opacity-70">{headline.rest}</span>

        </h2>

        <svg viewBox="0 0 360 340" className="w-full" role="img" aria-label={headline.strong}>
          {/* Trilhas do mercado: todas iguais, todas horizontais. */}
          {rows.map((y, i) => (
            <g key={y}>
              <line
                x1="0"
                y1={y}
                x2={272 - i * 4}
                y2={y}
                stroke={skin.trail}
                strokeWidth="1.6"
                strokeDasharray="9 8"
              />
              <Plane x={282 - i * 2} y={y - 11} color={skin.plane} scale={0.92} />
            </g>
          ))}

          {/* O desvio: trilha diagonal e avião em cor de marca. */}
          {/* Traço sempre visível: pathLength começa em 1 para não sair vazio. */}
          <line
            x1="0"
            y1="322"
            x2="150"
            y2="86"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeDasharray="9 8"
          />
          <g transform="rotate(-52 168 62)">
            <Plane x={150} y={50} color="hsl(var(--primary))" scale={1.25} />
          </g>
        </svg>
      </motion.div>
    </section>
  );
};

export default DivergeBlock;
