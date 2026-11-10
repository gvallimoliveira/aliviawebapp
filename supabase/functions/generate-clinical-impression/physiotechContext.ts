// Optional PhysioTech exam context for the clinical impression.
// Any malformed/absent input yields "" so the existing flow is unchanged.
const LABEL: Record<string, string> = { termografia: "Thermography", ultrassom: "Ultrasound", ressonancia: "MRI" };

export function buildPhysioTechBlock(reports: unknown): string {
  try {
    if (!Array.isArray(reports)) return "";
    const items = reports
      .filter((r: any) => r && typeof r === "object" && (String(r.conclusion || "").trim() || (r.metrics && Object.keys(r.metrics).length)))
      .slice(0, 5)
      .map((r: any) => {
        const type = LABEL[String(r.exam_type || "").toLowerCase()] || String(r.exam_type || "Exam");
        const date = r.exam_date ? String(r.exam_date).slice(0, 10) : "?";
        const parts = [`    • ${type}${r.exam_title ? ` — ${String(r.exam_title).slice(0, 200)}` : ""} (${date})`];
        const c = String(r.conclusion || "").replace(/\s+/g, " ").trim();
        if (c) parts.push(`      Conclusion: ${c.slice(0, 1500)}`);
        if (r.metrics && typeof r.metrics === "object" && Object.keys(r.metrics).length) {
          parts.push(`      Metrics: ${JSON.stringify(r.metrics).slice(0, 1500)}`);
        }
        return parts.join("\n");
      });
    if (!items.length) return "";
    return `- **COMPLEMENTARY EXAMS FROM PHYSIOTECH (additional context only — correlate with complaint, ROM and strength; never let them override the clinical examination; do not invent findings beyond what is reported):**\n${items.join("\n")}`;
  } catch {
    return "";
  }
}
