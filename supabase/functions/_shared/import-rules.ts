export const IMPORT_ENTITIES = ['patients', 'assessments', 'session_notes', 'pain_diary', 'appointments'] as const;
export type ImportEntity = typeof IMPORT_ENTITIES[number];
export function identity(value: unknown): string {
  return String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
}
export function findPatient(rows: Record<string, any>[], row: Record<string, any>) {
  const email = identity(row.email ?? row.patient_email);
  const cpf = String(row.cpf ?? '').replace(/\D/g, '');
  const name = identity(row.full_name ?? row.patient_name);
  const matches = rows.filter(p => email ? identity(p.email) === email : cpf ? String(p.cpf ?? '').replace(/\D/g, '') === cpf : name && identity(p.full_name) === name);
  if (matches.length > 1) throw new Error('Mais de um paciente corresponde; informe e-mail ou CPF único.');
  return matches[0] ?? null;
}
export function validateImportRow(entity: ImportEntity, row: Record<string, any>) {
  const required = entity === 'patients' ? ['full_name'] : entity === 'pain_diary' ? ['patient_email','logged_at','pain_score'] : entity === 'session_notes' ? ['patient_email','note_date'] : entity === 'appointments' ? ['patient_name','appointment_date'] : ['patient_name'];
  for (const key of required) if (row[key] == null || String(row[key]).trim() === '') throw new Error(`Campo obrigatório: ${key}`);
  for (const key of ['email','patient_email']) if (row[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row[key]))) throw new Error(`E-mail inválido: ${key}`);
  for (const key of ['birth_date','appointment_date','note_date','logged_at','created_at']) {
    if (!row[key]) continue;
    const s = String(row[key]); const date = s.slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(s)) || new Date(date+'T12:00:00Z').toISOString().slice(0,10) !== date) throw new Error(`Data inválida: ${key}`);
  }
  if (row.pain_score != null && (!Number.isInteger(Number(row.pain_score)) || Number(row.pain_score)<0 || Number(row.pain_score)>10)) throw new Error('Dor deve estar entre 0 e 10.');
  if (row.duration_minutes != null && (!Number.isInteger(Number(row.duration_minutes)) || Number(row.duration_minutes)<=0 || Number(row.duration_minutes)>1440)) throw new Error('Duração inválida.');
  if (row.appointment_time && !/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(String(row.appointment_time))) throw new Error('Horário inválido.');
}
export function sameImportedRecord(existing: Record<string, any>, payload: Record<string, any>) {
  return Object.entries(payload).every(([k,v]) => ['external_import_data'].includes(k) || JSON.stringify(existing[k] ?? null) === JSON.stringify(v ?? null));
}
