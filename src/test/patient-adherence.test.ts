import { describe, it, expect } from "vitest";
import { adherenceScore } from "@/lib/patientAdherence";
describe("adesão com canais disponíveis", () => {
 it("check-ins sem exercícios ou agenda não são diluídos", () => { expect(adherenceScore([null, 29, null], [45, 25, 30])).toBe(29); });
 it("zero medido continua contando, diferente de ausência", () => { expect(adherenceScore([null, 0, 100], [45, 25, 30])).toBe(55); });
});
