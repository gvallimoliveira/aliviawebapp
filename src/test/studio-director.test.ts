/**
 * DIRETOR CRIATIVO DO STUDIO — garantias do roteiro do lote.
 *
 * O motivo do diretor existir: artes diferentes da MESMA leva repetiam frase.
 * Estes testes travam isso e travam também o determinismo (mesma seed ⇒ mesmo
 * roteiro), que é o que faz a arte baixada ser igual à vista na tela.
 */

import { describe, expect, it } from "vitest";
import { WORLDS } from "@/pages/studio/content";
import { directCarouselWithHook, planBatch } from "@/pages/studio-pro/director";
import { composePage, TREATMENT_COUNT } from "@/pages/studio/composePage";
import { createRng } from "@/pages/studio/rng";
import { phraseSignature } from "@/pages/studio/picker";
import { carouselCoverCopy, CAROUSEL_SUPPORT_MAX, CAROUSEL_TITLE_MAX } from "@/pages/studio/typographyGuards";

const plan = (seed: string, count = 8) =>
  planBatch({ content: WORLDS.pro, count, seed, relation: { pain: "dor que trava", axis: "pain" } });

describe("Diretor criativo", () => {
  it("oferece o fio de posts como sétimo tratamento de carrossel", () => {
    expect(TREATMENT_COUNT.carousel).toBe(7);
  });

  it("mesma seed devolve o mesmo roteiro", () => {
    expect(plan("lote-1").shots.map((s) => s.copy.join("|"))).toEqual(
      plan("lote-1").shots.map((s) => s.copy.join("|")),
    );
  });

  it("seeds diferentes mudam o roteiro", () => {
    expect(plan("lote-1").shots[0].copy.join("|")).not.toBe(plan("lote-2").shots[0].copy.join("|"));
  });

  it("nenhuma frase de destaque se repete dentro do lote", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const heads = plan(seed).shots.map((s) => `${s.headlines[0].strong} ${s.headlines[0].rest}`);
      expect(new Set(heads).size).toBe(heads.length);
    }
  });

  it("cada arte recebe um eixo de comunicação e sai com texto previsto", () => {
    const shots = plan("eixos", 7).shots;
    expect(new Set(shots.map((s) => s.axis)).size).toBe(7);
    shots.forEach((shot) => {
      expect(shot.copy.length).toBeGreaterThan(0);
      expect(shot.affinity.length).toBeGreaterThan(0);
    });
  });

  it("o conteúdo dirigido só oferece os slots reservados da arte", () => {
    const direction = plan("slots", 4);
    const first = direction.contentFor(0);
    const second = direction.contentFor(1);
    expect(first.headlines.length).toBeLessThanOrEqual(2);
    expect(first.headlines[0]).not.toEqual(second.headlines[0]);
    // Cartazes também são dirigidos: artes diferentes não repetem o mesmo.
    expect(first.features.length).toBeLessThan(WORLDS.pro.features.length);
    expect(first.features[0]).not.toEqual(second.features[0]);
    // Acervos de dado real (números com fonte) seguem intactos.
    expect(first.stats).toEqual(WORLDS.pro.stats);
    expect(first.metrics).toEqual(WORLDS.pro.metrics);
  });

  it("as linhas de venda também giram entre as artes do lote", () => {
    const direction = plan("vendas", 5);
    const ctas = direction.shots.map((_, i) => direction.contentFor(i).sales.ctas[0]);
    expect(new Set(ctas).size).toBeGreaterThan(1);
  });

  it("a memória da marca desloca a escolha sem quebrar o determinismo", () => {
    const heavy = new Set<string>();
    const first = planBatch({ content: WORLDS.pro, count: 6, seed: "memoria" });
    first.shots.forEach((shot) => shot.copy.forEach((line) => heavy.add(line)));
    const after = planBatch({
      content: WORLDS.pro,
      count: 6,
      seed: "memoria",
      weightOf: () => 1,
    });
    expect(after.shots[0].copy.join("|")).toBe(first.shots[0].copy.join("|"));
  });

  it("reserva um roteiro diferente para cada grupo de carrossel", () => {
    const blocks = composePage(
      createRng("carrosseis"),
      undefined,
      undefined,
      WORLDS.pro.carousels,
      0,
      ["carousel"],
    );
    const direction = planBatch({ content: WORLDS.pro, count: blocks.length, blocks, seed: "carrosseis" });
    const titles = new Map<number, string>();
    blocks.forEach((block, index) => {
      if (block.kind !== "carousel" || !block.slide) return;
      const title = direction.contentFor(index).carousels[0]?.title;
      expect(title).toBeTruthy();
      const previous = titles.get(block.slide.group);
      if (previous) expect(title).toBe(previous);
      else titles.set(block.slide.group, title);
    });
    expect(new Set(titles.values()).size).toBe(titles.size);
    expect(titles.size).toBeLessThanOrEqual(WORLDS.pro.carousels.length);
  });

  it("inclui o texto visível dos carrosséis na memória do lote", () => {
    const blocks = composePage(createRng("memoria-carrossel"), undefined, undefined, WORLDS.pro.carousels, 0, ["carousel"]);
    const direction = planBatch({ content: WORLDS.pro, count: blocks.length, blocks, seed: "memoria-carrossel" });
    blocks.forEach((block, index) => {
      if (block.kind !== "carousel") return;
      expect(direction.copyOf(index).length).toBeGreaterThan(0);
      expect(direction.shotFor(index)?.headlines).toHaveLength(0);
    });
  });

  it("deixa um roteiro já usado perder prioridade no próximo lote", () => {
    const blocks = composePage(createRng("memoria-roteiro"), undefined, undefined, WORLDS.pro.carousels, 0, ["carousel"]);
    const first = planBatch({ content: WORLDS.pro, count: blocks.length, blocks, seed: "memoria-roteiro" });
    const firstCarousel = first.shots.find((shot) => shot.reserved.carousels?.length)?.reserved.carousels?.[0];
    expect(firstCarousel?.id).toBeTruthy();
    const second = planBatch({
      content: WORLDS.pro,
      count: blocks.length,
      blocks,
      seed: "memoria-roteiro",
      weightOf: (signature) => signature === phraseSignature(firstCarousel?.id ?? firstCarousel) ? 0.02 : 1,
    });
    const secondCarousel = second.shots.find((shot) => shot.reserved.carousels?.length)?.reserved.carousels?.[0];
    expect(secondCarousel?.id).not.toBe(firstCarousel?.id);
  });

  it("conduz o carrossel do gancho ativo ao desejo e CTA sem mudar a quantidade", () => {
    const carousel = WORLDS.pro.carousels[0];
    const directed = directCarouselWithHook(
      carousel,
      {
        hook: "Gancho aprovado",
        strong: "Você ainda decide sem enxergar o caso inteiro",
        rest: "?",
        sub: "O problema não é falta de esforço",
        cta: "Conheça o raciocínio clínico",
      },
      { desire: "conduzir com mais segurança", cta: "Começar agora" },
    );

    expect(directed.title).toBe("Você ainda decide sem enxergar o caso inteiro");
    expect(directed.coverSub).toBe(carousel.title.replace(/[.!?…]+$/, ""));
    expect(directed.slides).toEqual(carousel.slides);
    expect(directed.slides).toHaveLength(carousel.slides.length);
    expect(directed.cta.title).toBe("Quer conduzir com mais segurança?");
    expect(directed.cta.sub).toBe("Conheça o raciocínio clínico");
  });

  it("não promove rótulo editorial como fecho do carrossel", () => {
    const carousel = WORLDS.pro.carousels[0];
    const directed = directCarouselWithHook(
      carousel,
      { hook: "Gancho", strong: "Uma decisão muda o caminho", rest: "." },
      { desire: "Objeções mais comuns:", cta: "Agendar avaliação" },
    );
    expect(directed.cta.title).toBe(carousel.cta.title);
    expect(`${directed.cta.title} ${directed.cta.sub}`).not.toMatch(/objeções mais comuns/i);
  });

  it("mantém a capa curta e não separa uma frase entre título e apoio", () => {
    const directed = directCarouselWithHook(
      WORLDS.pro.carousels[0],
      {
        hook: "Relato",
        strong: 'Se "Faz meses que dói e já tentei de tudo." "Ninguém me',
        rest: ' explicou de onde vem essa dor."',
        sub: "Uma explicação longa que não deve disputar atenção com a tese central da capa.",
        cta: "Converse conosco",
      },
    );

    expect(directed.title).toBe("Faz meses que dói e já tentei de tudo.");
    expect(directed.title).not.toContain("Ninguém me");
    expect(directed.coverSub).not.toContain("explicou");
    expect(directed.title.length).toBeLessThanOrEqual(CAROUSEL_TITLE_MAX);
    expect(directed.coverSub.length).toBeLessThanOrEqual(CAROUSEL_SUPPORT_MAX);
  });

  it("enxuga também capas sem gancho", () => {
    const carousel = WORLDS.pro.carousels[0];
    const directed = directCarouselWithHook({
      ...carousel,
      title: "Uma manchete propositalmente longa que ultrapassa o espaço limpo reservado para uma capa de carrossel",
      coverSub: "Um apoio também propositalmente longo, com explicações demais, detalhes demais e informação que deve ficar nos slides internos.",
    });

    expect(directed.title.length).toBeLessThanOrEqual(CAROUSEL_TITLE_MAX);
    expect(directed.coverSub.length).toBeLessThanOrEqual(CAROUSEL_SUPPORT_MAX);
    expect(directed.title).not.toMatch(/\b(?:e|de|da|do|que|para|me)$/i);
  });

  it("não reduz uma chamada imperativa a Pare de", () => {
    const carousel = WORLDS.pro.carousels[0];
    const directed = directCarouselWithHook(carousel, {
      hook: "Provocação",
      strong: "Pare de decidir com uma visão incompleta do caso clínico e sem comparar os sinais importantes",
      rest: ".",
    });
    expect(directed.title).not.toBe("Pare de");
    expect(directed.title.split(/\s+/).length).toBeGreaterThanOrEqual(3);
  });

  it("usa ganchos diferentes nos carrosséis do mesmo lote", () => {
    const blocks = composePage(createRng("carrosseis-com-ganchos"), undefined, undefined, WORLDS.pro.carousels, 0, ["carousel"]);
    const direction = planBatch({
      content: WORLDS.pro,
      count: blocks.length,
      blocks,
      seed: "carrosseis-com-ganchos",
      relation: { desire: "avaliar com mais clareza", cta: "Conhecer o Aliv.iA", axis: "desire" },
    });
    const covers = blocks
      .map((block, index) => ({ block, carousel: direction.contentFor(index).carousels[0] }))
      .filter(({ block }) => block.kind === "carousel" && block.slide?.index === 0)
      .map(({ carousel }) => carousel.title);

    expect(covers.length).toBeGreaterThan(0);
    expect(new Set(covers).size).toBe(covers.length);
    covers.forEach((title) =>
      expect(WORLDS.pro.hooks?.some((hook) => title === carouselCoverCopy(hook.strong, hook.sub).title)).toBe(true),
    );
  });
});

