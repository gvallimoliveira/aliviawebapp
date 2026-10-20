import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseFile } from "../lib/importParsers";
import { expandImportFile, defaultImportMappings } from "../lib/importFiles";
import { normalizeValue } from "../lib/importMappings";
import { findPatient, validateImportRow, sameImportedRecord } from "../../supabase/functions/_shared/import-rules";

function file(name: string, text: string) { return { name, text: async () => text } as File; }
describe("Generic data import", () => {
  it("reads CSV and tabular TSV", async () => {
    expect((await parseFile(file("patients.csv", "Nome,Email\nLucas,lucas@example.invalid"))).rows[0].Nome).toBe("Lucas");
    expect((await parseFile(file("patients.tsv", "Nome\tEmail\nLucas\tlucas@example.invalid"))).rows[0].Email).toBe("lucas@example.invalid");
  });
  it("rejects malformed and empty JSON rather than importing zero records", async () => {
    await expect(parseFile(file("bad.json", "{"))).rejects.toThrow("JSON inválido");
    await expect(parseFile(file("empty.json", "[]"))).rejects.toThrow("sem registros");
  });
  it("expands actual export ZIP paths into supported entities without source IDs", async () => {
    const zip = new JSZip();
    zip.file("tabelas_brutas/json/patients.json", JSON.stringify([{ id: "old", full_name: "Lucas" }]));
    zip.file("tabelas_brutas/json/session_notes.json", JSON.stringify([{ session_date: "2026-10-20", patient_email: "lucas@example.invalid", content: "Nota" }]));
    zip.file("tabelas_brutas/json/messages.json", JSON.stringify([{ content: "Não importar" }]));
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const parts = expandImportFile(await parseFile({ name: "backup.zip", arrayBuffer: async () => buffer } as File));
    expect(parts.map(p => p.entity)).toEqual(["patients", "session_notes"]);
    expect(defaultImportMappings(parts[0].parsed.headers, "patients").find(m => m.source === "id")?.target).toBe("ignore");
    expect(defaultImportMappings(parts[1].parsed.headers, "session_notes").find(m => m.source === "session_date")?.target).toBe("note_date");
  });
  it("preserves structured clinical results and normalizes dates", () => {
    expect(normalizeValue("test_results", { score: 5 })).toEqual({ score: 5 });
    expect(normalizeValue("note_date", "20/10/2026")).toBe("2026-10-20");
  });
  it("matches patients without email by CPF then normalized exact name, never the first unrelated patient", () => {
    const patients = [{ id: "one", full_name: "Outra Pessoa" }, { id: "two", full_name: "Lúcas Silva", cpf: "12345678900" }];
    expect(findPatient(patients, { full_name: "Lucas Silva" })?.id).toBe("two");
    expect(findPatient(patients, { cpf: "123.456.789-00" })?.id).toBe("two");
    expect(findPatient(patients, { full_name: "Novo Paciente" })).toBeNull();
  });
  it("refuses ambiguous matches rather than merging homonyms", () => {
    expect(() => findPatient([{ full_name: "Lucas" }, { full_name: "Lucas" }], { full_name: "Lucas" })).toThrow("Mais de um");
  });
  it("requires historical dates and rejects impossible dates and invalid pain", () => {
    expect(() => validateImportRow("session_notes", { patient_email: "a@example.invalid" })).toThrow("note_date");
    expect(() => validateImportRow("patients", { full_name: "Lucas", birth_date: "2026-02-31" })).toThrow("Data inválida");
    expect(() => validateImportRow("pain_diary", { patient_email: "a@example.invalid", logged_at: "2026-10-20", pain_score: 11 })).toThrow("0 e 10");
  });
  it("deduplicates clinical content without erasing different records", () => {
    const payload = { content: "Melhora", session_date: "2026-10-20" };
    expect(sameImportedRecord({ ...payload, id: "existing" }, payload)).toBe(true);
    expect(sameImportedRecord({ ...payload, content: "Piora" }, payload)).toBe(false);
  });
  it("rejects invalid numeric values instead of silently dropping them", () => {
    expect(() => normalizeValue("pain_score", "não informado como número")).toThrow("Número inválido");
    expect(() => normalizeValue("duration_minutes", "cinquenta")).toThrow("Número inválido");
  });
  it("rejects malformed ZIP table rows before expanding them", async () => {
    const zip = new JSZip();
    zip.file("tabelas_brutas/json/patients.json", JSON.stringify([null]));
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    await expect(parseFile({ name: "bad.zip", arrayBuffer: async () => buffer } as File)).rejects.toThrow("Tabela inválida");
  });
});