import { useEffect, useRef, useState } from "react";
import { StudioSignature } from "@/studio-core";
import type { SignatureCorner } from "@/pages/studio/blocks/StudioSignature";

/**
 * ASSINATURA DA MARCA NAS ARTES DO STUDIO PÚBLICO
 *
 * Toda arte gerada sai assinada (logo + nome da marca ativa) no canto que melhor
 * encaixa — protege o material contra print e cópia sem crédito. A assinatura:
 * - adapta o tom (claro/escuro) ao fundo real da arte;
 * - varia o canto por arte, para não brigar com o conteúdo;
 * - só é omitida quando o próprio layout JÁ traz um lockup grande da marca
 *   (logo visível ou o nome em tipografia destacada) — qualquer dúvida, assina;
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

/**
 * A arte já traz um lockup evidente da marca?
 * Critério apertado, para nunca deixar uma arte sem assinatura por engano:
 * - o modelo declara a própria assinatura (`data-studio-own-lockup="1"`); ou
 * - uma imagem de logo ou símbolo REALMENTE visível (>= 40px de lado); ou
 * - o nome da marca em tipografia grande (>= 22px), como wordmark do layout.
 */
export const hasOwnLockup = (node: HTMLElement, brandName: string): boolean => {
  // Modelos que já fecham com logo + @ da marca no pé (ex.: "Frase de impacto")
  // se declaram assinados — assim a arte não sai com duas assinaturas.
  if (node.querySelector('[data-studio-own-lockup="1"]')) return true;

  const logos = Array.from(node.querySelectorAll<HTMLImageElement>("img")).filter((img) => {
    const alt = (img.getAttribute("alt") ?? "").trim().toLowerCase();
    const isBrandImg =
      img.hasAttribute("data-brand-logo") ||
      img.hasAttribute("data-brand-mark") ||
      alt === "logo" ||
      (!!brandName && alt === brandName.toLowerCase());
    if (!isBrandImg) return false;
    const rect = img.getBoundingClientRect();
    return rect.width >= 40 && rect.height >= 40;
  });
  if (logos.length > 0) return true;


  const name = brandName.trim();
  if (!name) return false;
  const target = name.toLowerCase();
  const texts = Array.from(node.querySelectorAll<HTMLElement>("span, p, h1, h2, h3, figcaption, div"));
  return texts.some((el) => {
    const text = (el.textContent ?? "").trim().toLowerCase();
    if (text !== target) return false;
    const size = parseFloat(window.getComputedStyle(el).fontSize || "0");
    return size >= 22;
  });
};

type Props = {
  /** Chave estável da arte (marca + seed + índice). */
  artKey: string;
  /** Ajuste global da marca: assinar os conteúdos? */
  enabled: boolean;
  /** Nome da marca ativa — usado para reconhecer wordmarks do próprio layout. */
  brandName?: string;
  children: React.ReactNode;
};

const StudioProSignature = ({ artKey, enabled, brandName = "", children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(false);
  const [signed, setSigned] = useState(false);
  const corner = cornerFor(artKey);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const id = window.setTimeout(() => {
      setDark(isDarkSurface(node));
      setSigned(hasOwnLockup(node, brandName));
    }, 120);
    return () => window.clearTimeout(id);
  }, [artKey, enabled, brandName]);

  return (
    <div ref={ref} className="relative h-full w-full">
      {children}
      {enabled && !signed && <StudioSignature dark={dark} corner={corner} />}
    </div>
  );
};

export default StudioProSignature;
