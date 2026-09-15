import { describe, expect, it } from "vitest";
import { dedupeCarouselSlides } from "@/pages/studio-pro/director";

describe("carrossel sem frase repetida", () => {
  it("remove o mesmo arremate repetido em todos os slides internos", () => {
    const out = dedupeCarouselSlides({
      id: "signs",
      kicker: "SINAIS",
      title: "3 sinais",
      coverSub: "Se reconhecer dois, vale conversar.",
      slides: [
        { heading: "Sinal 1", body: "A dor acorda você. E isso costuma piorar quando fica sem resposta." },
        { heading: "Sinal 2", body: "A perna falha no degrau. E isso costuma piorar quando fica sem resposta." },
        { heading: "Sinal 3", body: "A força cai no fim do dia. E isso costuma piorar quando fica sem resposta." },
      ],
      cta: { title: "Reconheceu algum?", sub: "Fale comigo" },
    } as never);

    const bodies = out.slides.map((s) => s.body);
    expect(bodies[0]).toContain("costuma piorar");
    expect(bodies[1]).not.toContain("costuma piorar");
    expect(bodies[2]).not.toContain("costuma piorar");
    bodies.forEach((body) => expect(body.trim().length).toBeGreaterThan(0));
  });
});
