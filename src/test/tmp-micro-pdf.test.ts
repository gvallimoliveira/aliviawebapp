import { describe, it } from "vitest";
import { writeFileSync } from "fs";
import { generateMicrocyclePdfBlob } from "@/utils/generateMicrocyclePdf";

const s = (d: string, track: string, min: number, rpe: number, load: string, title?: string) => ({
  id: d + track, plan_id: "p", cycle_id: null, session_date: d, track, planned_load: load,
  title: title ?? null, exercise_program_id: null, notes: null, patient_id: "x",
  planned_duration_min: min, planned_rpe: rpe, planned_target_load: min * rpe, created_source: "pro",
});

describe("micro pdf", () => {
  it("renders", async () => {
    const blob = await generateMicrocyclePdfBlob({
      weekStart: "2026-09-07",
      patientName: "Maria Aparecida de Souza Gonçalves",
      professionalName: "Guilherme Vallim",
      sport: "Corrida de rua",
      currentPhase: "Hipertrofia e força",
      sessions: [
        s("2026-09-07", "physio", 50, 8, "high", "Fortalecimento de quadril e panturrilha com progressão de carga"),
        s("2026-09-07", "gym", 40, 6, "moderate"),
        s("2026-09-09", "sport", 30, 4, "low", "Trote leve em solo firme"),
        s("2026-09-11", "physio", 0, 0, "rest"),
        s("2026-09-12", "gym", 60, 9, "high", "Sessão principal da semana"),
      ] as any,
    });
    const buf: any = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsArrayBuffer(blob as any); });
    writeFileSync("/tmp/micro.pdf", Buffer.from(buf));
  });
});
