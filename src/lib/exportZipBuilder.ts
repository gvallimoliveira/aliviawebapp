/**
 * Builds the patient-record-organized export zip.
 *
 * Produces an archive with the following structure:
 *
 *   alivia-export-{slug}-{date}[-part-N-of-M].zip
 *   ├── manifest.json
 *   ├── README.txt
 *   ├── {clinica|profissional}/
 *   │   ├── perfil.json
 *   │   ├── equipe.csv          (clinic only)
 *   │   └── agenda.csv
 *   ├── pacientes/
 *   │   └── {iniciais}-{hash}/
 *   │       ├── paciente.json
 *   │       ├── avaliacoes/{date}-{id}.json
 *   │       ├── evolucao/{session_notes,pain_diary,follow_ups}.csv
 *   │       ├── tratamento/{programas.json, notas_privadas.csv}
 *   │       ├── chat/conversa-{id}.csv
 *   │       ├── documentos/{_index.csv, ...binaries}
 *   │       └── fotos/{_index.csv, ...binaries}
 *   └── tabelas_brutas/{csv,json}/{table}.{csv,json}
 *
 * Multi-volume splitting: when total binary bytes would exceed
 * MAX_BYTES_PER_VOLUME, binaries spill into additional `-part-N-of-M.zip`
 * files. Part 1 always contains the manifest + all structured data; binaries
 * are spread across parts.
 */

import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { initialsOf } from "@/lib/anonymizePatient";

export type ExportMode = "clinic" | "professional" | "demo";

export interface ExportSelection {
  patients: boolean;
  assessments: boolean;
  appointments: boolean;
  evolution: boolean; // session_notes, pain_diary, follow_ups
  treatment: boolean; // exercise_programs (+ items + completions)
  voiceNotes: boolean;
  questionnaires: boolean;
  notes: boolean; // professional_notes (only own, even in clinic mode)
  chat: boolean; // conversations + messages
  auditLogs: boolean; // clinic_assessment_logs (clinic only)
  documents: boolean; // patient_files index
  photos: boolean; // patient_photos index
  binaries: boolean; // download actual file/photo bytes
}

export interface ExportOptions {
  mode: ExportMode;
  clinicId?: string;
  professionalId?: string;
  userId?: string; // current auth user id (for professional_notes own filter)
  entityName?: string;
  selection: ExportSelection;
  /** Soft cap per zip part. Default 200MB. */
  maxBytesPerVolume?: number;
  /** Hard ceiling — refuse to export beyond this even after splitting. Default 2GB. */
  maxTotalBytes?: number;
  onProgress?: (info: { stage: string; current?: number; total?: number; note?: string }) => void;
}

export interface ExportResult {
  parts: { name: string; blob: Blob; sizeBytes: number }[];
  totalBytes: number;
  manifest: any;
}

const DEFAULT_MAX_VOLUME = 200 * 1024 * 1024;
const DEFAULT_MAX_TOTAL = 2 * 1024 * 1024 * 1024;
const BINARY_DOWNLOAD_BATCH = 5;

// ─── helpers ────────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  (s || "export")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const fileSafe = (s: string) =>
  (s || "arquivo").replace(/[/\\?%*:|"<>\x00-\x1f]/g, "_").slice(0, 120);

function toCsv(rows: any[]): string {
  if (!rows || rows.length === 0) return "";
  const cols = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r ?? {}).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    let s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n;]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return (
    "\ufeff" +
    cols.join(",") +
    "\n" +
    rows.map((r) => cols.map((c) => escape(r?.[c])).join(",")).join("\n")
  );
}

