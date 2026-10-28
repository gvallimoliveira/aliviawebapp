import { describe, expect, it } from "vitest";
import { captionTopics, pickPhotoForTopics } from "@/pages/studio/photoMeaning";
import type { StudioPhoto } from "@/pages/studio/photos";

const photo = (id: string, label: string, description = ""): StudioPhoto =>
  ({ id, label, description, usage: "produto", url: "", storage_path: "" } as unknown as StudioPhoto);

describe("legenda manda na escolha da foto", () => {
  it("legenda 'avaliação manual' declara anamnese", () => {
    expect(captionTopics(photo("a", "Tela da avaliação manual"))).toContain("anamnesis");
  });
  it("arte de avaliação escolhe sempre o print legendado como avaliação manual", () => {
    const photos = [photo("x", "Agenda da semana"), photo("y", "Avaliação manual em andamento"), photo("z", "Equipe sorrindo")];
    for (let i = 0; i < 8; i++) {
      expect(pickPhotoForTopics(photos, i, ["anamnesis"])?.id).toBe("y");
    }
  });
});

import { mergeAiThemes } from "@/pages/studio/StudioPhotos";
describe("leitura de IA na legenda", () => {
  it("substitui a leitura anterior em vez de acumular", () => {
    const once = mergeAiThemes("Tela inicial", ["agenda"], "");
    expect(mergeAiThemes(once, ["avaliação manual"], "")).toBe("Tela inicial Temas: avaliação manual");
  });
  it("temas lidos viram assunto declarado", () => {
    expect(captionTopics({ label: "", description: mergeAiThemes("", ["avaliação manual"], "Print") } as never)).toContain("anamnesis");
  });
});
