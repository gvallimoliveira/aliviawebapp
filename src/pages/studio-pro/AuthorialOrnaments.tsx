import { createRng } from "@/pages/studio/rng";

/**
 * ORNAMENTOS DO MODO AUTORAL
 *
 * Slides sem foto do acervo não devem ficar com fundo completamente liso.
 * Aqui entram camadas gráficas discretas — chuva, linhas, geometria leve —
 * sempre em opacidade baixa e em tokens semânticos (primary/foreground), para
 * dar textura sem competir com a leitura do texto autoral.
 *
 * Determinístico: a mesma chave de arte + slide devolve sempre o mesmo desenho.
 */

export type OrnamentTone = "normal" | "inverse";

const ORNAMENTS = ["rain", "hlines", "geometry", "grid", "arcs", "dots", "diagonals"] as const;
export type OrnamentKind = (typeof ORNAMENTS)[number];

export const ornamentFor = (seed: string): OrnamentKind => {
  const rng = createRng(`${seed}:ornament`);
  return ORNAMENTS[rng.int(ORNAMENTS.length)];
};

type Props = {
  /** Semente estável (chave da arte + índice do slide). */
  seed: string;
  tone?: OrnamentTone;
};

const AuthorialOrnaments = ({ seed, tone = "normal" }: Props) => {
  const kind = ornamentFor(seed);
  const rng = createRng(`${seed}:ornament:draw`);

  // Traço/preenchimento sempre semântico; opacidade baixa por design.
  const stroke = tone === "inverse" ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))";
  const soft = tone === "inverse" ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))";
  const base = tone === "inverse" ? 0.22 : 0.14;

  const rain = Array.from({ length: 46 }, () => ({
    x: rng.int(1000),
    y: rng.int(1000),
    len: 26 + rng.int(70),
    o: 0.25 + rng.int(60) / 100,
  }));

  const dots = Array.from({ length: 60 }, () => ({
    x: rng.int(1000),
    y: rng.int(1000),
    r: 1.5 + rng.int(3),
  }));

  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: base }}
    >
      {kind === "rain" &&
        rain.map((d, i) => (
          <line
            key={i}
            x1={d.x}
            y1={d.y}
            x2={d.x - d.len * 0.28}
            y2={d.y + d.len}
            stroke={stroke}
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={d.o}
          />
        ))}

      {kind === "hlines" &&
        Array.from({ length: 22 }, (_, i) => (
          <line
            key={i}
            x1={0}
            y1={i * 46 + 12}
            x2={1000}
            y2={i * 46 + 12}
            stroke={soft}
            strokeWidth={i % 4 === 0 ? 1.8 : 0.8}
            opacity={i % 4 === 0 ? 0.9 : 0.45}
          />
        ))}

      {kind === "diagonals" &&
        Array.from({ length: 26 }, (_, i) => (
          <line
            key={i}
            x1={i * 80 - 400}
            y1={-50}
            x2={i * 80 + 200}
            y2={1050}
            stroke={soft}
            strokeWidth={i % 3 === 0 ? 1.6 : 0.7}
            opacity={i % 3 === 0 ? 0.8 : 0.4}
          />
        ))}

      {kind === "grid" && (
        <>
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`v${i}`} x1={i * 80} y1={0} x2={i * 80} y2={1000} stroke={soft} strokeWidth={0.7} opacity={0.5} />
          ))}
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 80} x2={1000} y2={i * 80} stroke={soft} strokeWidth={0.7} opacity={0.5} />
          ))}
        </>
      )}

      {kind === "geometry" && (
        <>
          <circle cx={840} cy={180} r={190} stroke={stroke} strokeWidth={1.6} fill="none" opacity={0.9} />
          <circle cx={760} cy={260} r={90} stroke={stroke} strokeWidth={1.2} fill="none" opacity={0.7} />
          <rect x={80} y={700} width={300} height={300} stroke={soft} strokeWidth={1.4} fill="none" opacity={0.6} />
          <path d="M0 620 L360 620 L520 780" stroke={stroke} strokeWidth={1.6} fill="none" opacity={0.7} />
        </>
      )}

      {kind === "arcs" && (
        <>
          <path d="M-60 900 Q 300 620 700 900" stroke={stroke} strokeWidth={1.6} fill="none" opacity={0.85} />
          <path d="M-60 960 Q 300 680 760 960" stroke={stroke} strokeWidth={1} fill="none" opacity={0.6} />
          <path d="M300 -60 Q 640 220 1060 60" stroke={soft} strokeWidth={1.2} fill="none" opacity={0.5} />
        </>
      )}

      {kind === "dots" &&
        dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={stroke} opacity={0.55} />)}
    </svg>
  );
};

export default AuthorialOrnaments;
