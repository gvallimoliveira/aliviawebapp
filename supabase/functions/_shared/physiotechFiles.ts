export const MAX_REPORT_BYTES = 20 * 1024 * 1024;
const SOURCE_HOST = "ofjtgoobymkuujimtxoy.supabase.co";

export function reportSource(url: string): string {
  const u = new URL(url);
  if (u.protocol !== "https:" || u.hostname !== SOURCE_HOST || !u.pathname.startsWith("/storage/v1/object/")) {
    throw new Error("invalid_pdf_source");
  }
  return u.pathname.replace(/^\/storage\/v1\/object\/(sign|public|authenticated)\//, "");
}

export function patientFileKey(patient: { id: string; email?: string | null }) {
  return patient.email?.trim() || `patient:${patient.id}`;
}

export async function fetchReportPdf(url: string, fetcher: typeof fetch = fetch): Promise<Uint8Array> {
  reportSource(url);
  const response = await fetcher(url, { redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body) throw new Error("pdf_unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_REPORT_BYTES) { await reader.cancel(); throw new Error("pdf_too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("invalid_pdf");
  return bytes;
}

export async function persistReportPdf(admin: any, patient: any, sender: string, url: string, examType: string, examDate: string, title: string | null) {
  const bytes = await fetchReportPdf(url);
  const prefix = patient.clinic_id ? `clinic/${patient.clinic_id}` : `pro/${patient.professional_id}`;
  const path = `${prefix}/${patient.id}/physiotech_${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await admin.storage.from("patient-files").upload(path, bytes, { contentType: "application/pdf" });
  if (uploadError) throw new Error("pdf_upload_failed");
  const { data, error } = await admin.from("patient_files").insert({
    patient_id: patient.id, patient_email: patientFileKey(patient), patient_name: patient.full_name,
    clinic_id: patient.clinic_id, professional_id: patient.clinic_id ? null : patient.professional_id,
    file_name: `PhysioTech_${examType}_${examDate.slice(0, 10)}.pdf`, file_path: path,
    file_size_bytes: bytes.length, mime_type: "application/pdf", uploaded_by: sender,
    description: `Laudo PhysioTech — ${title || examType}`,
  }).select("id").single();
  if (error || !data) {
    await admin.storage.from("patient-files").remove([path]);
    throw new Error("pdf_record_failed");
  }
  return { fileId: data.id as string, path };
}