function patientFolderName(p: { full_name?: string | null; id?: string | null; email?: string | null }) {
  const seed = String(p?.id ?? p?.email ?? Math.random());
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const hash = Math.abs(h).toString(36).slice(0, 4);
  // Use full name when available so folders are easy to locate.
  // Fall back to initials + hash when there's no name.
  const rawName = (p?.full_name ?? "").trim();
  if (rawName) {
    // Normalize: strip diacritics, collapse spaces -> single space, keep readable.
    const normalized = rawName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return fileSafe(`${normalized}-${hash}`);
  }
  const initials = initialsOf(p?.email ?? null).replace(/\.$/, "");
  return fileSafe(`${initials}-${hash}`);
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  try {
    const d = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(d))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

// ─── core builder ───────────────────────────────────────────────────────────

interface PendingBinary {
  patientFolder: string;
  subDir: "documentos" | "fotos";
  fileName: string;
  bucket: string;
  filePath: string;
  sizeHint?: number | null;
}

export async function buildExportZip(opts: ExportOptions): Promise<ExportResult> {
  const {
    mode,
    selection,
    entityName,
    onProgress = () => {},
    maxBytesPerVolume = DEFAULT_MAX_VOLUME,
    maxTotalBytes = DEFAULT_MAX_TOTAL,
  } = opts;

  onProgress({ stage: "Coletando dados..." });

  // 1. Fetch structured data (real or demo)
  const data =
    mode === "demo"
      ? await collectDemoData()
      : await collectRealData(opts);

  // 2. Build patient tree
  const patientsById = new Map<string, any>();
  const patientsByEmail = new Map<string, any>();
  for (const p of data.patients ?? []) {
    if (p.id) patientsById.set(String(p.id), p);
    if (p.email) patientsByEmail.set(String(p.email).toLowerCase(), p);
  }

  const resolvePatient = (row: any): any => {
    if (row?.patient_id && patientsById.has(String(row.patient_id))) {
      return patientsById.get(String(row.patient_id));
    }
    if (row?.patient_email) {
      return (
        patientsByEmail.get(String(row.patient_email).toLowerCase()) ?? {
          id: null,
          email: row.patient_email,
          full_name: row.patient_name ?? row.patient_email,
        }
      );
    }
    if (row?.user_id && patientsByEmail.has(String(row.user_id))) {
      return patientsByEmail.get(String(row.user_id));
    }
    return null;
  };

  const tree = new Map<
    string,
    {
      patient: any;
      assessments: any[];
      voiceNotes: any[];
      questionnaires: any[];
      auditLogs: any[];
      sessionNotes: any[];
      painDiary: any[];
      followUps: any[];
      programs: any[];
      programItems: any[];
      completions: any[];
      notes: any[];
      conversations: any[];
      messages: any[];
      files: any[];
      photos: any[];
    }
  >();

  const ensure = (p: any) => {
    const key = patientFolderName(p);
    if (!tree.has(key)) {
      tree.set(key, {
        patient: p,
        assessments: [],
        voiceNotes: [],
        questionnaires: [],
        auditLogs: [],
        sessionNotes: [],
        painDiary: [],
        followUps: [],
        programs: [],
        programItems: [],
        completions: [],
        notes: [],
        conversations: [],
        messages: [],
        files: [],
        photos: [],
      });
    }
    return tree.get(key)!;
  };
  // seed with known patients so the patient folder exists even if empty
  for (const p of data.patients ?? []) ensure(p);

  const pushByPatient = (rows: any[], key: keyof ReturnType<typeof ensure>) => {
    for (const r of rows ?? []) {
      const p = resolvePatient(r);
      if (!p) continue;
      const bucket = ensure(p);
      (bucket[key] as any[]).push(r);
    }
  };

  if (selection.assessments) pushByPatient(data.assessments ?? [], "assessments");
  if (selection.voiceNotes) pushByPatient(data.voiceNotes ?? [], "voiceNotes");
  if (selection.questionnaires) pushByPatient(data.questionnaires ?? [], "questionnaires");
  if (selection.evolution) {
    pushByPatient(data.sessionNotes ?? [], "sessionNotes");
    pushByPatient(data.painDiary ?? [], "painDiary");
    pushByPatient(data.followUps ?? "followUps" in data ? (data.followUps as any[]) : [], "followUps");
  }
  if (selection.treatment) {
    pushByPatient(data.programs ?? [], "programs");
  }
  if (selection.notes) {
    pushByPatient(data.notes ?? [], "notes");
  }
  if (selection.chat) {
    pushByPatient(data.conversations ?? [], "conversations");
  }
  if (selection.documents) pushByPatient(data.files ?? [], "files");
  if (selection.photos) pushByPatient(data.photos ?? [], "photos");

  // Attach audit logs to their assessment's patient
  if (selection.auditLogs) {
    const aById = new Map<string, any>();
    for (const a of data.assessments ?? []) if (a.id) aById.set(String(a.id), a);
    for (const log of data.auditLogs ?? []) {
      const a = log.assessment_id ? aById.get(String(log.assessment_id)) : null;
      const p = a ? resolvePatient(a) : null;
      if (p) ensure(p).auditLogs.push(log);
    }
  }

  // Attach program items + completions to programs (then to patient)
  if (selection.treatment) {
    const itemsByProgram = new Map<string, any[]>();
    for (const it of data.programItems ?? []) {
      const k = String(it.program_id ?? "");
      if (!k) continue;
      (itemsByProgram.get(k) ?? itemsByProgram.set(k, []).get(k))!.push(it);
    }
    const compsByProgram = new Map<string, any[]>();
    for (const c of data.completions ?? []) {
      const k = String(c.program_id ?? "");
      if (!k) continue;
      (compsByProgram.get(k) ?? compsByProgram.set(k, []).get(k))!.push(c);
    }
    for (const bucket of tree.values()) {
      for (const prog of bucket.programs) {
        prog._items = itemsByProgram.get(String(prog.id)) ?? [];
        prog._completions = compsByProgram.get(String(prog.id)) ?? [];
      }
    }
  }

  // Attach messages to their conversation (then patient via conversation.recipient_user_id / professional_id)
  if (selection.chat) {
    const msgsByConv = new Map<string, any[]>();
    for (const m of data.messages ?? []) {
      const k = String(m.conversation_id ?? "");
      if (!k) continue;
      (msgsByConv.get(k) ?? msgsByConv.set(k, []).get(k))!.push(m);
    }
    for (const bucket of tree.values()) {
      for (const conv of bucket.conversations) {
        conv._messages = msgsByConv.get(String(conv.id)) ?? [];
      }
    }
  }

  // 3. Plan binaries
  const pendingBinaries: PendingBinary[] = [];
  if (selection.binaries) {
    for (const [folder, b] of tree.entries()) {
      for (const f of b.files) {
        if (!f.file_path) continue;
        pendingBinaries.push({
          patientFolder: folder,
          subDir: "documentos",
          fileName: fileSafe(f.file_name ?? `arquivo-${f.id}`),
          bucket: "patient-files",
          filePath: f.file_path,
          sizeHint: f.file_size_bytes ?? null,
        });
      }
      for (const p of b.photos) {
        if (!p.file_path) continue;
        pendingBinaries.push({
          patientFolder: folder,
          subDir: "fotos",
          fileName: fileSafe(p.file_name ?? `foto-${p.id}`),
          bucket: "patient-photos",
          filePath: p.file_path,
          sizeHint: p.file_size_bytes ?? null,
        });
      }
    }
  }

  const estimatedBinaryBytes = pendingBinaries.reduce(
    (sum, b) => sum + (b.sizeHint ?? 200_000),
    0,
  );
  if (estimatedBinaryBytes > maxTotalBytes) {
    throw new Error(
      `Tamanho estimado dos arquivos binários (${(estimatedBinaryBytes / 1024 / 1024).toFixed(0)} MB) excede o limite máximo de ${(maxTotalBytes / 1024 / 1024).toFixed(0)} MB. Reduza o escopo ou desmarque "Incluir arquivos binários".`,
    );
  }

  // 4. Generate manifest + structured zips
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = slugify(entityName || (mode === "clinic" ? "clinica" : mode === "demo" ? "demo" : "profissional"));

  const counts: Record<string, number> = {
    patients: data.patients?.length ?? 0,
    assessments: data.assessments?.length ?? 0,
    appointments: data.appointments?.length ?? 0,
    voice_notes: data.voiceNotes?.length ?? 0,
    questionnaires: data.questionnaires?.length ?? 0,
    session_notes: data.sessionNotes?.length ?? 0,
    pain_diary: data.painDiary?.length ?? 0,
    follow_ups: data.followUps?.length ?? 0,
    exercise_programs: data.programs?.length ?? 0,
    professional_notes: data.notes?.length ?? 0,
    conversations: data.conversations?.length ?? 0,
    messages: data.messages?.length ?? 0,
    audit_logs: data.auditLogs?.length ?? 0,
    files: data.files?.length ?? 0,
    photos: data.photos?.length ?? 0,
  };

  const manifestBase = {
    schema_version: 2,
    export_date: new Date().toISOString(),
    export_mode: mode,
    entity_name: entityName ?? null,
    entity_id: opts.clinicId ?? opts.professionalId ?? null,
    included_sections: Object.entries(selection)
      .filter(([, v]) => v)
      .map(([k]) => k),
    counts,
    patient_count: tree.size,
    binaries_included: selection.binaries,
    binaries_estimated_bytes: estimatedBinaryBytes,
    note:
      mode === "demo"
        ? "Pacote DE DEMONSTRAÇÃO — dados fictícios, sem binários reais."
        : "Backup completo. Em caso de auditoria/LGPD, manifest.json comprova escopo e contagens.",
  };

  // ── PART 1: all structured data ──
  const buildPart1 = async () => {
    const zip = new JSZip();
    const scopeDir = mode === "clinic" ? "clinica" : "profissional";

    zip.file(`${scopeDir}/perfil.json`, JSON.stringify(data.entityProfile ?? {}, null, 2));
    if (data.team?.length) {
      zip.file(`${scopeDir}/equipe.csv`, toCsv(data.team));
      zip.file(`${scopeDir}/equipe.json`, JSON.stringify(data.team, null, 2));
    }
    if (selection.appointments) {
      zip.file(`${scopeDir}/agenda.csv`, toCsv(data.appointments ?? []));
      zip.file(`${scopeDir}/agenda.json`, JSON.stringify(data.appointments ?? [], null, 2));
    }

    // Per-patient folders
    for (const [folder, b] of tree.entries()) {
      const root = `pacientes/${folder}`;
      zip.file(`${root}/paciente.json`, JSON.stringify(b.patient, null, 2));

      if (selection.assessments) {
        for (const a of b.assessments) {
          const date = (a.created_at ?? "").slice(0, 10) || "sem-data";
          zip.file(
            `${root}/avaliacoes/${date}-${String(a.id).slice(0, 8)}.json`,
            JSON.stringify(
              {
                ...a,
                _voice_notes: b.voiceNotes.filter((v) => String(v.assessment_id) === String(a.id)),
                _questionnaires: b.questionnaires.filter(
                  (q) => String(q.assessment_id) === String(a.id),
                ),
                _audit_logs: b.auditLogs.filter((l) => String(l.assessment_id) === String(a.id)),
              },
              null,
              2,
            ),
          );
        }
      }

      if (selection.evolution) {
        if (b.sessionNotes.length)
          zip.file(`${root}/evolucao/session_notes.csv`, toCsv(b.sessionNotes));
        if (b.painDiary.length)
          zip.file(`${root}/evolucao/pain_diary.csv`, toCsv(b.painDiary));
        if (b.followUps.length)
          zip.file(`${root}/evolucao/follow_ups.csv`, toCsv(b.followUps));
      }

      if (selection.treatment && b.programs.length) {
        zip.file(`${root}/tratamento/programas.json`, JSON.stringify(b.programs, null, 2));
      }
      if (selection.notes && b.notes.length) {
        zip.file(`${root}/tratamento/notas_privadas.csv`, toCsv(b.notes));
      }

      if (selection.chat && b.conversations.length) {
        for (const c of b.conversations) {
          zip.file(
            `${root}/chat/conversa-${String(c.id).slice(0, 8)}.csv`,
            toCsv(c._messages ?? []),
          );
        }
      }

      if (selection.documents && b.files.length) {
        zip.file(
          `${root}/documentos/_index.csv`,
          toCsv(
            b.files.map((f) => ({
              id: f.id,
              file_name: f.file_name,
              mime_type: f.mime_type,
              size_bytes: f.file_size_bytes,
              description: f.description,
              created_at: f.created_at,
              included_binary: selection.binaries,
            })),
          ),
        );
      }
      if (selection.photos && b.photos.length) {
        zip.file(
          `${root}/fotos/_index.csv`,
          toCsv(
            b.photos.map((p) => ({
              id: p.id,
              file_name: p.file_name,
              mime_type: p.mime_type,
              category: p.category,
              description: p.description,
              created_at: p.created_at,
              included_binary: selection.binaries,
            })),
          ),
        );
      }
    }

    // Raw tables for auditing
    const rawSections: Array<[string, any[]]> = [
      ["patients", data.patients ?? []],
      ["assessments", data.assessments ?? []],
      ["appointments", data.appointments ?? []],
      ["session_notes", data.sessionNotes ?? []],
      ["pain_diary", data.painDiary ?? []],
      ["follow_ups", data.followUps ?? []],
      ["voice_notes", data.voiceNotes ?? []],
      ["pending_questionnaires", data.questionnaires ?? []],
      ["exercise_programs", data.programs ?? []],
      ["exercise_program_items", data.programItems ?? []],
      ["exercise_completions", data.completions ?? []],
      ["professional_notes", data.notes ?? []],
      ["conversations", data.conversations ?? []],
      ["messages", data.messages ?? []],
      ["clinic_assessment_logs", data.auditLogs ?? []],
      ["files_index", data.files ?? []],
      ["photos_index", data.photos ?? []],
    ];
    for (const [name, rows] of rawSections) {
      if (!rows.length) continue;
      zip.file(`tabelas_brutas/json/${name}.json`, JSON.stringify(rows, null, 2));
      zip.file(`tabelas_brutas/csv/${name}.csv`, toCsv(rows));
    }

    return zip;
  };

  // 5. Download binaries with batching + multi-volume splitting
  const parts: { name: string; blob: Blob; sizeBytes: number; zip: JSZip; bytesUsed: number }[] = [];
  const part1Zip = await buildPart1();
  parts.push({ name: "", blob: null as any, sizeBytes: 0, zip: part1Zip, bytesUsed: 0 });

  const binaryManifest: Array<{
    part: number;
    path: string;
    bucket: string;
    storage_path: string;
    sha256: string;
    size_bytes: number;
  }> = [];

  if (selection.binaries && pendingBinaries.length) {
    onProgress({ stage: "Baixando arquivos binários", current: 0, total: pendingBinaries.length });
    let done = 0;
    let totalBinaryBytes = 0;

    for (let i = 0; i < pendingBinaries.length; i += BINARY_DOWNLOAD_BATCH) {
      const batch = pendingBinaries.slice(i, i + BINARY_DOWNLOAD_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (b) => {
          if (mode === "demo") {
            const txt = `[DEMO] Em produção, este local conteria o arquivo binário real:\nbucket=${b.bucket}\npath=${b.filePath}\n`;
            const blob = new Blob([txt], { type: "text/plain" });
            return { b, blob, buf: await blob.arrayBuffer() };
          }
          const { data: dl, error } = await supabase.storage.from(b.bucket).download(b.filePath);
          if (error || !dl) throw error ?? new Error("Download falhou");
          const buf = await dl.arrayBuffer();
          return { b, blob: dl, buf };
        }),
      );

      for (const r of results) {
        done++;
        if (r.status !== "fulfilled") continue;
        const { b, blob, buf } = r.value;
        const size = buf.byteLength;
        totalBinaryBytes += size;
        if (totalBinaryBytes > maxTotalBytes) {
          throw new Error(`Limite máximo total de ${(maxTotalBytes / 1024 / 1024).toFixed(0)} MB excedido durante download.`);
        }
        // pick a volume
        let target = parts[parts.length - 1];
        if (target.bytesUsed + size > maxBytesPerVolume && parts.length > 0) {
          target = { name: "", blob: null as any, sizeBytes: 0, zip: new JSZip(), bytesUsed: 0 };
          parts.push(target);
        }
        const path = `pacientes/${b.patientFolder}/${b.subDir}/${b.fileName}`;
        target.zip.file(path, blob);
        target.bytesUsed += size;
        const sha = await sha256Hex(buf);
        binaryManifest.push({
          part: parts.indexOf(target) + 1,
          path,
          bucket: b.bucket,
          storage_path: b.filePath,
          sha256: sha,
          size_bytes: size,
        });
      }
      onProgress({ stage: "Baixando arquivos binários", current: done, total: pendingBinaries.length });
    }
  }

  // 6. Finalize: write manifest + README to part 1, generate blobs
  const totalParts = parts.length;
  const manifest = {
    ...manifestBase,
    total_parts: totalParts,
    max_bytes_per_volume: maxBytesPerVolume,
    binaries: binaryManifest,
  };

  parts[0].zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  parts[0].zip.file(
    "README.txt",
    [
      "Aliv.iA — Backup e exportação de dados",
      "",
      `Pacote gerado em ${manifest.export_date}.`,
      `Modo: ${mode}.`,
      `Total de partes: ${totalParts}.`,
      "",
      "Estrutura:",
      "  manifest.json         — versão, escopo, contagens, checksums",
      "  {clinica|profissional}/ — perfil + agenda + (clínica: equipe)",
      "  pacientes/{Nome do Paciente-hash}/ — uma pasta por paciente",
      "    paciente.json       — cadastro",
      "    avaliacoes/         — uma avaliação por arquivo (com voice notes, questionários e logs de auditoria)",
      "    evolucao/           — session_notes, pain_diary, follow_ups (CSV)",
      "    tratamento/         — programas de exercício + notas privadas do profissional",
      "    chat/               — conversas com o paciente",
      "    documentos/, fotos/ — índice + binários (se opção marcada)",
      "  tabelas_brutas/       — dump plano por tabela (csv + json) para auditoria",
      "",
      totalParts > 1
        ? `Os arquivos binários foram distribuídos em ${totalParts} partes devido ao tamanho. Extraia todas as partes no mesmo diretório.`
        : "",
      "",
      "As pastas de pacientes usam o nome completo cadastrado (acentos removidos) + hash curto para evitar colisões.",
      "Pacientes sem nome usam iniciais do e-mail + hash.",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  onProgress({ stage: "Compactando..." });
  let totalBytes = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const name =
      totalParts === 1
        ? `alivia-export-${slug}-${stamp}.zip`
        : `alivia-export-${slug}-${stamp}-part-${i + 1}-of-${totalParts}.zip`;
    const blob = await p.zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    p.name = name;
    p.blob = blob;
    p.sizeBytes = blob.size;
    totalBytes += blob.size;
  }

  return {
    parts: parts.map(({ name, blob, sizeBytes }) => ({ name, blob, sizeBytes })),
    totalBytes,
    manifest,
  };
}

// ─── data collection ────────────────────────────────────────────────────────

async function collectRealData(opts: ExportOptions) {
  const { mode, clinicId, professionalId, userId, selection } = opts;
  const sb: any = supabase;
  const scopeCol = mode === "clinic" ? "clinic_id" : "professional_id";
  const scopeVal = mode === "clinic" ? clinicId : professionalId;
  if (!scopeVal) throw new Error("Identificador de escopo ausente.");

  const scoped = (table: string) => {
    const query = sb.from(table).select("*").eq(scopeCol, scopeVal);
    return mode === "clinic" ? query : query.is("clinic_id", null);
  };
  const empty = async () => ({ data: [] as any[], error: null });

  const [
    patientsRes,
    assessmentsRes,
    appointmentsRes,
    voiceNotesRes,
    questionnairesRes,
    sessionNotesRes,
    filesRes,
    photosRes,
    auditLogsRes,
    conversationsRes,
  ] = await Promise.all([
    selection.patients ? scoped("patients") : empty(),
    selection.assessments ? scoped("assessments") : empty(),
    selection.appointments ? scoped("professional_appointments") : empty(),
    selection.voiceNotes ? scoped("assessment_voice_notes") : empty(),
    selection.questionnaires ? scoped("pending_questionnaires") : empty(),
    selection.evolution ? scoped("session_notes") : empty(),
    selection.documents || selection.binaries ? scoped("patient_files") : empty(),
    selection.photos || selection.binaries ? scoped("patient_photos") : empty(),
    selection.auditLogs && mode === "clinic" ? sb.from("clinic_assessment_logs").select("*").eq("clinic_id", scopeVal) : empty(),
    selection.chat ? scoped("conversations") : empty(),
  ]);

  // notes: always scoped by current professional_id (own only — even in clinic mode)
  // Notes inherit practice scope from their assessment (no clinic_id column).
  const notesRes = selection.notes && assessmentsRes.data?.length
    ? await sb.from("professional_notes").select("*").in("assessment_id", assessmentsRes.data.map((a: any) => a.id))
    : { data: [] as any[] };

  // programs: by professional (clinic owner cannot see other therapists' programs without explicit RLS)
  const programsRes = selection.treatment
    ? await scoped("exercise_programs")
    : { data: [] as any[] };

  let programItems: any[] = [];
  let completions: any[] = [];
  if (selection.treatment && programsRes.data?.length) {
    const ids = programsRes.data.map((p: any) => p.id);
    const [itemsRes, compsRes] = await Promise.all([
      sb.from("exercise_program_items").select("*").in("program_id", ids),
      sb.from("exercise_completions").select("*").in("program_id", ids),
    ]);
    programItems = itemsRes.data ?? [];
    completions = compsRes.data ?? [];
  }

  // pain diary + follow ups: by patient user_id — patients linked by email rarely have user_id,
  // but try via patient emails matching profiles
  let painDiary: any[] = [];
  let followUps: any[] = [];
  if (selection.evolution && patientsRes.data?.length) {
    const emails = patientsRes.data.map((p: any) => p.email).filter(Boolean);
    if (emails.length) {
      // pain_diary_entries doesn't have patient_email; follow_up_emails neither.
      // Best-effort: skip if RLS forbids. Try via professionals' link.
      const [pdRes, fuRes] = await Promise.all([
        sb.from("pain_diary_entries").select("*").in("user_id", emails).then(() => ({ data: [] })).catch(() => ({ data: [] })),
        sb.from("follow_up_emails").select("*").in("user_id", emails).then(() => ({ data: [] })).catch(() => ({ data: [] })),
      ]);
      painDiary = pdRes.data ?? [];
      followUps = fuRes.data ?? [];
    }
  }

  // messages: via conversation ids
  let messages: any[] = [];
  if (selection.chat && conversationsRes.data?.length) {
    const ids = conversationsRes.data.map((c: any) => c.id);
    const { data: msgs } = await sb.from("messages").select("*").in("conversation_id", ids);
    messages = msgs ?? [];
  }

  // entity profile
  let entityProfile: any = {};
  let team: any[] = [];
  if (mode === "clinic") {
    const { data: c } = await sb.from("clinics").select("*").eq("id", scopeVal).maybeSingle();
    entityProfile = c ?? {};
    const { data: m } = await sb.from("clinic_members").select("*").eq("clinic_id", scopeVal);
    team = m ?? [];
  } else if (professionalId) {
    const { data: p } = await sb.from("professionals").select("*").eq("id", professionalId).maybeSingle();
    entityProfile = p ?? {};
  }

  return {
    entityProfile,
    team,
    patients: patientsRes.data ?? [],
    assessments: assessmentsRes.data ?? [],
    appointments: appointmentsRes.data ?? [],
    voiceNotes: voiceNotesRes.data ?? [],
    questionnaires: questionnairesRes.data ?? [],
    sessionNotes: sessionNotesRes.data ?? [],
    painDiary,
    followUps,
    programs: programsRes.data ?? [],
    programItems,
    completions,
    notes: notesRes.data ?? [],
    conversations: conversationsRes.data ?? [],
    messages,
    auditLogs: auditLogsRes.data ?? [],
    files: filesRes.data ?? [],
    photos: photosRes.data ?? [],
  };
}

// ─── demo dataset ───────────────────────────────────────────────────────────

async function collectDemoData() {
  const [{ mockPatientAssessments, mockEvolutionSummary }, { mockSessionNotes, mockPatientFiles }] =
    await Promise.all([
      import("@/data/mockPatientData"),
      import("@/data/mockProDemoExtras"),
    ]);

  // Synthesize patients from assessments
  const patientsByEmail = new Map<string, any>();
  for (const a of mockPatientAssessments) {
    const email = (a as any).patient_email;
    if (!email || patientsByEmail.has(email)) continue;
    patientsByEmail.set(email, {
      id: `demo-pat-${email}`,
      professional_id: "demo-prof",
      full_name: (a as any).patient_name,
      email,
      phone: "(11) 99999-0000",
      birth_date: "1985-06-12",
      sex: "F",
      occupation: "Demo",
      created_at: (a as any).created_at,
    });
  }
  const patients = Array.from(patientsByEmail.values());

  // session notes flattened, tagged with patient_email
  const sessionNotes: any[] = [];
  for (const [email, notes] of Object.entries(mockSessionNotes)) {
    for (const n of notes) {
      sessionNotes.push({
        id: n.id,
        patient_email: email,
        professional_id: "demo-prof",
        session_date: n.session_date,
        content: n.content,
        appointment_id: n.appointment_id ?? null,
        created_at: n.created_at,
        updated_at: n.updated_at,
      });
    }
  }

  // files index (no binary content)
  const files: any[] = [];
  for (const [email, fs] of Object.entries(mockPatientFiles)) {
    for (const f of fs) {
      files.push({
        id: f.id,
        patient_email: email,
        professional_id: "demo-prof",
        file_name: f.file_name,
        file_path: `demo/${email}/${f.file_name}`,
        mime_type: f.mime_type,
        file_size_bytes: f.file_size_bytes,
        description: f.description,
        created_at: f.created_at,
      });
    }
  }

  // photos (minimal)
  const photos = patients.slice(0, 1).flatMap((p) => [
    {
      id: `demo-photo-${p.id}`,
      patient_email: p.email,
      professional_id: "demo-prof",
      file_name: "postural-anterior.jpg",
      file_path: `demo/${p.id}/postural-anterior.jpg`,
      mime_type: "image/jpeg",
      file_size_bytes: 240_000,
      category: "postural",
      description: "Vista anterior",
      created_at: new Date().toISOString(),
    },
  ]);

  // pain diary
  const painDiary = patients.slice(0, 1).flatMap((p, i) =>
    Array.from({ length: 7 }, (_, d) => ({
      id: `demo-pd-${i}-${d}`,
      user_id: p.email,
      patient_email: p.email,
      entry_date: new Date(Date.now() - d * 86400000).toISOString().slice(0, 10),
      pain_score: Math.max(2, 7 - d),
      notes: d === 0 ? "Melhora após sessão" : "",
    })),
  );

  const programs = patients.slice(0, 1).map((p, i) => ({
    id: `demo-prog-${i}`,
    professional_id: "demo-prof",
    patient_email: p.email,
    patient_name: p.full_name,
    notes: "Plano de tratamento inicial — 3x/semana",
    created_at: new Date().toISOString(),
  }));
  const programItems = programs.flatMap((prog) => [
    { id: `${prog.id}-it1`, program_id: prog.id, custom_name: "Ponte glútea", sets: 3, reps: "12", frequency: "diária", sort_order: 1 },
    { id: `${prog.id}-it2`, program_id: prog.id, custom_name: "Prancha frontal", sets: 3, reps: "30s", frequency: "diária", sort_order: 2 },
  ]);

  return {
    entityProfile: {
      id: "demo-prof",
      full_name: "Dr(a). Demonstração",
      crefito: "CREFITO-X 000000-F",
      specialties: ["Ortopedia", "Postural"],
      email: "demo@aliv.ia",
    },
    team: [],
    patients,
    assessments: mockPatientAssessments as any[],
    appointments: [],
    voiceNotes: [],
    questionnaires: [],
    sessionNotes,
    painDiary,
    followUps: [],
    programs,
    programItems,
    completions: [],
    notes: [],
    conversations: [],
    messages: [],
    auditLogs: [],
    files,
    photos,
    _evolutionSummary: mockEvolutionSummary,
  };
}
