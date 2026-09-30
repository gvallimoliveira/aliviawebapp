import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import CarouselBlock from "@/pages/studio/blocks/CarouselBlock";
import EcosystemBlock from "@/pages/studio/blocks/EcosystemBlock";
import { WORLDS } from "@/pages/studio/content";
import type { StudioPhoto } from "@/pages/studio/photos";
import { buildCoverage } from "@/pages/studio/coverage";
import { createPicker } from "@/pages/studio/picker";
import { createRng } from "@/pages/studio/rng";
import { personaForSeed } from "@/pages/studio/personas";
import { withAliviaEcosystem } from "@/pages/studio-pro/aliviaEcosystems";

const photo = (id: string, label: string): StudioPhoto => ({
  id,
  storagePath: `/official/${id}.jpeg`,
  label,
  description: label,
  usage: "produto",
  credit: "Oficial Aliv.iA",
  sortOrder: 0,
  focusX: 50,
  focusY: 50,
  zoom: 1,
  rotation: 0,
  safeArea: "none",
  src: `data:image/jpeg;base64,${id}`,
});

const photos = [
  photo("official:alivia:express-reassessment-tools", "Triagem de red flags"),
  photo("official:alivia:external-upload", "Upload de avaliação externa"),
  photo("official:alivia:manual-anamnesis", "Avaliação manual"),
];
const content = withAliviaEcosystem(WORLDS.pro, "seguranca-clinica");
const persona = personaForSeed("ecossistema-com-prints");
const picker = createPicker(buildCoverage("pro", content, {}), () => {});

beforeAll(() => {
  class IntersectionObserverMock implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "0px";
    readonly scrollMargin = "0px";
    readonly thresholds = [0];
    disconnect() {}
    observe() {}
    takeRecords() { return []; }
    unobserve() {}
  }
  window.IntersectionObserver = IntersectionObserverMock;
  globalThis.IntersectionObserver = IntersectionObserverMock;
});

describe("prints oficiais nos ecossistemas Aliv.iA", () => {
  it("ilustra a arte integrada com uma tela oficial da própria cadeia", () => {
    render(
      <EcosystemBlock
        content={content}
        rng={createRng("ecossistema")}
        treatment={0}
        format="1x1"
        picker={picker}
        persona={persona}
        photos={photos}
      />,
    );

    const image = screen.getByRole("img", { name: /triagem de red flags/i });
    expect(image).toHaveAttribute("src", expect.stringContaining("official:alivia:express-reassessment-tools"));
  });

  it("usa no carrossel o print explicitamente ligado ao diferencial do slide", () => {
    render(
      <CarouselBlock
        content={content}
        rng={createRng("carrossel")}
        treatment={6}
        format="1x1"
        picker={picker}
        persona={persona}
        photos={photos}
        artKey="lote|avaliacao-externa"
        slide={{ index: 2, total: 7, group: 0, script: 0 }}
      />,
    );

    const image = screen.getByRole("img", { name: /upload de avaliação externa/i });
    expect(image).toHaveAttribute("src", expect.stringContaining("official:alivia:external-upload"));
  });
});