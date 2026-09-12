import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import CarouselBlock from "@/pages/studio/blocks/CarouselBlock";
import { WORLDS } from "@/pages/studio/content";
import { createPicker } from "@/pages/studio/picker";
import { createRng } from "@/pages/studio/rng";
import { personaForSeed } from "@/pages/studio/personas";

const carousel = {
  id: "fio-teste",
  kicker: "Para fisioterapeutas",
  title: "Um plano sem raciocínio só organiza tarefas",
  coverSub: "A sequência clínica precisa explicar cada decisão.",
  slides: [
    { heading: "Primeiro, leia o caso", body: "Dor, inibição, fraqueza e incapacidade não são a mesma coisa." },
    { heading: "Depois, escolha a prioridade", body: "A função mais limitada orienta o próximo passo." },
  ],
  cta: { title: "Conclua com direção", sub: "Conheça o raciocínio clínico da marca." },
};

const content = { ...WORLDS.pro, carousels: [carousel] };
const persona = personaForSeed("fio-teste");
const picker = createPicker();

beforeAll(() => {
  class IntersectionObserverMock implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "0px";
    readonly thresholds = [0];
    disconnect() {}
    observe() {}
    takeRecords() { return []; }
    unobserve() {}
  }
  window.IntersectionObserver = IntersectionObserverMock;
  globalThis.IntersectionObserver = IntersectionObserverMock;
});

const renderSlide = (index: number) => render(
  <CarouselBlock
    content={content}
    rng={createRng(`fio:${index}`)}
    treatment={6}
    format="1x1"
    picker={picker}
    persona={persona}
    slide={{ index, total: 4, group: 0, script: 0 }}
  />,
);

describe("carrossel em fio de posts", () => {
  it("renderiza abertura, desenvolvimento e conclusão como posts da marca", () => {
    const cover = renderSlide(0);
    expect(screen.getByText(carousel.title)).toBeInTheDocument();
    expect(screen.getByText(/Fio 1\/4/)).toBeInTheDocument();
    cover.unmount();

    const middle = renderSlide(1);
    expect(screen.getByText(carousel.slides[0].heading)).toBeInTheDocument();
    expect(screen.getByText(carousel.slides[0].body)).toBeInTheDocument();
    middle.unmount();

    renderSlide(3);
    expect(screen.getByText(carousel.cta.title)).toBeInTheDocument();
    expect(screen.getByText(/Conclusão/)).toBeInTheDocument();
  });
});