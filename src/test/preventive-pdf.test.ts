import { expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { generateAssessmentPdfBlob } from "@/utils/generatePdf";
import { normalizeAssessmentPurpose } from "@/lib/assessmentPurpose";

it("generates the preventive report from recorded goals and no measured pain", async () => {
  const anamnesisData = normalizeAssessmentPurpose({ assessmentPurpose: "prevention" as const, preventionGoals: ["posture"], historyRegions: ["thoracic"], preventionGoalDetails: "Acompanhamento preventivo de saúde", painScore: 5, painRegions: ["thoracic"], specialtyResults: [] });
  expect(anamnesisData.painScore).toBeNull();
  const blob = await generateAssessmentPdfBlob({ language: "pt", userName: "Validação preventiva fictícia", diagnosis: { hypothesis: "Acompanhamento preventivo", summary: "Paciente sem dor atual. Objetivo preventivo documentado.", confidence: "high", disclaimer: "Dados fictícios de validação." }, anamnesisData: anamnesisData as Parameters<typeof generateAssessmentPdfBlob>[0]["anamnesisData"] });
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(blob); });
  expect(buffer.byteLength).toBeGreaterThan(10000);
  writeFileSync("/tmp/preventive-assessment-qa.pdf", Buffer.from(buffer));
});