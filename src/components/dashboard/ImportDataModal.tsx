import { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Upload, FileText, ArrowRight, ArrowLeft, Sparkles, CheckCircle2, AlertTriangle, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseFile, anonymizeSample, type ParsedFile } from "@/lib/importParsers";
import {
  ENTITY_LABELS, NATIVE_FIELDS, applyMapping, guessEntity, guessMapping, normalizeValue,
  type EntityKey, type ColumnMapping,
} from "@/lib/importMappings";

import { expandImportFile, defaultImportMappings } from "@/lib/importFiles";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "professional" | "clinic" | "demo";
  professionalId?: string;
  clinicId?: string;
}

interface FileState {
  file: File;
  parsed?: ParsedFile;
  entity: EntityKey;
  mappings: ColumnMapping[];
  ai?: { entity_confidence?: number; rationale?: string };
}

export default function ImportDataModal({ open, onOpenChange, mode, professionalId, clinicId }: Props) {
  const isDemo = mode === "demo";
  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<FileState[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dedup, setDedup] = useState<"create" | "merge" | "skip">("merge");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ batchIds?: string[]; created: number; updated: number; skipped: number; errors: number; errorsDetail?: any[] } | null>(null);

  const [responsibleId, setResponsibleId] = useState(professionalId ?? "");
  const [responsibles, setResponsibles] = useState<{ id: string; full_name: string }[]>([]);
  const active = files[activeIdx];
  useEffect(() => {
    if (!open || !clinicId || isDemo) return;
    let cancelled = false;
    (async () => {
      const { data: members, error } = await supabase.rpc("get_clinic_members_with_details", { _clinic_id: clinicId });
      if (error || !members) { toast.error("Não foi possível carregar os responsáveis."); return; }
      const eligible = members.filter(m => ["owner", "admin", "therapist", "osteopath", "pilates_instructor", "doctor", "rpg_specialist", "massage_therapist"].includes(m.role));
      if (!eligible.length) return;
      const { data } = await supabase.from("professionals").select("id,full_name,user_id").in("user_id", eligible.map(m => m.user_id));
      if (cancelled) return;
      setResponsibles((data ?? []).map(p => ({ id: p.id, full_name: p.full_name || "Profissional" })));
      const { data: auth } = await supabase.auth.getUser();
      const own = data?.find(p => p.user_id === auth.user?.id);
      if (own) setResponsibleId(own.id);
    })();
    return () => { cancelled = true; };
  }, [open, clinicId, isDemo]);

  function reset() {
    setStep(1); setFiles([]); setActiveIdx(0); setConsent(false); setReport(null); setDedup("merge");
  }

  async function handleFiles(list: FileList | null) {
    if (!list) return;
    const newFiles: FileState[] = [];
    for (const f of Array.from(list)) {
      if (files.length + newFiles.length >= 50) { toast.error("Máximo de 50 tabelas por importação."); break; }
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} excede 20MB.`); continue; }
      try {
        const parsed = await parseFile(f);
        const parts = expandImportFile(parsed);
        if (parts.some(p => p.parsed.rows.length > 5000)) throw new Error("Máximo de 5.000 linhas por tabela; divida o arquivo.");
        if (files.length + newFiles.length + parts.length > 50) throw new Error("Máximo de 50 tabelas por importação.");
        for (const part of parts) newFiles.push({ file: f, parsed: part.parsed, entity: part.entity, mappings: defaultImportMappings(part.parsed.headers, part.entity) });
        if (parsed.nativeEntities) toast.info("ZIP: somente pacientes, avaliações, evoluções, diário e agenda; anexos, tratamentos e demais categorias não são restaurados.");
      } catch (e) { toast.error(`${f.name}: ${e instanceof Error ? e.message : "Arquivo inválido"}`); }
    }
    setFiles(prev => [...prev, ...newFiles]);
  }

  async function runAIDetect() {
    if (!active?.parsed) return;
    setBusy(true);
    try {
      const sample = anonymizeSample(active.parsed.rows, 10);
      const { data, error } = await supabase.functions.invoke("import-detect-schema", {
        body: { filename: active.file.name, headers: active.parsed.headers, sample },
      });
      if (error || data?.error) throw error ?? new Error(data.error);
      const entity = (data?.entity in NATIVE_FIELDS ? data.entity : active.entity) as EntityKey;
      const aiMappings: ColumnMapping[] = (data?.mappings ?? []).map((m: any) => ({
        source: m.source, target: ["external", "ignore", ...NATIVE_FIELDS[entity].map(f => f.key)].includes(m.target) ? m.target : "external", confidence: m.confidence,
      }));
      const merged = active.parsed.headers.map((h) => {
        const ai = aiMappings.find((x) => x.source === h);
        return ai ?? { source: h, target: guessMapping(h, entity), confidence: 0.4 };
      });
      setFiles((prev) => prev.map((f, i) => i === activeIdx ? { ...f, entity, mappings: merged, ai: { entity_confidence: data?.entity_confidence, rationale: data?.rationale } } : f));
      toast.success("Mapeamento sugerido pela IA aplicado.");
    } catch (e: any) {
      toast.error("IA indisponível, usando heurística local. " + (e?.message ?? ""));
    } finally { setBusy(false); }
  }

  const preview = useMemo(() => {
    if (!active?.parsed) return [];
    return active.parsed.rows.slice(0, 10).map((r) => {
      const { native, external } = applyMapping(r, active.mappings);
      const norm: Record<string, any> = {};
      for (const [k, v] of Object.entries(native)) norm[k] = (() => { try { return normalizeValue(k, v); } catch { return "Valor inválido — revise o arquivo"; } })();
      return { native: norm, external };
    });
  }, [active]);

  async function commitAll() {
    if (isDemo) {
      const total = files.reduce((s, f) => s + (f.parsed?.rows.length ?? 0), 0);
      setReport({ created: total, updated: 0, skipped: 0, errors: 0 });
      setStep(6);
      toast.success("Simulação concluída (modo demo — nada foi gravado).");
      return;
    }
    if (!consent) { toast.error("Confirme o consentimento LGPD."); return; }
    if (clinicId && files.some(f => ["session_notes", "appointments"].includes(f.entity)) && !responsibleId) { toast.error("Selecione o profissional responsável."); return; }
    setBusy(true);
    const totals = { batchIds: [] as string[], created: 0, updated: 0, skipped: 0, errors: 0, errorsDetail: [] as any[] };
    try {
      // Prepare every table before the first write, and import patients before child records.
      const prepared = [...files].sort((a,b) => Number(b.entity === "patients") - Number(a.entity === "patients")).map(f => {
        const mapped = (f.parsed?.rows ?? []).map(raw => {
          const { native, external } = applyMapping(raw, f.mappings);
          const row: Record<string, any> = {};
          for (const [k,v] of Object.entries(native)) row[k] = normalizeValue(k,v);
          return { row, external };
        });
        return { f, mapped };
      });
      for (const { f, mapped } of prepared) {
        const { data, error } = await supabase.functions.invoke("import-commit", { body: {
          entity: f.entity, rows: mapped.map(m => m.row), externalRows: mapped.map(m => m.external), dedup,
          professionalId: clinicId ? responsibleId || undefined : professionalId, clinicId,
          sourceFilename: f.parsed?.filename ?? f.file.name, sourceFormat: f.parsed?.format,
        } });
        if (data?.batchId) totals.batchIds.push(data.batchId);
        if (error || data?.error) throw error ?? new Error(data.error);
        totals.created += data.created; totals.updated += data.updated; totals.skipped += data.skipped; totals.errors += data.errors;
        totals.errorsDetail.push(...(data.errorsDetail ?? []).map((e: any) => ({ ...e, arquivo: f.parsed?.filename })));
      }
      setReport(totals); setStep(6);
      if (totals.errors) toast.warning("Importação parcial: confira os erros antes de continuar.");
      else toast.success("Importação concluída.");
    } catch (e: any) {
      totals.errors++; totals.errorsDetail.push({ error: e?.message ?? "Falha na importação" });
      if (totals.batchIds.length) { setReport(totals); setStep(6); }
      toast.error("Falha na importação: " + (e?.message ?? "erro desconhecido"));
    } finally { setBusy(false); }
  }

  async function undoBatch() {
    if (!report?.batchIds?.length) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-undo", { body: { batchIds: report.batchIds } });
      if (error || data?.error) throw error ?? new Error(data.error);
      toast.success("Importação desfeita; dados anteriores preservados.");
      onOpenChange(false); reset();
    } catch (e: any) { toast.error("Não foi possível desfazer: " + (e?.message ?? "")); }
    finally { setBusy(false); }
  }

  function next() { setStep((s) => Math.min(6, s + 1) as Step); }
  function back() { setStep((s) => Math.max(1, s - 1) as Step); }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (busy) return; onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar dados externos — passo {step} de 6</DialogTitle>
          <DialogDescription>
            Transforma planilhas/arquivos de outros sistemas em registros nativos do Aliv.iA.
            {isDemo && " (modo demo: nada será gravado no banco)"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {step === 1 && (
            <div className="space-y-4">
              <label className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/30">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="font-medium">Selecionar arquivos</span>
                <span className="text-xs text-muted-foreground">CSV, JSON ou ZIP exportado do Aliv.iA · até 20MB por arquivo · 50 tabelas · 5.000 linhas por tabela</span>
                <Input type="file" multiple accept=".csv,.json,.zip,.tsv,.txt" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </label>
              {files.length > 0 && (
                <ul className="space-y-2">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center justify-between border rounded p-2 text-sm">
                      <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> {f.parsed?.filename ?? f.file.name}</span>
                      <span className="text-muted-foreground">
                        {f.parsed?.format} · {f.parsed?.rows.length ?? 0} linhas
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {(step === 3 || step === 4) && files.length > 1 && (
            <div className="flex gap-1 flex-wrap mb-3">
              {files.map((f,i) => <Button key={i} size="sm" variant={i === activeIdx ? "default" : "outline"} onClick={() => setActiveIdx(i)}>{f.parsed?.filename ?? f.file.name}</Button>)}
            </div>
          )}
          {step === 2 && active && (
            <div className="space-y-4">
              {files.length > 1 && (
                <div className="flex gap-1 flex-wrap">
                  {files.map((f, i) => (
                    <Button key={i} size="sm" variant={i === activeIdx ? "default" : "outline"} onClick={() => setActiveIdx(i)}>
                      {f.parsed?.filename ?? f.file.name}
                    </Button>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Label>Tipo de entidade detectada</Label>
                <Select value={active.entity} onValueChange={(v) => setFiles((prev) => prev.map((f, i) => i === activeIdx ? { ...f, entity: v as EntityKey, mappings: f.mappings.map((m) => ({ ...m, target: guessMapping(m.source, v as EntityKey) })) } : f))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENTITY_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {active.ai?.rationale && <p className="text-xs text-muted-foreground">IA: {active.ai.rationale}</p>}
              </div>
              <Button variant="outline" onClick={runAIDetect} disabled={busy || isDemo}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Pedir sugestão da IA
              </Button>
              {isDemo && <p className="text-xs text-muted-foreground">IA desabilitada no modo demo.</p>}
            </div>
          )}

          {step === 3 && active && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Confirme onde cada coluna do arquivo deve entrar. Colunas marcadas como <Badge variant="secondary">externo</Badge> ficam preservadas no campo "Dados importados de outro sistema" do prontuário.
              </p>
              <div className="border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs">
                    <tr><th className="text-left p-2">Coluna original</th><th className="text-left p-2">Campo Aliv.iA</th><th className="p-2">Confiança</th></tr>
                  </thead>
                  <tbody>
                    {active.mappings.map((m, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 font-mono text-xs">{m.source}</td>
                        <td className="p-2">
                          <Select value={m.target} onValueChange={(v) => setFiles((prev) => prev.map((f, i) => i === activeIdx ? { ...f, mappings: f.mappings.map((mm, ii) => ii === idx ? { ...mm, target: v } : mm) } : f))}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {NATIVE_FIELDS[active.entity].map((nf) => (
                                <SelectItem key={nf.key} value={nf.key}>{nf.label}{nf.required && " *"}</SelectItem>
                              ))}
                              <SelectItem value="external">→ Dados externos</SelectItem>
                              <SelectItem value="ignore">Ignorar</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 text-center text-xs">{m.confidence != null ? `${Math.round(m.confidence * 100)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 4 && active && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Pré-visualização (10 primeiras linhas). Confira antes de avançar.</p>
              <div className="space-y-3 max-h-[400px]">
                {preview.map((p, i) => (
                  <div key={i} className="border rounded p-3 text-xs space-y-1">
                    <div className="font-semibold">Linha {i + 1}</div>
                    {Object.entries(p.native).map(([k, v]) => (
                      <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>
                    ))}
                    {Object.keys(p.external).length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-muted-foreground">+ {Object.keys(p.external).length} campo(s) externos</summary>
                        <pre className="mt-1 bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(p.external, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              {clinicId && !isDemo && (
                <div className="space-y-2">
                  <Label>Profissional responsável (evoluções e agenda)</Label>
                  <Select value={responsibleId} onValueChange={setResponsibleId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar responsável" /></SelectTrigger>
                    <SelectContent>{responsibles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Estratégia de deduplicação</Label>
                <Select value={dedup} onValueChange={(v) => setDedup(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">Mesclar no paciente existente (recomendado)</SelectItem>
                    <SelectItem value="skip">Ignorar duplicados (manter o que já existe)</SelectItem>
                    <SelectItem value="create">Criar sempre novo registro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded border p-3 bg-muted/30 text-sm space-y-2">
                <div className="font-semibold">Resumo</div>
                {files.map((f, i) => (
                  <div key={i}>
                    {f.parsed?.filename ?? f.file.name} → <strong>{ENTITY_LABELS[f.entity]}</strong> · {f.parsed?.rows.length ?? 0} linhas
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <span>
                  Declaro que tenho consentimento dos pacientes para importar e tratar estes dados clínicos no Aliv.iA,
                  conforme LGPD. Os dados serão vinculados {clinicId ? "à minha clínica" : "ao meu cadastro profissional"}.
                </span>
              </label>
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-0.5" />
                Você pode desfazer esta importação em até 24h pelo botão na próxima tela.
              </p>
            </div>
          )}

          {step === 6 && report && (
            <div className="space-y-4 text-center py-6">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h3 className="text-xl font-bold">{report.errors ? "Importação parcial — revise os erros" : "Importação concluída"}</h3>
              <div className="grid grid-cols-4 gap-2 max-w-md mx-auto text-sm">
                <div className="border rounded p-2"><div className="text-2xl font-bold">{report.created}</div><div>Criados</div></div>
                <div className="border rounded p-2"><div className="text-2xl font-bold">{report.updated}</div><div>Atualizados</div></div>
                <div className="border rounded p-2"><div className="text-2xl font-bold">{report.skipped}</div><div>Ignorados</div></div>
                <div className="border rounded p-2"><div className="text-2xl font-bold text-destructive">{report.errors}</div><div>Erros</div></div>
              </div>
              {!!report.errorsDetail?.length && (
                <details className="text-left text-xs">
                  <summary className="cursor-pointer">Ver erros</summary>
                  <pre className="bg-muted p-2 rounded overflow-x-auto mt-2">{JSON.stringify(report.errorsDetail, null, 2)}</pre>
                </details>
              )}
              {!!report.batchIds?.length && !isDemo && (
                <Button variant="destructive" onClick={undoBatch} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Undo2 className="w-4 h-4 mr-2" />}
                  Desfazer esta importação
                </Button>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between pt-3 border-t">
          <Button variant="ghost" onClick={back} disabled={busy || step === 1 || step === 6}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          {step < 5 && (
            <Button onClick={next} disabled={busy || files.length === 0 || (step >= 2 && !active?.parsed)}>
              Avançar <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          {step === 5 && (
            <Button onClick={commitAll} disabled={busy || (!consent && !isDemo) || (!!clinicId && !isDemo && files.some(f => ["session_notes", "appointments"].includes(f.entity)) && !responsibleId)}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isDemo ? "Simular" : "Importar"}
            </Button>
          )}
          {step === 6 && (
            <Button onClick={() => { onOpenChange(false); reset(); }}>Fechar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
