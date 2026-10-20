import type { MaigneAxis, MaigneStar } from "@/lib/spineBiomechanics";

// Geometria fiel ao desenho: F em cima, E embaixo, RE/RD na horizontal,
// IE/ID nas diagonais superiores; metade inferior só com a haste de E.
const C = { x: 120, y: 125 };
const ENDS: Record<MaigneAxis, { x: number; y: number; lx: number; ly: number; main: string; sub?: string }> = {
  F: { x: 120, y: 20, lx: 132, ly: 26, main: "F" },
  E: { x: 120, y: 225, lx: 132, ly: 232, main: "E" },
  RE: { x: 25, y: 125, lx: 16, ly: 148, main: "R", sub: "E" },
  RD: { x: 215, y: 125, lx: 214, ly: 148, main: "R", sub: "D" },
  IE: { x: 55, y: 55, lx: 36, ly: 46, main: "I", sub: "E" },
  ID: { x: 185, y: 55, lx: 192, ly: 46, main: "I", sub: "D" },
};

interface Props {
  value: MaigneStar;
  onChange?: (v: MaigneStar) => void;
  size?: number;
}

const SpineMaigneStar = ({ value, onChange, size = 240 }: Props) => {
  const cycle = (a: MaigneAxis) => onChange?.({ ...value, [a]: ((value[a] || 0) + 1) % 4 });
  return (
    <svg viewBox="0 0 240 245" width={size} height={size * (245 / 240)} role="group" aria-label="Estrela de Maigne" className="select-none">
      {(Object.keys(ENDS) as MaigneAxis[]).map((a) => {
        const e = ENDS[a];
        const n = value[a] || 0;
        const dx = e.x - C.x, dy = e.y - C.y;
        const len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const px = -uy, py = ux;
        const ticks = Array.from({ length: n }, (_, i) => {
          const t = 0.55 + i * 0.12;
          const cx = C.x + dx * t, cy = C.y + dy * t;
          return { x1: cx + px * 8, y1: cy + py * 8, x2: cx - px * 8, y2: cy - py * 8 };
        });
        const active = n > 0;
        return (
          <g
            key={a}
            onClick={() => cycle(a)}
            className={onChange ? "cursor-pointer" : undefined}
            role={onChange ? "button" : undefined}
            aria-label={`${e.main}${e.sub ?? ""}: ${n} traço(s)`}
          >
            <line x1={C.x} y1={C.y} x2={e.x} y2={e.y} stroke="transparent" strokeWidth={22} />
            <line
              x1={C.x} y1={C.y} x2={e.x} y2={e.y}
              strokeWidth={active ? 3 : 2}
              strokeLinecap="round"
              className={active ? "stroke-destructive" : "stroke-primary"}
            />
            {ticks.map((t, i) => (
              <line key={i} {...t} strokeWidth={3} strokeLinecap="round" className="stroke-destructive" />
            ))}
            <text x={e.lx} y={e.ly} className="fill-foreground" fontSize={18} fontWeight={500}>
              {e.main}
              {e.sub && <tspan fontSize={12} dy={5}>{e.sub}</tspan>}
            </text>
          </g>
        );
      })}
      <circle cx={C.x} cy={C.y} r={3} className="fill-primary" />
    </svg>
  );
};

export default SpineMaigneStar;
