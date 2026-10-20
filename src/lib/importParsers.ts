// Parsers para arquivos de importação: CSV, JSON, ZIP (Aliv.iA nativo).
import Papa from "papaparse";
import JSZip from "jszip";
import { readXmlTables } from "./importXml";

export type ParsedFile = {
  filename: string;
  format: "csv" | "json" | "xml" | "zip-alivia" | "unknown";
  tables?: ParsedFile[];
  headers: string[];
  rows: Record<string, any>[];
  // when zip-alivia: nativeEntities holds parsed JSONs by entity name
  nativeEntities?: Record<string, any[]>;
};

export async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name;
  const lower = name.toLowerCase();
  if (lower.endsWith(".xml")) {
    const tables = readXmlTables(await file.text()).map(table => ({
      filename: `${name} / ${table.name}`, format: "xml" as const,
      headers: Array.from(new Set(table.rows.flatMap(row => Object.keys(row)))), rows: table.rows,
    }));
    return tables.length === 1 ? { ...tables[0], filename: name } : { filename: name, format: "xml", headers: [], rows: [], tables };
  }

  if (lower.endsWith(".zip")) {
    return parseAliviaZip(file);
  }
  if (lower.endsWith(".json")) {
    const text = await file.text();
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error("JSON inválido."); }
    const rows: Record<string, any>[] = Array.isArray(data) ? data : (Array.isArray(data?.rows) ? data.rows : [data]);
    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r ?? {}))));
    if (!rows.length || rows.some(r => !r || typeof r !== "object" || Array.isArray(r)) || !headers.length) throw new Error("Arquivo sem registros válidos.");
    return { filename: name, format: "json", headers, rows };
  }
  if (lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt")) {
    const text = await file.text();
    const res = Papa.parse<Record<string, any>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
    });
    const rows = (res.data ?? []).filter((r) => r && Object.values(r).some((v) => v !== "" && v != null));
    const headers = res.meta.fields ?? [];
    if (res.errors.some(e => e.code !== "UndetectableDelimiter")) throw new Error("Planilha inválida: confira colunas e delimitadores.");
    if (!headers.length || !rows.length) throw new Error("Planilha vazia.");
    return { filename: name, format: "csv", headers, rows };
  }
  throw new Error("Formato não suportado. Use CSV, TSV, TXT tabular, JSON, XML ou ZIP do Aliv.iA.");
}

async function parseAliviaZip(file: File): Promise<ParsedFile> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const native: Record<string, any[]> = {};
  let unpacked = 0;
  for (const path of Object.keys(zip.files)) {
    const match = path.match(/^tabelas_brutas\/(?:json\/)?([^/]+)\.json$/);
    if (!match) continue;
    const entity = match[1];
      const txt = await zip.files[path].async("text");
      unpacked += txt.length;
      if (unpacked > 100 * 1024 * 1024) throw new Error("ZIP descompactado excede 100MB.");
      const parsed = JSON.parse(txt);
      if (!Array.isArray(parsed) || parsed.some(row => !row || typeof row !== "object" || Array.isArray(row))) throw new Error(`Tabela inválida no ZIP: ${entity}`);
      if (parsed.length) native[entity] = parsed;
  }
  if (!Object.keys(native).length) throw new Error("ZIP sem tabelas estruturadas. Use o volume que contém os dados, não apenas anexos.");
  return { filename: file.name, format: "zip-alivia", headers: [], rows: [], nativeEntities: native };
}

/** Anonimiza linhas (substitui email/cpf/telefone por marcador) antes de enviar pra IA. */
export function anonymizeSample(rows: Record<string, any>[], limit = 10): Record<string, any>[] {
  return rows.slice(0, limit).map((r) => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(r)) {
      if (v == null) { out[k] = v; continue; }
      const s = String(v);
      out[k] = s
        .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]")
        .replace(/\b\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, "[telefone]")
        .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]");
    }
    return out;
  });
}
