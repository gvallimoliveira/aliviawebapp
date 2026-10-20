import { NATIVE_FIELDS, guessEntity, guessMapping, type EntityKey } from "./importMappings";
import type { ParsedFile } from "./importParsers";

const ZIP_ENTITIES: Record<string, EntityKey> = {
  patients: "patients", assessments: "assessments", session_notes: "session_notes",
  sessionNotes: "session_notes", appointments: "appointments", professional_appointments: "appointments",
  pain_diary_entries: "pain_diary", painDiary: "pain_diary", pain_diary: "pain_diary",
};
export function expandImportFile(parsed: ParsedFile): { parsed: ParsedFile; entity: EntityKey }[] {
  if (parsed.tables) return parsed.tables.flatMap(expandImportFile);
  if (!parsed.nativeEntities) return [{ parsed, entity: guessEntity(parsed.headers) }];
  const parts = Object.entries(parsed.nativeEntities).filter(([name]) => ZIP_ENTITIES[name]).map(([name, rows]) => ({
    entity: ZIP_ENTITIES[name],
    parsed: { filename: `${parsed.filename} / ${name}`, format: parsed.format, headers: Array.from(new Set(rows.flatMap(r => Object.keys(r)))), rows },
  }));
  if (!parts.length) throw new Error("ZIP sem pacientes, avaliações, evoluções, agenda ou diário compatíveis.");
  return parts;
}
export function defaultImportMappings(headers: string[], entity: EntityKey) {
  return headers.map(source => ({ source, target: ["id", "user_id", "professional_id", "clinic_id", "import_batch_id"].includes(source) ? "ignore" : guessMapping(source, entity), confidence: 0.5 }));
}
export function missingImportFields(headers: string[], entity: EntityKey) {
  return NATIVE_FIELDS[entity].filter(f => f.required && !headers.includes(f.key)).map(f => f.label);
}