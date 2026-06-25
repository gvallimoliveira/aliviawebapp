// Parsers para arquivos de importação: CSV, JSON, ZIP (Aliv.iA nativo).
import Papa from "papaparse";
import JSZip from "jszip";

export type ParsedFile = {
  filename: string;
  format: "csv" | "json" | "zip-alivia" | "unknown";
  headers: string[];
  rows: Record<string, any>[];
  // when zip-alivia: nativeEntities holds parsed JSONs by entity name
  nativeEntities?: Record<string, any[]>;
};

export async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name;
  const lower = name.toLowerCase();

  if (lower.endsWith(".zip")) {
    return parseAliviaZip(file);
  }
  if (lower.endsWith(".json")) {
    const text = await file.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = []; }
    const rows: Record<string, any>[] = Array.isArray(data) ? data : (Array.isArray(data?.rows) ? data.rows : [data]);
    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r ?? {}))));
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
    return { filename: name, format: "csv", headers, rows };
  }
  return { filename: name, format: "unknown", headers: [], rows: [] };
}

async function parseAliviaZip(file: File): Promise<ParsedFile> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const native: Record<string, any[]> = {};
  // Convenção do exportZipBuilder: tabelas_brutas/*.json
  for (const path of Object.keys(zip.files)) {
    if (!path.startsWith("tabelas_brutas/") || !path.endsWith(".json")) continue;
    const entity = path.replace("tabelas_brutas/", "").replace(".json", "");
    try {
      const txt = await zip.files[path].async("text");
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) native[entity] = parsed;
    } catch (_) { /* skip */ }
  }
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
