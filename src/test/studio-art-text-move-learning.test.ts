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

const pointer = (type: string, x: number, y: number) => {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(event, "pointerId", { value: 1 });
  return event;
};

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
  handle.dispatchEvent(pointer("pointerdown", 100, 100));
  handle.dispatchEvent(pointer("pointermove", 140, 150));
  handle.dispatchEvent(pointer("pointerup", 140, 150));
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