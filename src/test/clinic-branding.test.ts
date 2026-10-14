import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import jsPDF from "jspdf";
import { writeFileSync } from "node:fs";
import ClinicBrandHeader from "@/components/ClinicBrandHeader";
import { applyPdfBranding, pdfBrandPalette } from "@/lib/pdfBranding";
import { generateMicrocyclePdfBlob } from "@/utils/generateMicrocyclePdf";
import { generateCardioReportPdfBlob } from "@/utils/generateCardioReportPdf";
import { generateBasicReportPdfBlob } from "@/utils/generatePdf";
import { analyzePeriod } from "@/lib/cardioAnalysis";
import { hrCeiling } from "@/lib/cardioSafety";

describe("institutional branding", () => {
  it("keeps clinic identity and falls back when its logo fails", () => {
    render(createElement(ClinicBrandHeader, { clinic_name: "Clínica de teste", clinic_logo_url: "https://example.test/logo.png" }));
    const img = screen.getByRole("img", { name: "Clínica de teste" });
    expect(img).toHaveAttribute("src", "https://example.test/logo.png");
    fireEvent.error(img);
    expect(img.getAttribute("src")).not.toBe("https://example.test/logo.png");
    expect(screen.getByText("Clínica de teste")).toBeVisible();
  });
  it("maps only brand colors and isolates concurrent documents", () => {
    const a = new jsPDF(), b = new jsPDF();
    const fill = vi.spyOn(a, "setFillColor"), text = vi.spyOn(a, "setTextColor");
    applyPdfBranding(a, "#d97706");
    applyPdfBranding(b, "#2563eb");
    a.setFillColor(39, 124, 103);
    a.setTextColor(39, 124, 103);
    expect(fill).toHaveBeenLastCalledWith(217, 119, 6);
    expect(text).toHaveBeenLastCalledWith(...pdfBrandPalette("#d97706").ink);
    a.setFillColor(200, 60, 60);
    expect(fill).toHaveBeenLastCalledWith(200, 60, 60);
    expect(pdfBrandPalette("bad").primary).toEqual([39, 124, 103]);
    expect(pdfBrandPalette("#ffffff").foreground).toEqual([0, 0, 0]);
  });
  it("generates all three report families with institutional branding", async () => {
    const brand = { clinicName: "Clínica QA institucional", brandColor: "#d97706" };
    const ceiling = hrCeiling({ profile: "athletic", age: 30 });
    const period = analyzePeriod({ entries: [{ id: "qa", session_date: "2026-10-14", track: "cardio", duration_min: 40, rpe: 5, hr_max: 150, hr_avg: 130 }], checkins: [], ctx: { profile: "athletic", betaBlocker: false, ceiling }, weeks: 4, today: "2026-10-14" });
    const reports = await Promise.all([
      generateMicrocyclePdfBlob({ ...brand, patientName: "Paciente fictício QA", weekStart: "2026-10-12", sessions: [] }),
      generateCardioReportPdfBlob({ ...brand, patientName: "Paciente fictício QA", variant: "technical", period, readings: [], ceiling, profile: "athletic", betaBlocker: false, age: 30 }),
      generateBasicReportPdfBlob({ ...brand, patientName: "Paciente fictício QA", language: "pt", diagnosis: { hypothesis: "Dados fictícios de validação", summary: "Relatório fictício para conferir identidade institucional." } } as Parameters<typeof generateBasicReportPdfBlob>[0]),
    ]);
    for (const [i, blob] of reports.entries()) {
      const data = await new Promise<ArrayBuffer>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(blob); });
      expect(data.byteLength).toBeGreaterThan(1000);
      writeFileSync(`/tmp/clinic-branding-${i}.pdf`, Buffer.from(data));
    }
  });
});