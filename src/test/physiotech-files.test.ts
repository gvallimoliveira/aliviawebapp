// @vitest-environment node
import { describe, it, expect } from "vitest";
import { fetchReportPdf, patientFileKey, reportSource, MAX_REPORT_BYTES } from "../../supabase/functions/_shared/physiotechFiles";
const url = "https://ofjtgoobymkuujimtxoy.supabase.co/storage/v1/object/sign/exam-images/user/reports/exam.pdf?token=test";
describe("permanent PhysioTech files", () => {
  it("persists patient identity without an email", () => {
    expect(patientFileKey({ id: "lucas", email: null })).toBe("patient:lucas");
  });
  it("retains the 20MB document limit", async () => {
    expect(MAX_REPORT_BYTES).toBe(20 * 1024 * 1024);
    await expect(fetchReportPdf(url, async () => new Response(new Uint8Array(MAX_REPORT_BYTES + 1)))).rejects.toThrow("pdf_too_large");
  });
  it("fails closed when the transfer URL has expired", async () => {
    await expect(fetchReportPdf(url, async () => new Response("expired", { status: 403 }))).rejects.toThrow("pdf_unavailable");
  });
  it("copies real PDF bytes", async () => {
    const bytes = await fetchReportPdf(url, async () => new Response("%PDF-1.7\nreport"));
    expect(new TextDecoder().decode(bytes)).toBe("%PDF-1.7\nreport");
  });
  it("rejects non-PDF files and untrusted sources", async () => {
    await expect(fetchReportPdf(url, async () => new Response("<html>error</html>"))).rejects.toThrow("invalid_pdf");
    expect(() => reportSource("https://example.com/report.pdf")).toThrow("invalid_pdf_source");
  });
});