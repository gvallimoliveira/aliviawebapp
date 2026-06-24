// Mirror of supabase/functions/_shared/priority-journals.ts for client UI.
export const PRIORITY_JOURNALS: { name: string; impact: number }[] = [
  { name: "Cochrane Database of Systematic Reviews", impact: 8.4 },
  { name: "Cochrane Database Syst Rev", impact: 8.4 },
  { name: "Journal of Physiotherapy", impact: 9.0 },
  { name: "Journal of Orthopaedic & Sports Physical Therapy", impact: 6.9 },
  { name: "JOSPT", impact: 6.9 },
  { name: "Journal of Neurologic Physical Therapy", impact: 3.6 },
  { name: "Brazilian Journal of Physical Therapy", impact: 3.6 },
  { name: "Physical Therapy", impact: 3.3 },
  { name: "Archives of Physiotherapy", impact: 3.1 },
  { name: "Physiotherapy", impact: 3.1 },
  { name: "Journal of Geriatric Physical Therapy", impact: 3.0 },
  { name: "Clinical Rehabilitation", impact: 2.9 },
  { name: "International Journal of Sports Physical Therapy", impact: 2.4 },
  { name: "Chiropractic & Manual Therapies", impact: 2.4 },
  { name: "Physical Therapy in Sport", impact: 2.3 },
  { name: "Musculoskeletal Science and Practice", impact: 2.2 },
];

export const PRIORITY_JOURNAL_IF_THRESHOLD = 3.0;

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function journalImpactFactor(journal?: string | null): number | null {
  if (!journal) return null;
  const j = norm(journal);
  if (!j) return null;
  for (const p of PRIORITY_JOURNALS) {
    const n = norm(p.name);
    if (j === n || j.includes(n) || n.includes(j)) return p.impact;
  }
  return null;
}

export function isPriorityJournal(journal?: string | null): boolean {
  const i = journalImpactFactor(journal);
  return typeof i === "number" && i >= PRIORITY_JOURNAL_IF_THRESHOLD;
}
