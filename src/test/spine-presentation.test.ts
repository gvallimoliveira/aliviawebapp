import { describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import jsPDF from "jspdf";
import { registerInterFonts } from "@/utils/fonts/registerInterFonts";
import { savedSpineExams } from "@/lib/spinePresentation";
import { emptySpineData, type SpineBiomechanicsData } from "@/lib/spineBiomechanics";
import { generateAssessmentPdfBlob, generateEvolutionPdfBlob, renderSpineBiomechanicsSection } from "@/utils/generatePdf";

const exam: SpineBiomechanicsData = { region: "lumbar", level: "L4–L5", star: { F: 3, E: 0, ID: 0, IE: 2, RD: 0, RE: 1 }, palpation: { neutral: "right", extension: "levels", flexion: "worsens" }, notes: "Exame fictício de validação." };
async function save(blob: Blob, name: string) {
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
  writeFileSync(`/tmp/${name}.pdf`, Buffer.from(buffer));
}
describe("Saved Maigne exams beside ROM", () => {
  it("retains the saved exam when a later assessment has no exam", () => {
    const exams = savedSpineExams([{ date: "2026-10-20", spineBiomechanics: emptySpineData() }, { date: "2026-10-18", spineBiomechanics: exam }, { date: "2026-10-19" }]);
    expect(exams).toEqual([{ date: "2026-10-18", data: exam }]);
    expect(exams[0].data.star).toEqual({ F: 3, E: 0, ID: 0, IE: 2, RD: 0, RE: 1 });
  });
  it("omits an empty exam and draws the six saved axes plus six marks without any ROM rows", () => {
    const doc = new jsPDF();
    registerInterFonts(doc);
    const line = vi.spyOn(doc, "line");
    expect(renderSpineBiomechanicsSection(doc, 30, emptySpineData(), "pt")).toBe(30);
    expect(line).not.toHaveBeenCalled();
    expect(renderSpineBiomechanicsSection(doc, 30, exam, "pt")).toBeGreaterThan(80);
    // renderSectionTitle draws one separator; the remaining lines are six axes and six ticks.
    expect(line.mock.calls.length).toBe(13);
  });
  it("generates assessment and scoped evolution PDFs from saved exams without ROM", async () => {
    await save(await generateAssessmentPdfBlob({ language: "pt", userName: "Paciente fictício", diagnosis: { hypothesis: "Dados fictícios", summary: "Validação do exame salvo.", confidence: "high", disclaimer: "Dados fictícios." }, anamnesisData: { spineBiomechanics: exam } as Parameters<typeof generateAssessmentPdfBlob>[0]["anamnesisData"] }), "maigne-assessment-qa");
    await save(await generateEvolutionPdfBlob({ patientName: "Paciente fictício", language: "pt", firstAssessment: { date: "2026-10-18", pain_score: 6, pain_regions: [], test_results: [] }, lastAssessment: { date: "2026-10-20", pain_score: 3, pain_regions: [], test_results: [] }, totalAssessments: 2, longitudinalAssessments: [{ date: "2026-10-18", spineBiomechanics: exam }, { date: "2026-10-20" }], summary: { narrative: "Exemplo de validação.", painChange: "6 para 3", conclusion: "Dados fictícios.", recommendation: "continue" } }), "maigne-evolution-qa");
  });
});