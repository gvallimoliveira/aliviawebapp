import { motion } from "framer-motion";
import { BRAND_MARK, BRAND_NAME } from "../brand";
import { sectionHeight, type BlockProps } from "./shared";

/**
 * CICLO D.I.F.I. (arte exclusiva da marca Aliv.iA)
 *
 * Versão cartaz do diagrama institucional: Dor → Inibição → Fraqueza →
 * Incapacidade em círculo, com a marca no centro rompendo o ciclo. Só entra
 * na composição quando a marca é a Aliv.iA (`exclusive` em `composePage`).
 *
 * Tratamentos: 0 claro · 1 areia · 2 tinta escura · 3 claro com letras gigantes.
 */
const NODES = [
  { letter: "D", label: "Dor" },
  { letter: "I", label: "Inibição" },
  { letter: "F", label: "Fraqueza" },
  { letter: "I", label: "Incapacidade" },
] as const;

const SKINS = [
  { bg: "bg-background", ink: "text-foreground", node: "bg-card border-destructive/30", letter: "text-destructive" },
  { bg: "bg-accent/40", ink: "text-foreground", node: "bg-card border-destructive/30", letter: "text-destructive" },
  { bg: "bg-foreground", ink: "text-background", node: "bg-background/10 border-background/30", letter: "text-background" },
  { bg: "bg-primary/5", ink: "text-foreground", node: "bg-card border-destructive/30", letter: "text-destructive" },
] as const;

const POSITIONS: React.CSSProperties[] = [
  { top: "0%", left: "50%", transform: "translateX(-50%)" },
  { top: "50%", right: "0%", transform: "translateY(-50%)" },
  { bottom: "0%", left: "50%", transform: "translateX(-50%)" },
  { top: "50%", left: "0%", transform: "translateY(-50%)" },
];

const DifiBlock = ({ treatment, format }: BlockProps) => {
  const skin = SKINS[treatment % SKINS.length];
  const stroke = treatment % SKINS.length === 2 ? "hsl(var(--background))" : "hsl(var(--destructive))";

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden px-6 py-16 ${skin.bg}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xl pb-16 text-center"
      >
        <p className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] ${skin.ink} opacity-70`}>
          Método {BRAND_NAME}
        </p>
        <h2
          className={`mb-2 font-bold leading-[1.05] ${skin.ink}`}
          style={{ fontSize: treatment % SKINS.length === 3 ? "clamp(2.2rem, 11vw, 4.5rem)" : "clamp(1.8rem, 8vw, 3rem)" }}
        >
          Ciclo D.I.F.I. — por que a dor não melhora?
        </h2>

        <div className="relative mx-auto my-12 h-64 w-64 sm:h-72 sm:w-72">
          <svg className="absolute inset-[15%] h-[70%] w-[70%]" viewBox="0 0 320 320">
            <circle cx="160" cy="160" r="120" fill="none" stroke={stroke} strokeWidth="2" strokeDasharray="6 6" opacity="0.35" />
            {[
              "M 160 40 A 120 120 0 0 1 280 160",
              "M 280 160 A 120 120 0 0 1 160 280",
              "M 160 280 A 120 120 0 0 1 40 160",
              "M 40 160 A 120 120 0 0 1 160 40",
            ].map((d) => (
              <path key={d} d={d} fill="none" stroke={stroke} strokeWidth="2.5" markerEnd="url(#difi-arrow)" opacity="0.75" />
            ))}
            <defs>
              <marker id="difi-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={stroke} opacity="0.75" />
              </marker>
            </defs>
          </svg>

          {NODES.map((node, i) => (
            <div key={node.label} className="absolute flex flex-col items-center" style={POSITIONS[i]}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-md ${skin.node}`}>
                <span className={`text-base font-black ${skin.letter}`}>{node.letter}</span>
              </span>
              <span className={`mt-1 whitespace-nowrap text-[10px] font-semibold ${skin.ink}`}>{node.label}</span>
            </div>
          ))}

          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg">
              <img
                src={BRAND_MARK}
                alt={`Símbolo ${BRAND_NAME}`}
                className="h-12 w-12 scale-125 object-contain"
              />
            </span>
            <span className="mt-1 whitespace-nowrap text-[9px] font-bold text-primary">{BRAND_NAME}</span>
          </div>
        </div>

        <p className={`text-sm leading-relaxed opacity-80 ${skin.ink}`}>
          Dor altera o movimento e pode inibir a ativação muscular. Menos recrutamento favorece
          fraqueza; menos força limita tarefas e aumenta a incapacidade, que pode alimentar a dor.
          A {BRAND_NAME} organiza a avaliação e a progressão para romper esse ciclo no ponto certo.
        </p>
      </motion.div>
    </section>
  );
};

export default DifiBlock;
