import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  Loader2,
  ShieldCheck,
  FileArchive,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildExportZip,
  type ExportMode,
  type ExportSelection,
} from "@/lib/exportZipBuilder";

interface Props {
  mode: ExportMode;
  clinicId?: string;
  professionalId?: string;
  entityName?: string;
}

type SectionKey = keyof ExportSelection;

const SECTION_LABELS: { key: SectionKey; label: string; hint: string; critical?: boolean }[] = [
  { key: "patients", label: "Pacientes", hint: "Cadastro (nome, contato, etc.)", critical: true },
  { key: "assessments", label: "Avaliações", hint: "Anamnese, hipótese, plano — uma por arquivo", critical: true },
  { key: "evolution", label: "Evolução", hint: "Session notes, diário de dor, follow-ups", critical: true },
  { key: "treatment", label: "Plano de tratamento", hint: "Programas de exercício + adesão" },
  { key: "appointments", label: "Agenda", hint: "Consultas e atendimentos" },
  { key: "voiceNotes", label: "Notas de voz", hint: "Transcrições e resumos de áudio" },
  { key: "questionnaires", label: "Questionários", hint: "Respostas validadas (Roland-Morris, ODI, etc.)" },
  { key: "notes", label: "Notas privadas (suas)", hint: "Suas anotações clínicas privadas" },
  { key: "chat", label: "Conversas", hint: "Chat com pacientes (texto)" },
  { key: "auditLogs", label: "Logs de auditoria", hint: "Overrides de hipótese (apenas clínica)" },
  { key: "documents", label: "Documentos (índice)", hint: "Lista de PDFs/arquivos enviados" },
  { key: "photos", label: "Fotos posturais (índice)", hint: "Lista de fotos" },
];

