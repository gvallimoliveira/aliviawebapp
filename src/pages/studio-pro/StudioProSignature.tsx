import { useEffect, useRef, useState } from "react";
import { StudioSignature, BRAND_NAME } from "@/studio-core";
import type { SignatureCorner } from "@/pages/studio/blocks/StudioSignature";

/**
 * ASSINATURA DA MARCA NAS ARTES DO STUDIO PÚBLICO
 *
 * Toda arte gerada sai assinada (logo + nome da marca ativa) no canto que melhor
 * encaixa — protege o material contra print e cópia sem crédito. A assinatura:
 * - adapta o tom (claro/escuro) ao fundo real da arte;
 * - varia o canto por arte, para não brigar com o conteúdo;
 * - não duplica quando o próprio layout já traz logo ou wordmark;
 * - pode ser desligada por marca no ajuste "Assinatura da marca nos conteúdos".
 */

/** Luminância do fundo real da arte — decide a versão mono clara ou escura. */
const isDarkSurface = (node: HTMLElement): boolean => {
  const candidates: Element[] = [node, ...Array.from(node.querySelectorAll("section, div"))].slice(0, 8);
  for (const el of candidates) {
    const bg = window.getComputedStyle(el as HTMLElement).backgroundColor;
    const match = bg.match(/rgba?\(([^)]+)\)/);
    if (!match) continue;
    const parts = match[1].split(",").map((v) => parseFloat(v));
    const alpha = parts[3] ?? 1;
    if (alpha < 0.5) continue;
    const [r, g, b] = parts;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
  }
  return false;
};

/** Hash estável: mesma arte, mesmo canto. */
const cornerFor = (key: string): SignatureCorner => {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) % 9973;
  return (["br", "bl", "tl"] as const)[h % 3];
};

type Props = {
  /** Chave estável da arte (marca + seed + índice). */
  artKey: string;
  /** Ajuste global da marca: assinar os conteúdos? */
  enabled: boolean;
  children: React.ReactNode;
};

const StudioProSignature = ({ artKey, enabled, children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(false);
  const [signed, setSigned] = useState(false);
  const corner = cornerFor(artKey);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const id = window.setTimeout(() => {
      setDark(isDarkSurface(node));
      const hasLogo = !!node.querySelector("img[data-brand-logo], img[alt='logo']");
      const hasWordmark = !!BRAND_NAME && (node.textContent ?? "").includes(BRAND_NAME);
      setSigned(hasLogo || hasWordmark);
    }, 60);
    return () => window.clearTimeout(id);
  }, [artKey, enabled]);

  return (
    <div ref={ref} className="relative">
      {children}
      {enabled && !signed && <StudioSignature dark={dark} corner={corner} />}
    </div>
  );
};

export default StudioProSignature;
