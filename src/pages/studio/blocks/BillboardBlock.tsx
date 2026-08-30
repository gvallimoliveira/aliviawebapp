import { motion } from "framer-motion";
import { BRAND_NAME } from "../brand";
import { pickHeadline, sectionHeight, type BlockProps } from "./shared";

/**
 * OUTDOOR NA PAREDE (referência: quadro branco na parede com duas pessoas
 * desfocadas se cruzando na calçada)
 *
 * Leitura da peça: duas pessoas se cruzam na rua por acaso — o encontro entre
 * quem sente dor e quem sabe tratar não deveria depender de sorte. O outdoor na
 * parede carrega exatamente essa mensagem de conexão, sempre assinada pela
 * marca.
 *
 * Tratamentos: 0/1 parede clara com sombra de folhagem · 2 parede areia ·
 * 3 parede escura (noturna).
 */
const WALLS = [
  { wall: "bg-muted", frame: "bg-background", ink: "text-foreground", floor: "bg-muted-foreground/25" },
  { wall: "bg-secondary/50", frame: "bg-background", ink: "text-foreground", floor: "bg-muted-foreground/25" },
  { wall: "bg-accent", frame: "bg-background", ink: "text-foreground", floor: "bg-accent-foreground/20" },
  { wall: "bg-foreground", frame: "bg-background", ink: "text-foreground", floor: "bg-background/25" },
] as const;

/** Silhueta caminhando — desfoque simula o movimento da referência. */
const Walker = ({ flip, className }: { flip?: boolean; className: string }) => (
  <svg
    aria-hidden
    viewBox="0 0 40 100"
    className={className}
    style={{ filter: "blur(1.6px)", transform: flip ? "scaleX(-1)" : undefined }}
  >
    <circle cx="20" cy="10" r="7" fill="hsl(var(--foreground) / 0.75)" />
    <path
      d="M20 18 C11 20 9 32 10 44 L12 60 L8 92 L14 92 L19 66 L24 92 L30 92 L27 58 L30 42 C31 30 28 20 20 18 Z"
      fill="hsl(var(--foreground) / 0.75)"
    />
  </svg>
);

const BillboardBlock = ({ content, rng, treatment, format, persona }: BlockProps) => {
  const skin = WALLS[treatment % WALLS.length];
  const headline = pickHeadline(rng, content.headlines, persona.headlineTaste);
  const closing = rng.pick(content.closings);
  // Altura percentual do quadro: a calçada acompanha a proporção escolhida.
  const streetHeight = frameHeight(format, { "9x16": 27, "4x5": 25, "1x1": 20 });

  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col justify-center overflow-hidden ${skin.wall}`}
    >
      {/* Sombra de folhagem sobre a parede. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "radial-gradient(closest-side, hsl(var(--foreground)) 0%, transparent 72%), radial-gradient(closest-side, hsl(var(--foreground)) 0%, transparent 72%), radial-gradient(closest-side, hsl(var(--foreground)) 0%, transparent 72%)",
          backgroundSize: "34% 20%, 26% 16%, 20% 12%",
          backgroundPosition: "6% 10%, 30% 4%, 62% 16%",
          backgroundRepeat: "no-repeat",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto w-[86%] max-w-2xl"
      >
        {/* O outdoor: mensagem de conexão entre paciente e profissional. */}
        <div
          className={`rounded-sm border-[10px] border-[hsl(35_25%_62%)] px-7 py-10 shadow-[0_40px_80px_-50px_hsl(var(--foreground)/0.7)] ${skin.frame} ${skin.ink}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
            {rng.pick(content.kickers)}
          </p>
          <p className="mt-5 text-2xl font-light leading-[1.12] tracking-tight md:text-4xl">
            Duas pessoas se cruzam na rua por acaso.
          </p>
          <p className="text-2xl font-bold leading-[1.12] tracking-tight md:text-4xl">
            {headline.strong}
          </p>
          <p className="text-2xl font-light leading-[1.12] tracking-tight md:text-4xl">
            {headline.rest}
          </p>
          <p className="mt-6 text-[12px] leading-relaxed text-muted-foreground md:text-sm">
            {closing.sub}
          </p>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
            {BRAND_NAME}
          </p>
        </div>
      </motion.div>

      {/* Calçada + as duas pessoas se cruzando em sentidos opostos. */}
      <div className="relative z-10 mt-8 w-full" style={streetHeight}>
        <div className={`absolute bottom-0 left-0 right-0 h-[38%] ${skin.floor}`} />
        <Walker className="absolute bottom-[4%] left-[14%] h-[80%]" />
        <Walker flip className="absolute bottom-[4%] right-[16%] h-[74%]" />
      </div>
    </section>
  );
};

export default BillboardBlock;
