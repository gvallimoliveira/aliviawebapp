import { describe, expect, it } from "vitest";
import {
  normalizeMovementKey,
  parseMeasurementValue,
  pickMovementLabel,
} from "@/lib/movementNormalize";

describe("normalizeMovementKey", () => {
  it("groups rotation-internal-of-hip spelling variants", () => {
    const variants = [
      "Rot int quadril",
      "Rotação Int Quadril",
      "rotação interna de quadril",
      "ROT. INT. DE QUADRIL",
      "rotaçao interna do quadril",
    ];
    const keys = variants.map(normalizeMovementKey);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe("interna quadril rotacao");
  });

  it("resolves 'ext' as externa in rotation context and extensao otherwise", () => {
    expect(normalizeMovementKey("rot ext quadril")).toBe(
      normalizeMovementKey("Rotação externa do quadril"),
    );
    expect(normalizeMovementKey("ext joelho")).toBe(
      normalizeMovementKey("Extensão de joelho"),
    );
    expect(normalizeMovementKey("rot ext quadril")).not.toBe(
      normalizeMovementKey("rot int quadril"),
    );
  });

  it("distinguishes different joints and movements", () => {
    expect(normalizeMovementKey("Flexão de quadril")).not.toBe(
      normalizeMovementKey("Flexão de joelho"),
    );
    expect(normalizeMovementKey("Flexão de joelho")).not.toBe(
      normalizeMovementKey("Extensão de joelho"),
    );
  });

  it("ignores word order and stopwords", () => {
    expect(normalizeMovementKey("Flexão de joelho")).toBe(
      normalizeMovementKey("joelho flexao"),
    );
    expect(normalizeMovementKey("Abd quadril")).toBe(
      normalizeMovementKey("Abdução de Quadril"),
    );
  });

  it("returns empty string for meaningless labels", () => {
    expect(normalizeMovementKey("")).toBe("");
    expect(normalizeMovementKey("  —  ")).toBe("");
    expect(normalizeMovementKey(undefined)).toBe("");
  });
});

describe("parseMeasurementValue", () => {
  it("parses plain numbers and unit-suffixed values", () => {
    expect(parseMeasurementValue("17")).toBe(17);
    expect(parseMeasurementValue("23,5°")).toBe(23.5);
    expect(parseMeasurementValue("35.2 kgf")).toBe(35.2);
    expect(parseMeasurementValue("12 kg")).toBe(12);
  });

  it("strips annotations", () => {
    expect(parseMeasurementValue("35.2 (n=3)")).toBe(35.2);
  });

  it("returns null for non-numeric input", () => {
    expect(parseMeasurementValue("—")).toBeNull();
    expect(parseMeasurementValue("")).toBeNull();
    expect(parseMeasurementValue(undefined)).toBeNull();
  });
});

describe("pickMovementLabel", () => {
  it("prefers the latest label unless it is a terse abbreviation", () => {
    expect(pickMovementLabel(["Rotação interna de quadril", "Rot int quadril"])).toBe(
      "Rotação interna de quadril",
    );
    expect(pickMovementLabel(["Rot int quadril", "Rotação interna de quadril"])).toBe(
      "Rotação interna de quadril",
    );
  });
});
