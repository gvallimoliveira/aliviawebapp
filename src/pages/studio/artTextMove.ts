/**
 * REPOSICIONAMENTO DE TEXTO NA ARTE (arrastar com alça)
 *
 * Alguns modelos exigem que a frase caia num ponto exato do desenho — o caso
 * mais claro é o modelo "Frase de impacto", em que a frase minúscula precisa
 * ficar dentro do vão da pinça da mão. Em vez de mapear cada modelo na mão, o
 * dono da marca liga o modo "Mover texto" e arrasta a frase até o lugar.
 *
 * REGRA DE SEGURANÇA: o texto NUNCA é arrastável pelo corpo dele. O arraste só
 * acontece por uma alça redonda (um ponto com a seta de mover) desenhada ao
 * lado de cada texto. Assim ninguém desloca uma frase por engano ao rolar a
 * página ou ao tocar na arte no celular.
 *
 * O deslocamento é guardado em FRAÇÃO do tamanho da arte (não em pixels), então
 * ele sobrevive à troca de formato (Livre, 1:1, 4:5, 9:16) e sai igual no PNG
 * exportado e no instantâneo salvo na marca. As alças carregam
 * `data-studio-no-export="1"`, portanto não aparecem na exportação.
 */

import { collectEditableNodes } from "./artTextEdit";

/** Deslocamento em fração da largura/altura da arte. */
export type ArtTextMove = { x: number; y: number };

/** Memória de deslocamentos: `${idDaArte}#${posiçãoDoTexto}` -> deslocamento. */
const registry = new Map<string, ArtTextMove>();

const keyOf = (root: HTMLElement, index: number) => `${root.id || "art"}#${index}`;

const BASE_ATTR = "studioMoveBase";

/** Aplica o deslocamento sem perder o transform que o modelo já usava. */
const paint = (root: HTMLElement, el: HTMLElement, move: ArtTextMove | undefined) => {
  if (el.dataset[BASE_ATTR] === undefined) el.dataset[BASE_ATTR] = el.style.transform || "";
  const base = el.dataset[BASE_ATTR] || "";
  if (!move || (!move.x && !move.y)) {
    el.style.transform = base;
    return;
  }
  const rect = root.getBoundingClientRect();
  const dx = Math.round(move.x * rect.width);
  const dy = Math.round(move.y * rect.height);
  el.style.transform = `${base} translate(${dx}px, ${dy}px)`.trim();
};

/** Reaplica os deslocamentos guardados depois de qualquer re-render da arte. */
export const applyArtMoves = (root: HTMLElement) => {
  collectEditableNodes(root).forEach((el, i) => {
    paint(root, el, registry.get(keyOf(root, i)));
  });
};

/** Alguma frase desta arte foi reposicionada? */
export const hasArtMoves = (root: HTMLElement) =>
  collectEditableNodes(root).some((_, i) => {
    const move = registry.get(keyOf(root, i));
    return !!move && (!!move.x || !!move.y);
  });

/** Devolve toda frase ao lugar original do modelo. */
export const clearArtMoves = (root: HTMLElement) => {
  collectEditableNodes(root).forEach((el, i) => {
    registry.delete(keyOf(root, i));
    paint(root, el, undefined);
  });
};

const LAYER_ATTR = "data-studio-move-layer";

const removeLayer = (root: HTMLElement) => {
  root.querySelectorAll(`[${LAYER_ATTR}]`).forEach((el) => el.remove());
  if (root.dataset.studioMovePos !== undefined) {
    root.style.position = root.dataset.studioMovePos;
    delete root.dataset.studioMovePos;
  }
};

/**
 * Liga/desliga o modo de reposicionamento: desenha uma alça por texto e trata o
 * arraste (mouse e toque) só a partir dela.
 */
export const setArtMoving = (root: HTMLElement, on: boolean) => {
  removeLayer(root);
  if (!on) return;

  if (getComputedStyle(root).position === "static") {
    root.dataset.studioMovePos = root.style.position;
    root.style.position = "relative";
  }

  const layer = document.createElement("div");
  layer.setAttribute(LAYER_ATTR, "1");
  layer.dataset.studioNoExport = "1";
  Object.assign(layer.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "40",
  });
  root.appendChild(layer);

  const nodes = collectEditableNodes(root);

  nodes.forEach((el, index) => {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.dataset.studioNoExport = "1";
    handle.setAttribute("aria-label", "Arrastar este texto");
    handle.title = "Arraste para reposicionar este texto";
    handle.textContent = "✥";
    Object.assign(handle.style, {
      position: "absolute",
      width: "26px",
      height: "26px",
      borderRadius: "999px",
      border: "1px solid rgba(255,255,255,0.7)",
      background: "rgba(17,17,17,0.85)",
      color: "#fff",
      fontSize: "13px",
      lineHeight: "1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "grab",
      pointerEvents: "auto",
      touchAction: "none",
      boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
    });
    layer.appendChild(handle);

    const place = () => {
      const rootRect = root.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const left = rect.left - rootRect.left - 13;
      const top = rect.top - rootRect.top - 13;
      handle.style.left = `${Math.max(2, Math.min(rootRect.width - 28, left))}px`;
      handle.style.top = `${Math.max(2, Math.min(rootRect.height - 28, top))}px`;
    };
    place();

    // Contorno pontilhado para o usuário ver qual texto aquela alça controla.
    const outline = el.style.outline;
    el.style.outline = "1px dashed currentColor";
    el.style.outlineOffset = "2px";
    handle.dataset.restoreOutline = outline;

    let start: { px: number; py: number; move: ArtTextMove } | null = null;

    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handle.setPointerCapture(event.pointerId);
      handle.style.cursor = "grabbing";
      start = {
        px: event.clientX,
        py: event.clientY,
        move: registry.get(keyOf(root, index)) ?? { x: 0, y: 0 },
      };
    });

    handle.addEventListener("pointermove", (event) => {
      if (!start) return;
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const next: ArtTextMove = {
        x: start.move.x + (event.clientX - start.px) / rect.width,
        y: start.move.y + (event.clientY - start.py) / rect.height,
      };
      registry.set(keyOf(root, index), next);
      paint(root, el, next);
      place();
    });

    const end = (event: PointerEvent) => {
      if (!start) return;
      start = null;
      handle.style.cursor = "grab";
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      place();
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  });

  // Ao desligar o modo, os contornos precisam sair junto com as alças.
  const observer = new MutationObserver(() => {
    if (root.querySelector(`[${LAYER_ATTR}]`)) return;
    nodes.forEach((el) => {
      el.style.outline = "";
      el.style.outlineOffset = "";
    });
    observer.disconnect();
  });
  observer.observe(root, { childList: true });
};
