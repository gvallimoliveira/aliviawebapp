import { describe, it, expect } from "vitest";
import { evaluateSpine, emptyStar, spineRegionsFrom } from "@/lib/spineBiomechanics";

const d = (palpation: any, star: any = {}, region: any = "lumbar") => ({ region, star: { ...emptyStar(), ...star }, palpation });

describe("spine biomechanics", () => {
  it("ERS D: nivela em extensão, acentua em flexão, bloqueio F/IE/RE", () => {
    const h = evaluateSpine(d({ neutral: "right", extension: "levels", flexion: "worsens" }, { F: 2, IE: 1, RE: 1 }));
    expect(h.classification).toBe("ERS");
    expect(h.side).toBe("right");
    expect(h.confidence).toBe("high");
  });
  it("FRS D: nivela em flexão, acentua em extensão, bloqueio E/IE/RE", () => {
    const h = evaluateSpine(d({ neutral: "right", extension: "worsens", flexion: "levels" }, { E: 2, IE: 1, RE: 1 }));
    expect(h.classification).toBe("FRS");
  });
  it("NSR D: F/E livres, dor em ID e RE", () => {
    const h = evaluateSpine(d({ neutral: "right", extension: "unchanged", flexion: "unchanged" }, { ID: 1, RE: 2 }));
    expect(h.classification).toBe("NSR");
    expect(h.confidence).toBe("high");
  });
  it("Estrela divergente não atribui badge", () => {
    const h = evaluateSpine(d({ neutral: "right", extension: "levels", flexion: "worsens" }, { E: 2 }));
    expect(h.classification).toBeNull();
  });
  it("Cervical nunca recebe Fryette", () => {
    const h = evaluateSpine(d({ neutral: "right", extension: "levels", flexion: "worsens" }, { F: 2 }, "cervical"));
    expect(h.classification).toBeNull();
  });
  it("Palpação sem Estrela = confiança moderada", () => {
    expect(evaluateSpine(d({ neutral: "left", extension: "levels", flexion: "worsens" })).confidence).toBe("moderate");
  });
  it("detecta regiões vertebrais", () => {
    expect(spineRegionsFrom(["lower_back"]).thoracolumbar).toBe(true);
    expect(spineRegionsFrom(["knee_left"]).thoracolumbar).toBe(false);
  });
});
