import { describe, it, expect } from "vitest";
import { parseFile } from "../lib/importParsers";
import { expandImportFile } from "../lib/importFiles";
const xml = (text: string) => ({ name: "patients.xml", text: async () => text }) as File;
describe("XML import", () => {
  it("reads patient elements, namespaces, attributes and encoded text", async () => {
    const parsed = await parseFile(xml('<x:pacientes xmlns:x="urn:example"><x:paciente id="old"><x:nome>Ana &amp; João</x:nome><x:email>a@example.invalid</x:email></x:paciente><x:paciente id="two"><x:nome>Bruno</x:nome></x:paciente></x:pacientes>'));
    expect(parsed.format).toBe("xml");
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({ id: "old", nome: "Ana & João", email: "a@example.invalid" });
  });
  it("expands separate patient and assessment tables for independent review", async () => {
    const parts = expandImportFile(await parseFile(xml('<export><pacientes><paciente><nome>Ana</nome></paciente></pacientes><avaliacoes><avaliacao><patient_name>Ana</patient_name><chief_complaint>Dor</chief_complaint></avaliacao></avaliacoes></export>')));
    expect(parts.map(p => p.entity)).toEqual(["patients", "assessments"]);
    expect(parts[1].parsed.rows[0].chief_complaint).toBe("Dor");
  });
  it("keeps nested and repeated values separately, without dropping them", async () => {
    const parsed = await parseFile(xml('<paciente><nome>Ana</nome><endereco><cidade>São Paulo</cidade></endereco><nota>Um</nota><nota>Dois</nota></paciente>'));
    expect(parsed.rows[0]).toMatchObject({ "endereco.cidade": "São Paulo", "nota[1]": "Um", "nota[2]": "Dois" });
  });
  it("rejects broken XML", async () => {
    await expect(parseFile(xml('<pacientes><paciente></pacientes>'))).rejects.toThrow("XML inválido");
  });
  it("rejects DTD and entity expansion", async () => {
    await expect(parseFile(xml('<!DOCTYPE root [<!ENTITY test SYSTEM "file:///private">]><root>&test;</root>'))).rejects.toThrow("DTD");
  });
  it("rejects empty XML and oversized tables", async () => {
    await expect(parseFile(xml('<pacientes/>'))).rejects.toThrow("sem registros");
    await expect(parseFile(xml('<pacientes>' + '<paciente><nome>Ana</nome></paciente>'.repeat(5001) + '</pacientes>'))).rejects.toThrow("5.000");
  });
});