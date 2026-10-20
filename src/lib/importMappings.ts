// Catálogo de campos nativos por entidade Aliv.iA e helpers de normalização.
export type EntityKey = "patients" | "assessments" | "session_notes" | "pain_diary" | "appointments";

export const ENTITY_LABELS: Record<EntityKey, string> = {
  patients: "Pacientes",
  assessments: "Avaliações",
  session_notes: "Evoluções / Session notes",
  pain_diary: "Diário de dor",
  appointments: "Agenda / Consultas",
};

export const NATIVE_FIELDS: Record<EntityKey, { key: string; label: string; required?: boolean }[]> = {
  patients: [
    { key: "full_name", label: "Nome completo", required: true },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefone" },
    { key: "cpf", label: "CPF" },
    { key: "birth_date", label: "Data de nascimento" },
    { key: "sex", label: "Sexo" },
    { key: "occupation", label: "Profissão" },
    { key: "address", label: "Endereço" },
    { key: "notes", label: "Observações" },
  ],
  assessments: [
    { key: "created_at", label: "Data da avaliação" },
    { key: "anamnesis_data", label: "Anamnese estruturada" },
    { key: "test_results", label: "Resultados estruturados" },
    { key: "diagnosis", label: "Diagnóstico estruturado" },
    { key: "patient_name", label: "Nome do paciente", required: true },
    { key: "patient_email", label: "E-mail do paciente" },
    { key: "chief_complaint", label: "Queixa principal" },
    { key: "history", label: "História clínica" },
    { key: "duration", label: "Duração" },
    { key: "onset", label: "Início (instalação)" },
    { key: "aggravating_factors", label: "Fatores agravantes" },
    { key: "relieving_factors", label: "Fatores de alívio" },
    { key: "medications", label: "Medicações" },
    { key: "previous_surgeries", label: "Cirurgias prévias" },
    { key: "comorbidities", label: "Comorbidades" },
    { key: "occupation", label: "Profissão" },
    { key: "complementary_exams", label: "Exames complementares" },
    { key: "pain_score", label: "Escore de dor (0-10)" },
    { key: "pain_type", label: "Tipo de dor" },
    { key: "diagnosis_text", label: "Diagnóstico / hipótese" },
    { key: "clinical_impression", label: "Impressão clínica" },
    { key: "functional_tests", label: "Testes funcionais" },
  ],
  session_notes: [
    { key: "patient_name", label: "Nome do paciente" },
    { key: "patient_email", label: "E-mail do paciente" },
    { key: "note_date", label: "Data da evolução" },
    { key: "content", label: "Conteúdo / nota" },
    { key: "subjective", label: "Subjetivo (S)" },
    { key: "objective", label: "Objetivo (O)" },
    { key: "assessment", label: "Avaliação (A)" },
    { key: "plan", label: "Plano (P)" },
  ],
  pain_diary: [
    { key: "patient_email", label: "E-mail do paciente", required: true },
    { key: "logged_at", label: "Data/hora", required: true },
    { key: "pain_score", label: "Escore de dor (0-10)", required: true },
    { key: "note", label: "Nota" },
  ],
  appointments: [
    { key: "patient_name", label: "Nome do paciente", required: true },
    { key: "patient_email", label: "E-mail do paciente" },
    { key: "patient_phone", label: "Telefone" },
    { key: "appointment_date", label: "Data", required: true },
    { key: "appointment_time", label: "Horário" },
    { key: "duration_minutes", label: "Duração (min)" },
    { key: "status", label: "Status" },
    { key: "notes", label: "Observações" },
  ],
};

export type ColumnTarget = string; // native key | "external" | "ignore"

export interface ColumnMapping {
  source: string;
  target: ColumnTarget;
  confidence?: number;
}

/** Aplica mapeamento a uma linha bruta, separando entre "nativo" e "externo". */
export function applyMapping(
  row: Record<string, any>,
  mappings: ColumnMapping[],
): { native: Record<string, any>; external: Record<string, any> } {
  const native: Record<string, any> = {};
  const external: Record<string, any> = {};
  for (const m of mappings) {
    const v = row[m.source];
    if (v === undefined || v === null || v === "") continue;
    if (m.target === "ignore") continue;
    if (m.target === "external") external[m.source] = v;
    else native[m.target] = v;
  }
  return { native, external };
}

