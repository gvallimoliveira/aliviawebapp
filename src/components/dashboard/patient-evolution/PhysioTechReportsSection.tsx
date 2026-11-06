import { useEffect, useState } from "react";
import { ExternalLink, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PhysioTechIcon } from "@/components/PhysioTechShortcut";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Report {
  id: string; exam_type: string; exam_title: string | null; exam_date: string | null;
  conclusion: string | null; metrics: any; images: any; pdf_url: string | null; file_id: string | null;
}
const LABEL: Record<string, string> = { termografia: "Termografia", ultrassom: "Ultrassom", ressonancia: "Ressonância" };

/** Exames complementares recebidos do PhysioTech (bloco clínico). Oculto quando não há laudos. */
const PhysioTechReportsSection = ({ patientId, readOnly }: { patientId?: string | null; readOnly?: boolean }) => {
  const [rows, setRows] = useState<Report[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [version, setVersion] = useState(0);
  const { toast } = useToast();
  useEffect(() => {
    setRows([]);
    if (!patientId) return;
    let alive = true;
    supabase.from("physiotech_reports").select("*").eq("patient_id", patientId)
      .order("exam_date", { ascending: false }).limit(20)
      .then(({ data }) => { if (alive) setRows((data as Report[]) || []); });
    return () => { alive = false; };
  }, [patientId, version]);
  useEffect(() => {
    const refresh = () => setVersion(v => v + 1);
    window.addEventListener("patient-files-changed", refresh);
    return () => window.removeEventListener("patient-files-changed", refresh);
  }, []);
  const handleFile = async (report: Report, action: "open" | "delete") => {
    const tab = action === "open" ? window.open("", "_blank") : null;
    setBusy(report.id);
    try {
      const { data, error } = await supabase.functions.invoke("physiotech-report-file", { body: { reportId: report.id, action } });
      if (error || !data?.ok) throw new Error(data?.error || "Arquivo indisponível");
      if (action === "open") {
        if (tab) { tab.opener = null; tab.location.href = data.url; }
        else window.location.assign(data.url);
      } else {
        setDeleteTarget(null);
        window.dispatchEvent(new Event("patient-files-changed"));
      }
    } catch {
      tab?.close();
      toast({ title: action === "open" ? "Não foi possível abrir o laudo" : "Não foi possível excluir o laudo", description: "O laudo antigo pode precisar ser reenviado pelo PhysioTech. Exclusão exige permissão no prontuário.", variant: "destructive" });
    } finally { setBusy(null); }
  };

  if (!rows.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PhysioTechIcon /> Exames complementares (PhysioTech)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => {
          const m = r.metrics || {};
          const imgs: string[] = Array.isArray(r.images) ? r.images : [];
          return (
            <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{LABEL[r.exam_type] || r.exam_type}</Badge>
                <span className="text-sm font-medium text-foreground">{r.exam_title}</span>
                {r.exam_date && <span className="text-xs text-muted-foreground">{new Date(r.exam_date).toLocaleDateString("pt-BR")}</span>}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {m.tqi != null && <Badge variant="outline">TQI {m.tqi}</Badge>}
                {m.temperatureGradient != null && <Badge variant="outline">ΔT {m.temperatureGradient} °C</Badge>}
                {m.classification && <Badge variant="outline">{m.classification}</Badge>}
              </div>
              {r.conclusion && <p className="text-sm text-muted-foreground whitespace-pre-line">{r.conclusion}</p>}
              {imgs.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {imgs.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer">
                      <img src={src} alt="Imagem do exame" className="h-20 w-20 rounded-md object-cover border border-border" />
                    </a>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                {(r.file_id || r.pdf_url) && <Button variant="link" size="sm" className="px-0 gap-1" disabled={busy === r.id} onClick={() => handleFile(r, "open")}>
                  {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />} Abrir laudo salvo
                </Button>}
                {!readOnly && <Button variant="ghost" size="icon" aria-label="Excluir laudo PhysioTech" title="Excluir laudo PhysioTech" disabled={busy === r.id} onClick={() => setDeleteTarget(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            </div>
          );
        })}
      </CardContent>
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir laudo?</AlertDialogTitle><AlertDialogDescription>O PDF e o bloco clínico deste laudo serão excluídos do Aliv.iA. O exame original no PhysioTech não será alterado.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={!!busy} onClick={() => { if (deleteTarget) handleFile(deleteTarget, "delete"); }}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
export default PhysioTechReportsSection;
