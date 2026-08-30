import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * AJUSTE AUTOMÁTICO AO QUADRO
 *
 * Copy de marca tem comprimento imprevisível: uma headline longa ou um sub com
 * duas frases estouravam o quadro 9x16/1x1 e o texto aparecia CORTADO na
 * borda inferior. Aqui o bloco é renderizado num contêiner maior que o quadro
 * e reduzido por `transform: scale`, então:
 *
 * - o fundo continua preenchendo o quadro inteiro (o contêiner mede 100/escala);
 * - o texto encolhe proporcionalmente até caber, sem reticências e sem corte;
 * - a exportação em PNG captura exatamente o que a tela mostra.
 *
 * A medição usa apenas nós de texto visíveis (folhas), ignorando ornamentos
 * decorativos que são propositalmente sangrados fora do quadro.
 */

/**
 * Piso da escala. 9x16 e 1x1 sobram menos altura que 4x5, então o piso precisa
 * ser baixo o suficiente para a copy longa caber em vez de sair cortada.
 */
const MIN_SCALE = 0.4;
/** Folga interna para o texto não encostar na borda do quadro. */
const SAFE_PAD = 6;
/** Limite de passadas: evita laço infinito se a medida oscilar. */
const MAX_PASSES = 14;


const measureNeeded = (root: HTMLElement) => {
  const frame = root.getBoundingClientRect();
  if (!frame.width || !frame.height) return null;

  let top = Infinity;
  let bottom = -Infinity;
  let left = Infinity;
  let right = -Infinity;
  let found = false;

  for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    if (el.getAttribute("aria-hidden") === "true") continue;
    if (el.dataset.studioNoExport === "1" || el.closest('[data-studio-no-export="1"]')) continue;
    if (el.children.length > 0) continue; // só folhas
    const text = el.textContent?.trim();
    if (!text) continue;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;

    const rect = el.getBoundingClientRect();
    if (!rect.height) continue;
    found = true;
    top = Math.min(top, rect.top);
    bottom = Math.max(bottom, rect.bottom);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
  }

  if (!found) return null;
  return {
    height: bottom - top,
    width: right - left,
    avail: { height: frame.height - SAFE_PAD * 2, width: frame.width - SAFE_PAD * 2 },
  };
};

type Props = {
  children: ReactNode;
  /** Muda quando a arte muda: zera a escala antes de medir de novo. */
  resetKey: string;
};

const AutoFit = ({ children, resetKey }: Props) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    setScale(1);
  }, [resetKey]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    let alive = true;

    const refine = () => {
      if (!alive || !frameRef.current) return;
      const needed = measureNeeded(frameRef.current);
      if (!needed) return;
      const fit = Math.min(
        needed.height > 0 ? needed.avail.height / needed.height : 1,
        needed.width > 0 ? needed.avail.width / needed.width : 1,
      );
      if (fit >= 0.995) return;
      setScale((current) => Math.max(MIN_SCALE, Number((current * fit).toFixed(3))));
    };

    // Três passadas: fontes/imagens chegam depois e mudam a quebra de linha.
    const timers = [90, 380, 900, 1600].map((delay) => window.setTimeout(refine, delay));
    return () => {
      alive = false;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [resetKey, scale]);

  return (
    <div ref={frameRef} className="relative h-full w-full overflow-hidden">
      <div
        className="origin-top-left"
        style={{
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AutoFit;
