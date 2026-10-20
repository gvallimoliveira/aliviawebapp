export interface XmlTable { name: string; rows: Record<string, string>[] }

/** Read tabular XML locally; never resolve DTDs or external entities. */
export function readXmlTables(text: string): XmlTable[] {
  if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(text)) throw new Error("XML com DTD ou entidades externas não é aceito.");
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length || !doc.documentElement) throw new Error("XML inválido.");
  const tables: XmlTable[] = [];
  let count = 0;
  function check(node: Element, depth: number) {
    if (++count > 100000 || depth > 32) throw new Error("XML muito complexo; divida o arquivo.");
    for (const child of Array.from(node.children)) check(child, depth + 1);
  }
  check(doc.documentElement, 0);
  function row(node: Element): Record<string, string> {
    const out: Record<string, string> = Object.create(null);
    function flatten(el: Element, prefix: string) {
      for (const attr of Array.from(el.attributes)) {
        if (attr.name === "xmlns" || attr.prefix === "xmlns") continue;
        out[prefix ? `${prefix}.@${attr.localName}` : attr.localName] = attr.value;
      }
      const children = Array.from(el.children);
      if (!children.length && prefix) out[prefix] = el.textContent?.trim() ?? "";
      const occurrences = new Map<string, number>();
      const totals = new Map<string, number>();
      for (const child of children) totals.set(child.localName, (totals.get(child.localName) ?? 0) + 1);
      for (const child of children) {
        const index = (occurrences.get(child.localName) ?? 0) + 1;
        occurrences.set(child.localName, index);
        const repeated = (totals.get(child.localName) ?? 0) > 1;
        const key = child.localName + (repeated ? `[${index}]` : "");
        flatten(child, prefix ? `${prefix}.${key}` : key);
      }
    }
    flatten(node, "");
    return out;
  }
  const recordNames = new Set(["paciente", "patient", "avaliacao", "avaliação", "assessment", "evolucao", "evolução", "session_note", "agendamento", "appointment", "registro", "record", "row"]);
  function visit(node: Element) {
    const children = Array.from(node.children);
    if (recordNames.has(node.localName.toLowerCase()) && (children.length || node.attributes.length)) {
      tables.push({ name: node.localName, rows: [row(node)] });
      return;
    }
    if (!children.length) return;
    const groups = new Map<string, Element[]>();
    for (const child of children) groups.set(child.localName, [...(groups.get(child.localName) ?? []), child]);
    const records = [...groups].filter(([name, nodes]) => nodes.some(n => n.children.length || n.attributes.length) && (nodes.length > 1 || recordNames.has(name.toLowerCase())));
    if (records.length) {
      for (const [name, nodes] of records) {
        if (nodes.length > 5000) throw new Error("Máximo de 5.000 linhas por tabela; divida o arquivo.");
        tables.push({ name, rows: nodes.map(row) });
      }
      for (const [name, nodes] of groups) if (!records.some(([key]) => key === name)) for (const child of nodes) visit(child);
    } else if (children.every(c => !c.children.length)) {
      tables.push({ name: node.localName, rows: [row(node)] });
    } else for (const child of children) visit(child);
  }
  visit(doc.documentElement);
  if (!tables.length || tables.some(t => t.rows.some(r => !Object.keys(r).length))) throw new Error("XML sem registros tabulares válidos.");
  if (tables.length > 50) throw new Error("Máximo de 50 tabelas por importação.");
  return tables;
}