import { describe, expect, it } from "vitest";
import { curatePhotosForContent, pickExplicitPhoto, rankPhotosForSwap } from "@/pages/studio/photoPolicy";
import type { StudioPhoto } from "@/pages/studio/photos";

const photo = (id: string, label = id): StudioPhoto => ({
  id,
  storagePath: id,
  label,
  description: label,
  usage: "produto",
  credit: "teste",
  sortOrder: 0,
  focusX: 50,
  focusY: 50,
  zoom: 1,
  rotation: 0,
  safeArea: "none",
  src: `data:image/jpeg;base64,${id}`,
});

describe("política global de imagens do Studio", () => {
  const external = photo("official:alivia:external-upload", "Upload de avaliação externa");
  const reassessment = photo("official:alivia:express-reassessment-steps", "Reavaliação expressa");
  const ordinary = photo("foto-clinica", "Atendimento na clínica");

  it("mantém somente o print oficial declarado pelo pacote editorial", () => {
    const curated = curatePhotosForContent([external, reassessment, ordinary], {
      officialPhotoIds: [external.id],
    });
    expect(curated.map((item) => item.id)).toEqual([external.id, ordinary.id]);
  });

  it("não aproxima outro print quando o vínculo exato está ausente", () => {
    expect(pickExplicitPhoto([external.id], [reassessment, ordinary], 0)).toBeUndefined();
  });

  it("prioriza na troca manual o print exato do assunto atual", () => {
    const ranked = rankPhotosForSwap([ordinary, reassessment, external], {
      officialPhotoIds: [external.id],
      topics: ["external-upload"],
    });
    expect(ranked[0]?.id).toBe(external.id);
  });
});