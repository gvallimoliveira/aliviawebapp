// Builds the professional's own notes block for AI prompts (clinical impression
// and diagnosis). Pure: no Deno/Node APIs so it is unit-testable from vitest.
// Session evolution notes are intentionally NOT part of this context.

const clean = (v: unknown): string =>
  typeof v === "string" ? v.replace(/\s+\n/g, "\n").trim() : "";

export function summarizeSpecialtyResults(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((r: any) => r && (r.questionnaireId || r.questionnaireName || r.name))
    .map((r: any) => {
      const name = r.questionnaireName || r.name || String(r.questionnaireId).toUpperCase();
      const score = r.score ?? r.totalScore ?? r.percentageScore ?? r.mean ?? null;
      const sev = r.severity || r.level || null;
      const interp = r.interpretation_pt || r.interpretation || r.interpretation_en || null;
      const domains = r.subscores || r.domains || r.domainScores || null;
      const parts = [`${name}${r.date || r.appliedAt ? ` (${String(r.date || r.appliedAt).slice(0, 10)})` : ""}`];
      if (score !== null && score !== undefined) parts.push(`score ${score}`);
      if (sev) parts.push(`severity ${sev}`);
      if (domains && typeof domains === "object") parts.push(`domains ${JSON.stringify(domains)}`);
      if (interp) parts.push(`interpretation: ${interp}`);
      return parts.join(" | ");
    });
}

export function buildProfessionalContext(anamnesis: any): string[] {
  const out: string[] = [];
  const notes = clean(anamnesis?.additionalClinicalNotes);
  const tests = clean(anamnesis?.functionalTests);
  if (notes) {
    out.push(`- **PROFESSIONAL CLINICAL OBSERVATIONS (written by the treating physiotherapist — PRIMARY expert source; they take precedence over patient self-report, must be integrated into the reasoning and never ignored):**\n${notes}`);
  }
  if (tests) {
    out.push(`- **PHYSICAL EXAM / TEST FINDINGS written by the physiotherapist (PRIMARY objective source; NEGATIVE findings such as "no significant rib hump" are clinically meaningful and must be considered):**\n${tests}`);
  }
  const sp = summarizeSpecialtyResults(anamnesis?.specialtyResults);
  if (sp.length > 0) {
    out.push(`- **COMPLEMENTARY / SPECIALTY QUESTIONNAIRES (e.g. SRS-22r — integrate scores and domains into the reasoning):**\n${sp.map((s) => `    • ${s}`).join("\n")}`);
  }
  return out;
}
