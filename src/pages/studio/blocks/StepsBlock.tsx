import { motion } from "framer-motion";
import { Flame, Wrench, StretchHorizontal, Dumbbell, Target, Trophy } from "lucide-react";
import { sectionHeight, type BlockProps } from "./shared";

/**
 * STEPS — OS 6 DEGRAUS DA REABILITAÇÃO (arte exclusiva da marca Aliv.iA)
 *
 * Versão cartaz da peça institucional do método: a escada dos 6 degraus, cada
 * um com ícone, número e título. Só entra na composição quando a marca é a
 * Aliv.iA (`exclusive` em `composePage`) — é propriedade autoral do método.
 *
 * Tratamentos: 0 escada em degraus · 1 lista numerada · 2 grade 2x3 · 3 tinta escura.
 */
const STEPS = [
  { icon: Flame, title: "Controle de Dor & Inflamação" },
  { icon: Wrench, title: "Reparo & Cicatrização Tecidual" },
  { icon: StretchHorizontal, title: "Mobilidade & Flexibilidade" },
  { icon: Dumbbell, title: "Força & Resistência" },
  { icon: Target, title: "Controle Motor & Função" },
  { icon: Trophy, title: "Retorno ao Esporte & Alta" },
] as const;

const SKINS = [
  { bg: "bg-background", ink: "text-foreground", card: "bg-card border-border/60", accent: "text-primary", chip: "bg-primary/10" },
  { bg: "bg-accent/40", ink: "text-foreground", card: "bg-card border-border/60", accent: "text-primary", chip: "bg-primary/10" },
  { bg: "bg-primary/5", ink: "text-foreground", card: "bg-card border-border/60", accent: "text-primary", chip: "bg-primary/10" },
  { bg: "bg-foreground", ink: "text-background", card: "bg-background/10 border-background/20", accent: "text-primary", chip: "bg-background/15" },
] as const;

const StepsBlock = ({ treatment, format }: BlockProps) => {
  const skin = SKINS[treatment % SKINS.length];
  const layout = treatment % SKINS.length;

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-center overflow-hidden px-6 py-16 ${skin.bg}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-2xl pb-16"
      >
        <p className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] ${skin.accent}`}>
          Método Aliv.iA
        </p>
        <h2 className={`mb-8 text-3xl font-bold leading-[1.05] md:text-5xl ${skin.ink}`}>
          STEPS — os 6 degraus da reabilitação
        </h2>

        {layout === 1 ? (
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className={`flex items-center gap-4 border-b pb-3 ${skin.card}`}>
                <span className={`text-2xl font-black tabular-nums ${skin.accent}`}>{i + 1}</span>
                <span className={`text-base font-medium leading-tight md:text-lg ${skin.ink}`}>{step.title}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className={layout === 2 ? "grid grid-cols-2 gap-3" : "space-y-2.5"}>
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm ${skin.card}`}
                  style={layout === 0 ? { marginLeft: `${i * 7}%` } : undefined}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${skin.chip}`}>
                    <Icon className={`h-4.5 w-4.5 ${skin.accent}`} style={{ width: 18, height: 18 }} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[9px] font-bold uppercase tracking-[0.2em] ${skin.accent}`}>
                      Step {i + 1}
                    </span>
                    <span className={`block text-sm font-medium leading-tight ${skin.ink}`}>{step.title}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p className={`mt-8 text-sm leading-relaxed opacity-80 ${skin.ink}`}>
          Cada fase do tratamento é mapeada a esses degraus: sabemos exatamente onde você está e
          para onde precisa ir.
        </p>
      </motion.div>
    </section>
  );
};

export default StepsBlock;
