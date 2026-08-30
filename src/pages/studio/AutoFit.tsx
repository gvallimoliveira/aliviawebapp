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
  const passes = useRef(0);

  useLayoutEffect(() => {
    passes.current = 0;
    setScale(1);
  }, [resetKey]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    let alive = true;
    const timers: number[] = [];
    let frame = 0;

    /**
     * Ajusta a escala até a copy caber no quadro. Encolhe quando estoura e
     * volta a crescer (até 1) quando sobra espaço — é isso que faz 9x16 e 1x1
     * pararem de cortar texto sem ficarem minúsculos.
     */
    const refine = () => {
      if (!alive || !frameRef.current) return;
      if (passes.current >= MAX_PASSES) return;
      const needed = measureNeeded(frameRef.current);
      if (!needed) return;
      const fit = Math.min(
        needed.height > 0 ? needed.avail.height / needed.height : 1,
        needed.width > 0 ? needed.avail.width / needed.width : 1,
      );
      // Estourou: encolhe. Sobrou folga significativa: cresce de volta.
      const shrink = fit < 0.995;
      const grow = fit > 1.06;
      if (!shrink && !grow) return;
      passes.current += 1;
      setScale((current) => {
        if (shrink) return Math.max(MIN_SCALE, Number((current * fit).toFixed(3)));
        if (current >= 1) return current;
        return Math.min(1, Number((current * Math.min(fit, 1.25)).toFixed(3)));
      });
    };

    // Mede no próximo frame e depois em intervalos: fontes e imagens chegam
    // atrasadas e mudam a quebra de linha.
    frame = window.requestAnimationFrame(refine);
    timers.push(...[120, 400, 900, 1600].map((delay) => window.setTimeout(refine, delay)));

    // Fontes carregadas e mudança de largura (rotação, resize) remedem.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready?.then(() => refine()).catch(() => undefined);

    let lastWidth = node.getBoundingClientRect().width;
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            const width = node.getBoundingClientRect().width;
            if (Math.abs(width - lastWidth) < 2) return;
            lastWidth = width;
            passes.current = 0;
            setScale(1);
          });
    observer?.observe(node);


    return () => {
      alive = false;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
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
