import { describe, expect, it } from "vitest";
import { isScreenPhoto, pickScreenPhoto } from "@/pages/studio/photoMeaning";
import type { StudioPhoto } from "@/pages/studio/photos";

const photo = (patch: Partial<StudioPhoto>): StudioPhoto => ({
  id: "foto", storagePath: "foto.jpg", label: "Foto", description: "", usage: "livre",
  credit: null, sortOrder: 0, src: "data:image/jpeg;base64,x", focusX: 50, focusY: 50,
  zoom: 1, rotation: 0, safeArea: "none", ...patch,
});

describe("print de tela nos aparelhos", () => {
  it("reconhece print do sistema e recusa retrato de atendimento", () => {
    expect(isScreenPhoto(photo({ usage: "produto", description: "Tela do painel do sistema" }))).toBe(true);
    expect(isScreenPhoto(photo({ usage: "atendimento", description: "Fisioterapeuta com paciente" }))).toBe(false);
  });

  it("coloca na tela apenas prints, nunca a foto de atendimento", () => {
    const person = photo({ id: "pessoa", usage: "atendimento", description: "Avaliação de força com dinamômetro" });
    const print = photo({ id: "print", usage: "produto", label: "Print", description: "Tela inicial do aplicativo" });
    expect(pickScreenPhoto([person, print], 0, ["dynamometry"])?.id).toBe("print");
    expect(pickScreenPhoto([person], 0, ["dynamometry"])).toBeUndefined();
  });
});
