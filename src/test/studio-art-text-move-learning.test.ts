import { beforeEach, describe, expect, it } from "vitest";
import { learnArtMoves } from "@/pages/studio/artMoveLearning";
import { setArtMoving } from "@/pages/studio/artTextMove";

const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
  x: left,
  y: top,
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  toJSON: () => ({}),
});

const movedLearningArt = () => {
  const root = document.createElement("div");
  root.dataset.studioArtKey = `learning-${Math.random()}`;
  root.innerHTML = `
    <div data-studio-learn-frame="punch.phrase">
      <p data-studio-learn="punch.phrase">Frase na pinça</p>
    </div>
  `;
  document.body.appendChild(root);
  const text = root.querySelector("p") as HTMLElement;
  const frame = root.querySelector("[data-studio-learn-frame]") as HTMLElement;
  root.getBoundingClientRect = () => rect(0, 0, 400, 500);
  frame.getBoundingClientRect = () => rect(40, 80, 240, 200);
  text.getBoundingClientRect = () => rect(120, 120, 100, 24);

  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
  setArtMoving(root, true);
  const handle = root.querySelector('[aria-label="Arrastar este texto"]') as HTMLButtonElement;
  handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 }));
  handle.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 1, clientX: 140, clientY: 150 }));
  handle.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, clientX: 140, clientY: 150 }));
  return { root, text };
};

describe("aprendizado da posição de texto", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    localStorage.clear();
  });

  it("mantém visualmente o deslocamento ao fixar uma arte salva", () => {
    const { root, text } = movedLearningArt();
    const movedTransform = text.style.transform;
    expect(movedTransform).toContain("translate(");

    expect(learnArtMoves(root, { preserveCurrentMove: true })).toEqual(["punch.phrase"]);
    expect(text.style.transform).toBe(movedTransform);
  });

  it("libera o deslocamento manual quando a arte viva será remontada", () => {
    const { root, text } = movedLearningArt();
    expect(text.style.transform).toContain("translate(");

    expect(learnArtMoves(root)).toEqual(["punch.phrase"]);
    expect(text.style.transform).not.toContain("translate(");
  });
});