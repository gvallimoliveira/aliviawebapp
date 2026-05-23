import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ShieldCheck, FileArchive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";

interface Props {
  mode: "clinic" | "professional";
  clinicId?: string;
  professionalId?: string;
  entityName?: string;
}

/**
 * Exports all the data a clinic owner or autonomous professional owns into a
 * single .zip with JSON manifests + a file index. Heavy binary files (patient
 * uploads, photos) are listed as a manifest (with signed URLs valid for 1h),
 * not embedded — that keeps the export fast and small even for big clinics.
 *
 * LGPD / CFF compliance: this is the "right to portability" button.
 */
const ExportDataCard = ({ mode, clinicId, professionalId, entityName }: Props) => {
  const [loading, setLoading] = useState(false);
  const isClinic = mode === "clinic";
  const scopeFilter = isClinic
    ? { col: "clinic_id", val: clinicId }
    : { col: "professional_id", val: professionalId };

  const handleExport = async () => {
    if (!scopeFilter.val) {
      toast.error("Identificador não encontrado");
      return;
    }
    setLoading(true);
    try {
      // 1. Core tables (RLS already scopes these to the caller)
      const sb: any = supabase;
      const fetchScoped = (table: string) =>
        sb.from(table).select("*").eq(scopeFilter.col, scopeFilter.val);
      const [
        patients,
        assessments,
        appointments,
        notes,
        voiceNotes,
        files,
        photos,
      ] = await Promise.all([
        fetchScoped("patients"),
        fetchScoped("assessments"),
        fetchScoped("professional_appointments"),
        isClinic
          ? Promise.resolve({ data: [], error: null }) as any
          : sb.from("professional_notes").select("*"),
        fetchScoped("assessment_voice_notes"),
        fetchScoped("patient_files"),
        fetchScoped("patient_photos"),
      ]);

      // 2. Build signed URLs for stored files (1h validity)
      const signFile = async (bucket: string, path: string) => {
        const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
        return data?.signedUrl ?? null;
      };
      const fileIndex = await Promise.all(
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
      );
      const photoIndex = await Promise.all(
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
      );

      // 3. Build ZIP
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
        counts: {
          patients: patients.data?.length ?? 0,
          assessments: assessments.data?.length ?? 0,
          appointments: appointments.data?.length ?? 0,
          notes: notes.data?.length ?? 0,
          voice_notes: voiceNotes.data?.length ?? 0,
          files: fileIndex.length,
          photos: photoIndex.length,
        },
        notes:
          "Links assinados (signed_url_1h) em files/ e photos/ expiram em 1 hora — baixe os arquivos binários antes desse prazo. Reexporte para gerar novos links.",
      };

      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      zip.file("patients.json", JSON.stringify(patients.data ?? [], null, 2));
      zip.file("assessments.json", JSON.stringify(assessments.data ?? [], null, 2));
      zip.file("appointments.json", JSON.stringify(appointments.data ?? [], null, 2));
      zip.file("professional_notes.json", JSON.stringify(notes.data ?? [], null, 2));
      zip.file("voice_notes.json", JSON.stringify(voiceNotes.data ?? [], null, 2));
      zip.file("files_index.json", JSON.stringify(fileIndex, null, 2));
      zip.file("photos_index.json", JSON.stringify(photoIndex, null, 2));
      zip.file(
        "README.txt",
        [
          `Exportação Aliv.iA — ${stamp}`,
          ``,
          `Este arquivo .zip contém todos os dados ${isClinic ? "da sua clínica" : "do seu perfil profissional"}.`,
          ``,
          `Conteúdo:`,
          `- manifest.json: resumo da exportação`,
          `- patients.json: pacientes cadastrados`,
          `- assessments.json: avaliações (dados, hipótese diagnóstica, plano de tratamento)`,
          `- appointments.json: agenda e atendimentos`,
          `- professional_notes.json: anotações clínicas`,
          `- voice_notes.json: transcrições e resumos de áudio`,
          `- files_index.json: documentos de pacientes (com URLs temporárias de download — 1h)`,
          `- photos_index.json: fotos posturais (com URLs temporárias de download — 1h)`,
          ``,
          `Use este backup para auditoria, conformidade LGPD/CFF, ou migração.`,
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

      toast.success("Exportação concluída", {
        description: `${manifest.counts.patients} pacientes, ${manifest.counts.assessments} avaliações, ${manifest.counts.files + manifest.counts.photos} arquivos`,
      });
    } catch (err: any) {
      console.error("Export failed", err);
      toast.error("Falha ao exportar dados", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

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
              Gere um arquivo <strong>.zip</strong> com todos os dados {isClinic ? "da clínica" : "do seu perfil"}: pacientes, avaliações, hipóteses, planos de tratamento, anotações, agenda e índice de documentos/fotos com links de download. Use para auditoria, conformidade LGPD/CFF ou backup secundário.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>
            Apenas dados aos quais você tem acesso são exportados. Links de arquivos binários expiram em 1 hora.
          </span>
        </div>

        <Button
          onClick={handleExport}
          disabled={loading}
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
              Exportar todos os dados (.zip)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExportDataCard;
