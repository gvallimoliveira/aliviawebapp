import { describe, expect, it } from "vitest";
import { photoTopics, pickPhotoForTopics } from "@/pages/studio/photoMeaning";
import type { StudioPhoto } from "@/pages/studio/photos";

const photo = (patch: Partial<StudioPhoto>): StudioPhoto => ({
  id: "foto", storagePath: "foto.jpg", label: "Foto", description: "", usage: "livre",
  credit: null, sortOrder: 0, src: "data:image/jpeg;base64,x", focusX: 50, focusY: 50,
  zoom: 1, rotation: 0, safeArea: "none", ...patch,
});

describe("nexo entre foto e assunto", () => {
  it("não usa crédito do fotógrafo como descrição semântica", () => {
    expect(photoTopics(photo({ credit: "Fisio Fotografia" }))).toEqual([]);
  });

  it("não escolhe foto sem descrição compatível com a arte", () => {
    const generic = photo({ label: "IMG 001", description: "Retrato ao ar livre" });
    expect(pickPhotoForTopics([generic], 0, ["dynamometry"])).toBeUndefined();
  });

  it("escolhe foto cuja descrição sustenta o assunto", () => {
    const assessment = photo({ description: "Avaliação de força com dinamômetro" });
    expect(pickPhotoForTopics([assessment], 0, ["dynamometry"])?.id).toBe("foto");
  });

  it("mantém procedimento específico fora de tema incompatível", () => {
    const laser = photo({ description: "Aplicação de laserterapia no atendimento" });
    expect(pickPhotoForTopics([laser], 0, ["questionnaires"])).toBeUndefined();
  });

  it("usa prints genéricos do produto em educação de software sem tópico clínico", () => {
    const screen = photo({ label: "Prints do sistema", description: "Interface do sistema, usar para ilustrar o produto", usage: "produto" });
    expect(pickPhotoForTopics([screen], 0, [undefined], undefined, undefined, ["software"])?.id).toBe("foto");
  });

  it("não transforma prints genéricos em prova de qualquer assunto clínico", () => {
    const screen = photo({ label: "Prints do sistema", description: "Interface do sistema, usar para ilustrar o produto", usage: "produto" });
    expect(pickPhotoForTopics([screen], 0, ["dynamometry"])).toBeUndefined();
  });

  it("preserva o assunto de um print específico mesmo em divulgação de software", () => {
    const screen = photo({ label: "Prints do sistema — Agenda", description: "Interface do sistema, usar para ilustrar o produto", usage: "produto" });
    expect(pickPhotoForTopics([screen], 0, [undefined], undefined, undefined, ["software"])).toBeUndefined();
  });
});