const ExportDataCard = ({ mode, clinicId, professionalId, entityName }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const isDemo = mode === "demo";
  const isClinic = mode === "clinic";

  const [selected, setSelected] = useState<Record<SectionKey, boolean>>({
    patients: true,
    assessments: true,
    evolution: true,
    treatment: true,
    appointments: true,
    voiceNotes: true,
    questionnaires: true,
    notes: true,
    chat: true,
    auditLogs: isClinic,
    documents: true,
    photos: true,
    binaries: false, // opt-in
  });

  const toggle = (key: SectionKey) => setSelected((s) => ({ ...s, [key]: !s[key] }));
  const setAll = (val: boolean) =>
    setSelected((s) => {
      const next = { ...s };
      for (const { key } of SECTION_LABELS) next[key] = val;
      // do not auto-toggle binaries — keep opt-in semantics
      return next;
    });

  const handleExport = async () => {
    if (!isDemo && !(isClinic ? clinicId : professionalId)) {
      toast.error("Identificador não encontrado");
      return;
    }
    if (!Object.entries(selected).some(([k, v]) => v && k !== "binaries")) {
      toast.error("Selecione ao menos um tipo de dado");
      return;
    }
    setLoading(true);
    setProgressMsg("Preparando...");
    try {
      const result = await buildExportZip({
        mode,
        clinicId,
        professionalId,
        userId: user?.id,
        entityName,
        selection: selected,
        onProgress: ({ stage, current, total }) => {
          setProgressMsg(
            current != null && total != null ? `${stage} (${current}/${total})` : stage,
          );
        },
      });

      // Trigger downloads sequentially with small delay (browsers throttle simultaneous)
      for (const part of result.parts) {
        const url = URL.createObjectURL(part.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = part.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        await new Promise((r) => setTimeout(r, 400));
      }

      const sizeMb = (result.totalBytes / 1024 / 1024).toFixed(1);
      const partInfo = result.parts.length > 1 ? ` em ${result.parts.length} partes` : "";
      toast.success(`Exportação concluída — ${sizeMb} MB${partInfo}`, {
        description: `${result.manifest.patient_count} paciente(s), ${result.manifest.counts.assessments} avaliação(ões)`,
      });
    } catch (err: any) {
      console.error("Export failed", err);
      toast.error("Falha ao exportar dados", { description: err?.message });
    } finally {
      setLoading(false);
      setProgressMsg("");
    }
  };

  const selectedCount = SECTION_LABELS.filter(({ key }) => selected[key]).length;

  return (
    <Card className="border-primary/50 bg-primary/[0.04]">
      <CardContent className="py-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <FileArchive className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm">
                Backup e exportação de dados
              </h3>
              {isDemo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  Modo demo — dados fictícios
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gera um <strong>.zip organizado por paciente</strong> com prontuário completo (avaliações, evolução, tratamento), além de <strong>dumps brutos</strong> de cada tabela para auditoria/LGPD.
            </p>
          </div>
        </div>

        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs font-medium hover:bg-muted/60 transition">
            <span>Selecionar dados ({selectedCount}/{SECTION_LABELS.length})</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <div className="flex gap-2 text-[11px]">
              <button type="button" onClick={() => setAll(true)} className="text-primary hover:underline">
                Selecionar tudo
              </button>
              <span className="text-muted-foreground">·</span>
              <button type="button" onClick={() => setAll(false)} className="text-muted-foreground hover:underline">
                Limpar
              </button>
            </div>
            <div className="space-y-2">
              {SECTION_LABELS.filter(
                ({ key }) => !(key === "auditLogs" && !isClinic),
              ).map(({ key, label, hint, critical }) => (
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
                    <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      {label}
                      {critical && (
                        <span className="rounded-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1 py-px text-[9px] uppercase tracking-wide">
                          essencial
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{hint}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.04] px-3 py-2.5">
              <label htmlFor="exp-binaries" className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox
                  id="exp-binaries"
                  checked={selected.binaries}
                  onCheckedChange={() => toggle("binaries")}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">
                    Incluir arquivos binários (fotos + documentos)
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Baixa os bytes reais. Pode resultar em um arquivo grande. Acima de ~200 MB o pacote é dividido em partes.
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 space-y-2">
              <div className="text-xs font-semibold text-foreground">
                Como ler os arquivos do pacote
              </div>
              <div className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                <div>
                  <span className="inline-flex items-center rounded-sm bg-blue-500/15 text-blue-700 dark:text-blue-300 px-1.5 py-px text-[10px] font-mono font-medium mr-1.5">
                    .json
                  </span>
                  Registros ricos e aninhados (avaliação completa, programa de exercícios, perfil, manifest). Mantém estrutura e tipos. Abra com <strong>VS Code</strong>, navegador, ou qualquer leitor de texto. Ideal para reimportação ou processamento.
                </div>
                <div>
                  <span className="inline-flex items-center rounded-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-px text-[10px] font-mono font-medium mr-1.5">
                    .csv
                  </span>
                  Listas tabulares — uma linha por registro (evoluções, diário de dor, agenda, índices). Abra direto no <strong>Excel</strong>, Google Sheets ou Numbers para filtrar, ordenar e analisar.
                </div>
                <div>
                  <span className="inline-flex items-center rounded-sm bg-muted text-foreground px-1.5 py-px text-[10px] font-mono font-medium mr-1.5">
                    pastas
                  </span>
                  <code className="text-[10px]">pacientes/</code> tem uma subpasta por paciente (nome + hash). <code className="text-[10px]">tabelas_brutas/</code> traz dumps planos em CSV <em>e</em> JSON para auditoria/LGPD. <code className="text-[10px]">manifest.json</code> lista contagens e checksums SHA-256.
                </div>
                <div className="pt-1 border-t border-border/40">
                  <strong className="text-foreground">Recomendação:</strong> armazene o .zip em local seguro e criptografado (drive corporativo, HD externo). Os dados são clínicos e sensíveis — trate conforme LGPD/HIPAA.
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>
            Apenas dados aos quais você tem acesso são exportados. Pastas de pacientes usam o nome completo cadastrado + hash curto para facilitar a localização.
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
              {progressMsg || "Preparando..."}
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Exportar {selected.binaries ? "(com binários)" : "(sem binários)"} (.zip)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExportDataCard;
