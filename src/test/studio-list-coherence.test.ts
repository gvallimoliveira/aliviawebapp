import { describe, expect, it } from "vitest";
import { distinctListItems, finalizeListCoherence, repeatsListIdea } from "@/pages/studio/listCoherence";
import { finalizeBrandVoice } from "@/pages/studio-pro/veterinaryVoice";
import { buildSegmentContent } from "@/pages/studio-pro/brandContent";
import { ALIVIA_AUDIENCES } from "@/pages/studio-pro/audiences";
import { ALIVIA_DIFFERENTIALS } from "@/pages/studio-pro/aliviaDifferentials";

describe("listas com argumentos complementares", () => {
  const before = [
    "Sem separar os objetivos, o total de séries pode superestimar o trabalho de força",
    "Sem separar os objetivos, o total de séries pode superestimar o trabalho de força",
    "Comparar a resposta do paciente com uma dose antiga atrapalha o próximo ajuste",
    "Somar alongamento e força como se exigissem o mesmo esforço",
  ];
  const after = [
    "Entender o peso dos exercícios antes de enviar o programa",
    "Entender o peso dos exercícios antes de enviar o programa",
    "Ver a carga por região sem uma planilha paralela",
    "Revisar a prescrição com o planejamento já alinhado",
  ];

  it("reproduz e corrige a comparação da imagem, independentemente da marca", () => {
    for (const brand of ["Aliv.iA", "Guilherme Vallim Fisioterapia", "Aline Furtado Vet"]) {
      const out = finalizeBrandVoice({ compare: [{ title: "Dose calculada: com e sem", before, after }] }, { brand });
      expect(out.compare[0].before).toHaveLength(3);
      expect(out.compare[0].after).toHaveLength(3);
    }
  });

  it("remove a mesma ideia com variação de pontuação e abertura", () => {
    expect(distinctListItems([
      "Ver a carga por região sem uma planilha paralela",
      "Na prática, ver a carga por região sem uma planilha paralela.",
      "Revisar a prescrição com o planejamento já alinhado",
    ])).toHaveLength(2);
  });

  it("preserva mecanismos e benefícios diferentes do mesmo tema", () => {
    const items = [
      "Ver a carga por região sem uma planilha paralela",
      "Ver a carga por região para comparar a dose planejada e a percebida",
      "Força entra integralmente na carga semanal",
      "Estabilização entra pela metade na carga semanal",
      "Mobilidade fica fora da carga semanal",
    ];
    expect(distinctListItems(items)).toEqual(items);
    expect(repeatsListIdea(items[0], items[1])).toBe(false);
  });

  it("revisa listas legadas, atualiza contagem e não altera fotos nem passos", () => {
    const input = {
      lists: [{ heading: "4 sinais que merecem atenção", items: before, closing: "Converse sobre seu programa" }],
      officialPhotoIds: ["hep", "hep"],
      steps: [{ id: "one", label: "Dose" }, { id: "two", label: "Dose" }],
    };
    const out = finalizeListCoherence(input);
    expect(out.lists[0].heading).toBe("3 sinais que merecem atenção");
    expect(out.officialPhotoIds).toEqual(input.officialPhotoIds);
    expect(out.steps).toEqual(input.steps);
    expect(finalizeListCoherence(out)).toEqual(out);
    expect(input.lists[0].items).toHaveLength(4);
  });

  it("não inventa itens para preencher uma lista curta", () => {
    expect(distinctListItems(["Dose atualizada", "DOSE ATUALIZADA.", " "])).toEqual(["Dose atualizada"]);
  });

  it("protege todas as listas dos diferenciais em escrita equilibrada", () => {
    for (const differential of ALIVIA_DIFFERENTIALS) {
      const content = buildSegmentContent({
        kit: { name: "Aliv.iA", niche: "fisioterapia", tone: "equilibrado", description: "", keywords: [] },
        audiences: ALIVIA_AUDIENCES, segment: differential.id, angle: "venda", variationSeed: "list-regression",
      });
      for (const items of [...content.lists.map((list) => list.items), ...content.compare.flatMap((pair) => [pair.before, pair.after])]) {
        expect(distinctListItems(items)).toEqual(items);
      }
    }
  });
});