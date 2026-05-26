import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Loader2, ShieldCheck, FileArchive, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  mode: "clinic" | "professional";
  clinicId?: string;
  professionalId?: string;
  entityName?: string;
}

type SectionKey =
  | "patients"
  | "assessments"
  | "appointments"
  | "notes"
  | "voiceNotes"
  | "files"
  | "photos";

const SECTION_LABELS: { key: SectionKey; label: string; hint: string }[] = [
  { key: "patients", label: "Pacientes", hint: "Cadastro básico (nome, contato, etc.)" },
  { key: "assessments", label: "Avaliações", hint: "Anamnese, hipótese, plano de tratamento" },
  { key: "appointments", label: "Agenda", hint: "Consultas e atendimentos" },
  { key: "notes", label: "Anotações clínicas", hint: "Notas privadas do profissional" },
  { key: "voiceNotes", label: "Notas de voz", hint: "Transcrições e resumos de áudio" },
  { key: "files", label: "Documentos (índice)", hint: "Links temporários — aumentam pouco o .zip" },
  { key: "photos", label: "Fotos posturais (índice)", hint: "Links temporários — aumentam pouco o .zip" },
];

const ExportDataCard = ({ mode, clinicId, professionalId, entityName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<SectionKey, boolean>>({
    patients: true,
    assessments: true,
    appointments: true,
    notes: true,
    voiceNotes: true,
    files: true,
    photos: true,
  });
  const isClinic = mode === "clinic";
  const scopeFilter = isClinic
    ? { col: "clinic_id", val: clinicId }
    : { col: "professional_id", val: professionalId };

  const toggle = (key: SectionKey) =>
    setSelected((s) => ({ ...s, [key]: !s[key] }));

  const setAll = (val: boolean) =>
    setSelected({
      patients: val,
      assessments: val,
      appointments: val,
      notes: val,
      voiceNotes: val,
      files: val,
      photos: val,
    });

  const handleExport = async () => {
    if (!scopeFilter.val) {
      toast.error("Identificador não encontrado");
      return;
    }
    if (!Object.values(selected).some(Boolean)) {
      toast.error("Selecione ao menos um tipo de dado");
      return;
    }
    setLoading(true);
    try {
      const sb: any = supabase;
      const fetchScoped = (table: string) =>
        sb.from(table).select("*").eq(scopeFilter.col, scopeFilter.val);
      const empty = Promise.resolve({ data: [], error: null }) as any;

      const [
        patients,
        assessments,
        appointments,
        notes,
        voiceNotes,
        files,
        photos,
      ] = await Promise.all([
        selected.patients ? fetchScoped("patients") : empty,
        selected.assessments ? fetchScoped("assessments") : empty,
        selected.appointments ? fetchScoped("professional_appointments") : empty,
        selected.notes
          ? isClinic
            ? empty
            : sb.from("professional_notes").select("*")
          : empty,
        selected.voiceNotes ? fetchScoped("assessment_voice_notes") : empty,
        selected.files ? fetchScoped("patient_files") : empty,
        selected.photos ? fetchScoped("patient_photos") : empty,
      ]);

      const signFile = async (bucket: string, path: string) => {
        const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
        return data?.signedUrl ?? null;
      };
      const fileIndex = selected.files
        ? await Promise.all(
            (files.data ?? []).map(async (f: any) => ({
              id: f.id,
              patient_email: f.patient_email,
              patient_name: f.patient_name,
              file_name: f.file_name,
              mime_type: f.mime_type,
              file_size_bytes: f.file_size_bytes,
              description: f.description,
              created_at: f.created_at,
              signed_url_1h: await signFile("patient-files", f.file_path),
            })),
          )
        : [];
      const photoIndex = selected.photos
        ? await Promise.all(
            (photos.data ?? []).map(async (p: any) => ({
              id: p.id,
              patient_email: p.patient_email,
              patient_name: p.patient_name,
              file_name: p.file_name,
              mime_type: p.mime_type,
              category: p.category,
              description: p.description,
              created_at: p.created_at,
              signed_url_1h: await signFile("patient-photos", p.file_path),
            })),
          )
        : [];

      const zip = new JSZip();
      const stamp = new Date().toISOString().slice(0, 10);
      const slug = (entityName || (isClinic ? "clinica" : "profissional"))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const manifest = {
        export_date: new Date().toISOString(),
        export_type: mode,
        entity_name: entityName ?? null,
        entity_id: scopeFilter.val,
        included_sections: Object.entries(selected)
          .filter(([, v]) => v)
          .map(([k]) => k),
        counts: {
          patients: selected.patients ? patients.data?.length ?? 0 : null,
          assessments: selected.assessments ? assessments.data?.length ?? 0 : null,
          appointments: selected.appointments ? appointments.data?.length ?? 0 : null,
          notes: selected.notes ? notes.data?.length ?? 0 : null,
          voice_notes: selected.voiceNotes ? voiceNotes.data?.length ?? 0 : null,
          files: selected.files ? fileIndex.length : null,
          photos: selected.photos ? photoIndex.length : null,
        },
        notes:
          "Links assinados (signed_url_1h) expiram em 1 hora — baixe os arquivos binários antes desse prazo.",
      };

      // CSV helper — universal format readable by Excel, Numbers, Google Sheets, etc.
      const toCsv = (rows: any[]): string => {
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
        const header = cols.join(",");
        const body = rows.map((r) => cols.map((c) => escape(r?.[c])).join(",")).join("\n");
        // UTF-8 BOM so Excel detects encoding correctly with accented characters
        return "\ufeff" + header + "\n" + body;
      };

      const addSection = (name: string, rows: any[]) => {
        zip.file(`json/${name}.json`, JSON.stringify(rows ?? [], null, 2));
        zip.file(`csv/${name}.csv`, toCsv(rows ?? []));
      };

      if (selected.patients) addSection("patients", patients.data ?? []);
      if (selected.assessments) addSection("assessments", assessments.data ?? []);
      if (selected.appointments) addSection("appointments", appointments.data ?? []);
      if (selected.notes) addSection("professional_notes", notes.data ?? []);
      if (selected.voiceNotes) addSection("voice_notes", voiceNotes.data ?? []);
      if (selected.files) addSection("files_index", fileIndex);
      if (selected.photos) addSection("photos_index", photoIndex);

      zip.file(
        "README.txt",
        [
          "Aliv.iA — Backup e exportação de dados",
          "",
          "Este pacote contém seus dados em dois formatos universais:",
          "  • /csv  — abre direto no Excel, Numbers, Google Sheets, LibreOffice (UTF-8 com BOM).",
          "  • /json — formato técnico legível por qualquer linguagem/programa.",
          "",
          "manifest.json descreve o conteúdo. Links de arquivos binários (signed_url_1h)",
          "expiram em 1 hora — baixe-os antes do prazo.",
        ].join("\n"),
      );


      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alivia-export-${slug}-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const totalItems = Object.values(manifest.counts)
        .filter((v): v is number => typeof v === "number")
        .reduce((a, b) => a + b, 0);
      toast.success("Exportação concluída", {
        description: `${totalItems} registros em ${manifest.included_sections.length} categorias`,
      });
    } catch (err: any) {
      console.error("Export failed", err);
      toast.error("Falha ao exportar dados", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <Card className="border-primary/20">
      <CardContent className="py-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <FileArchive className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-foreground text-sm">
              Backup e exportação de dados
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gere um arquivo <strong>.zip</strong> com os dados {isClinic ? "da clínica" : "do seu perfil"}. Use para auditoria, conformidade LGPD/CFF ou backup secundário.
            </p>
          </div>
        </div>

        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs font-medium hover:bg-muted/60 transition">
            <span>
              Selecionar dados ({selectedCount}/{SECTION_LABELS.length})
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <div className="flex gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setAll(true)}
                className="text-primary hover:underline"
              >
                Selecionar tudo
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => setAll(false)}
                className="text-muted-foreground hover:underline"
              >
                Limpar
              </button>
            </div>
            <div className="space-y-2">
              {SECTION_LABELS.map(({ key, label, hint }) => (
                <label
                  key={key}
                  htmlFor={`exp-${key}`}
                  className="flex items-start gap-2.5 rounded-lg border border-border/60 px-3 py-2 cursor-pointer hover:bg-muted/30 transition"
                >
                  <Checkbox
                    id={`exp-${key}`}
                    checked={selected[key]}
                    onCheckedChange={() => toggle(key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground">{label}</div>
                    <div className="text-[11px] text-muted-foreground">{hint}</div>
                  </div>
                </label>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>
            Apenas dados aos quais você tem acesso são exportados. Links de arquivos binários expiram em 1 hora.
          </span>
        </div>

        <Button
          onClick={handleExport}
          disabled={loading || selectedCount === 0}
          className="w-full gap-2 rounded-xl"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparando exportação...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Exportar ({selectedCount}) categoria{selectedCount === 1 ? "" : "s"} (.zip)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExportDataCard;