/** Heurística simples client-side (fallback caso IA falhe). */
export function guessEntity(headers: string[]): EntityKey {
  const h = headers.map((s) => s.toLowerCase());
  if (h.some((x) => x.includes("dor") || x.includes("pain"))
      && h.some((x) => x.includes("data") || x.includes("date"))) return "pain_diary";
  if (h.some((x) => x.includes("hora") || x.includes("time") || x.includes("agend"))) return "appointments";
  if (h.some((x) => x.includes("evol") || x.includes("session"))) return "session_notes";
  if (h.some((x) => x.includes("queixa") || x.includes("complaint") || x.includes("hipotese") || x.includes("diagnost"))) return "assessments";
  return "patients";
}

/** Heurística simples nome de coluna -> campo nativo. */
export function guessMapping(header: string, entity: EntityKey): ColumnTarget {
  const h = header.toLowerCase().trim();
  if (NATIVE_FIELDS[entity].some(f => f.key === h)) return h;
  if (entity === "session_notes" && h === "session_date") return "note_date";
  if (entity === "pain_diary" && h === "notes") return "note";
  const dict: Record<EntityKey, Record<string, string>> = {
    patients: {
      "nome": "full_name", "nome completo": "full_name", "name": "full_name", "full name": "full_name", "paciente": "full_name",
      "email": "email", "e-mail": "email",
      "telefone": "phone", "celular": "phone", "phone": "phone", "fone": "phone",
      "cpf": "cpf",
      "nascimento": "birth_date", "data de nascimento": "birth_date", "birthdate": "birth_date", "birth_date": "birth_date",
      "sexo": "sex", "gender": "sex",
      "profissão": "occupation", "profissao": "occupation", "occupation": "occupation",
      "endereço": "address", "endereco": "address", "address": "address",
      "observações": "notes", "observacoes": "notes", "notas": "notes", "notes": "notes",
    },
    assessments: {
      "paciente": "patient_name", "nome": "patient_name",
      "email": "patient_email",
      "queixa": "chief_complaint", "queixa principal": "chief_complaint",
      "hda": "history", "história": "history", "historia": "history",
      "duração": "duration", "duracao": "duration",
      "início": "onset", "inicio": "onset",
      "piora": "aggravating_factors", "melhora": "relieving_factors",
      "medicação": "medications", "medicacao": "medications",
      "cirurgias": "previous_surgeries",
      "comorbidades": "comorbidities",
      "exames": "complementary_exams",
      "dor": "pain_score", "eva": "pain_score",
      "diagnóstico": "diagnosis_text", "diagnostico": "diagnosis_text", "hipótese": "diagnosis_text",
      "impressão": "clinical_impression",
    },
    session_notes: {
      "paciente": "patient_name", "email": "patient_email",
      "data": "note_date",
      "conteúdo": "content", "conteudo": "content", "nota": "content",
      "s": "subjective", "o": "objective", "a": "assessment", "p": "plan",
    },
    pain_diary: {
      "email": "patient_email", "paciente": "patient_email",
      "data": "logged_at", "data/hora": "logged_at",
      "dor": "pain_score", "score": "pain_score", "eva": "pain_score",
      "nota": "note",
    },
    appointments: {
      "paciente": "patient_name", "nome": "patient_name",
      "email": "patient_email", "telefone": "patient_phone",
      "data": "appointment_date", "horário": "appointment_time", "horario": "appointment_time",
      "duração": "duration_minutes", "duracao": "duration_minutes",
      "status": "status", "observação": "notes", "observacao": "notes",
    },
  };
  return dict[entity][h] ?? "external";
}

/** Normaliza valores básicos: trim, datas pt-BR -> ISO, números. */
export function normalizeValue(target: string, raw: any): any {
  if (raw == null) return null;
  if (["anamnesis_data", "test_results", "diagnosis"].includes(target)) {
    if (typeof raw === "object") return raw;
    try { return JSON.parse(String(raw)); } catch { throw new Error(`JSON inválido: ${target}`); }
  }
  let v = String(raw).trim();
  if (!v) return null;
  if (target === "birth_date" || target === "appointment_date" || target === "note_date" || target === "logged_at" || target === "created_at") {
    // dd/mm/yyyy -> yyyy-mm-dd
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      v = `${yyyy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
  }
  if (target === "pain_score" || target === "duration_minutes") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (target === "cpf") return v.replace(/\D/g, "");
  return v;
}
