import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { generateMeasurementPdfBlob, generateAssessmentPdfBlob } from "@/utils/generatePdf";

const rows = [
  { movement: "Joelho Flexão Ventral", leftValue: "34.5", rightValue: "26.7", leftTrials: [{ value: "34.5", timeToPeak: "2.65" }, { value: "30.3", timeToPeak: "2.21" }], rightTrials: [{ value: "26.7", timeToPeak: "2.21" }, { value: "23.5", timeToPeak: "2.21" }] },
  { movement: "Joelho Extensão Sentado", leftValue: "45", rightValue: "40.8", leftTrials: [{ value: "45", timeToPeak: "3.74" }, { value: "40.2", timeToPeak: "3.74" }], rightTrials: [{ value: "40.8", timeToPeak: "3.1" }, { value: "34.6", timeToPeak: "3.1" }] },
];
async function save(blob: Blob, name: string) {
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
  expect(buffer.byteLength).toBeGreaterThan(10000);
  writeFileSync(`/tmp/${name}.pdf`, Buffer.from(buffer));
}
describe("standalone saved measurement reports", () => {
  const base = { patientName: "Paciente fictício de validação", date: "2026-10-15T12:00:00Z", language: "pt", clinicName: "Clínica de validação", responsibleProfessional: { name: "Profissional de teste", crefito: "00000-F" } };
  it("renders the overlapping example and a long, paginated table", async () => {
    await save(await generateMeasurementPdfBlob({ ...base, kind: "strength", strengthTable: rows }), "strength-standalone-qa");
    await save(await generateMeasurementPdfBlob({ ...base, kind: "strength", strengthTable: Array.from({ length: 30 }, (_, i) => ({ ...rows[i % 2], movement: `Movimento ${i + 1}: rotação externa de ombro em abdução com estabilização escapular e apoio` })) }), "strength-pages-qa");
  });
  it("renders functional and specialty instruments separately", async () => {
    await save(await generateMeasurementPdfBlob({ ...base, kind: "questionnaires", questionnaireResults: [{ questionnaireId: "koos", questionnaireName: "KOOS", percentageScore: 70, severity: "moderate", interpretation_pt: "Disfunção leve a moderada", subscaleScores: { pain: 50, symptoms: 75, adl: 75, sport: 75, qol: 75 } }] }), "questionnaire-functional-qa");
    await save(await generateMeasurementPdfBlob({ ...base, kind: "questionnaires", specialtyResults: [{ questionnaireId: "srs22r", questionnaireName: "SRS-22r", domain: "spine", score: { total: 4.1, max: 5, interpretation_pt: "Dados fictícios para leitura e interpretação profissional.", subscores: ["Função", "Dor", "Autoimagem", "Saúde mental", "Satisfação"].map((label_pt) => ({ label_pt, total: 4, max: 5 })) } }] }), "questionnaire-specialty-qa");
  });
  it("uses the same corrected layout in the complete assessment report", async () => {
    await save(await generateAssessmentPdfBlob({ language: "pt", userName: base.patientName, diagnosis: { hypothesis: "Dados fictícios", summary: "Validação visual da dinamometria.", confidence: "high", disclaimer: "Dados fictícios." }, anamnesisData: { strengthTable: rows } as Parameters<typeof generateAssessmentPdfBlob>[0]["anamnesisData"] }), "strength-full-qa");
  });
});