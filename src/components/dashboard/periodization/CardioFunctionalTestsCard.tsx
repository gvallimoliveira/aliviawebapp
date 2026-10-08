import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Link2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { usePatientBirthDate } from "@/hooks/usePatientBirthDate";
import { localISODate } from "@/lib/periodization";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import type { SrpeEntry } from "@/lib/periodizationData";
import { analyzeFunctionalTest, TEST_INFO, type FunctionalTestData, type FunctionalTestType } from "@/lib/cardioFunctionalTests";

interface Row { id: string; test_date: string; test_type: FunctionalTestType; data: FunctionalTestData; notes: string | null }

const ageFrom = (birth: string | null) => {
  if (!birth) return null;
  const b = new Date(birth + "T12:00:00"); const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
};
const toNum = (s: string) => { const v = parseFloat(s.replace(",", ".")); return Number.isFinite(v) ? v : null; };

const Borg = ({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (v: number) => void }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 11 }, (_, i) => (
        <button key={i} type="button" onClick={() => onChange(i)}
          className={`h-8 w-8 rounded-lg border text-xs font-medium transition ${value === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"}`}>
          {i}
        </button>
      ))}
    </div>
    <p className="text-[11px] text-muted-foreground">0 nada · 3 moderado · 5 forte · 7 muito forte · 10 máximo</p>
  </div>
);

const NumField = ({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (v: number | null) => void }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <Input inputMode="decimal" value={value ?? ""} onChange={(e) => onChange(toNum(e.target.value))} />
  </div>
);

const CardioFunctionalTestsCard = ({ patientId, entries = [] }: { patientId: string; entries?: SrpeEntry[] }) => {
  const birth = usePatientBirthDate(patientId);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [type, setType] = useState<FunctionalTestType>("tsl1");
  const [date, setDate] = useState(localISODate());
  const [d, setD] = useState<FunctionalTestData>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("cardio_functional_tests").select("id,test_date,test_type,data,notes").eq("patient_id", patientId).order("test_date", { ascending: false });
    setRows((data as unknown as Row[]) ?? []);
  }, [patientId]);
  useEffect(() => { void load(); }, [load]);

  const set = (patch: Partial<FunctionalTestData>) => setD((p) => ({ ...p, ...patch }));
  // Reaproveita o que já foi lido (print/manual) na sessão monitorada: sem redigitar.
  const monitored = useMemo(() => entries.filter((e) => e.monitor_source && (e.hr_max || e.spo2_min || e.hr_recovery_1min)).sort((a, b) => b.session_date.localeCompare(a.session_date)).slice(0, 10), [entries]);
  const importSession = (id: string) => {
    const e = monitored.find((x) => x.id === id); if (!e) return;
    setDate(e.session_date);
    set({ hrPeak: e.hr_max ?? d.hrPeak ?? null, spo2Min: e.spo2_min ?? d.spo2Min ?? null, hrRecovery1: e.hr_recovery_1min ?? d.hrRecovery1 ?? null });
    toast({ title: "Dados da sessão monitorada aplicados", description: "Confira e complete repouso, Borg e resultado." });
  };
  const report = useMemo(() => analyzeFunctionalTest(type, d), [type, d]);

  const startNew = () => {
    const last = rows[0]?.data;
    setEditId(null); setType("tsl1"); setDate(localISODate()); setNotes("");
    setD({ age: ageFrom(birth), sex: last?.sex ?? null, heightCm: last?.heightCm ?? null, weightKg: last?.weightKg ?? null, betaBlocker: last?.betaBlocker ?? false });
    setOpen(true);
  };
  const startEdit = (r: Row) => { setEditId(r.id); setType(r.test_type); setDate(r.test_date); setD(r.data); setNotes(r.notes ?? ""); setOpen(true); };

  const save = async () => {
    if (d.result == null) { toast({ title: "Informe o resultado do teste", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { patient_id: patientId, test_date: date, test_type: type, data: d as never, notes: notes || null, updated_at: new Date().toISOString() };
    const { error } = editId
      ? await supabase.from("cardio_functional_tests").update(payload).eq("id", editId)
      : await supabase.from("cardio_functional_tests").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: editId ? "Teste atualizado" : "Teste registrado" });
    setOpen(false); void load();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Excluir este teste funcional?")) return;
    const { error } = await supabase.from("cardio_functional_tests").delete().eq("id", id);
    if (error) { toast({ title: "Não foi possível excluir", variant: "destructive" }); return; }
    void load();
  };
  const copyLink = async (t: FunctionalTestType) => {
    const url = `${getPublicOrigin()}/teste-cardio/${t}`;
    try { await navigator.clipboard.writeText(url); toast({ title: "Link da ficha copiado", description: url }); }
    catch { window.prompt("Copie o link:", url); }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={startNew} className="gap-1"><Plus className="h-4 w-4" />Novo teste funcional</Button>
        {(Object.keys(TEST_INFO) as FunctionalTestType[]).map((t) => (
          <Button key={t} type="button" size="sm" variant="outline" className="gap-1" onClick={() => copyLink(t)}>
            <Link2 className="h-3.5 w-3.5" />Ficha {t === "tsl1" ? "TSL" : t === "tc6m" ? "TC6M" : "Degrau"}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">As fichas trazem instruções padronizadas e critérios de interrupção. Aplique o teste com supervisão e monitor de FC/oxímetro.</p>

      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum teste registrado.</p> : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const rep = analyzeFunctionalTest(r.test_type, r.data);
            return (
              <li key={r.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-foreground">{TEST_INFO[r.test_type].label}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.test_date.split("-").reverse().join("/")} · {r.data.result} {TEST_INFO[r.test_type].unit}
                    {rep.percentPredicted != null && ` · ${rep.percentPredicted}% do previsto`}
                  </p>
                  {rep.patterns.map((p) => <p key={p.key} className="text-xs text-foreground">{p.title}</p>)}
                  {rep.alerts.length > 0 && <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" />{rep.alerts.length} alerta(s)</p>}
                </div>
                <Button type="button" size="icon" variant="ghost" aria-label="Editar teste" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Excluir teste" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-12 text-left">
            <DialogTitle>{editId ? "Editar teste funcional" : "Novo teste funcional"}</DialogTitle>
            <DialogDescription>{TEST_INFO[type].setup}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TEST_INFO) as FunctionalTestType[]).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium ${type === t ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
                  {t === "tsl1" ? "TSL 1-min" : t === "tc6m" ? "TC6M" : "Degrau 6 min"}
                </button>
              ))}
            </div>

            {monitored.length > 0 && !editId && (
              <div className="space-y-1 rounded-lg border border-dashed border-border p-3">
                <Label className="text-xs">Já lançou o teste como sessão monitorada? Use os dados dela</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" defaultValue="" onChange={(e) => importSession(e.target.value)}>
                  <option value="" disabled>Escolher sessão…</option>
                  {monitored.map((e) => <option key={e.id} value={e.id}>{e.session_date.split("-").reverse().join("/")} · FC máx {e.hr_max ?? "—"} · SpO₂ {e.spo2_min ?? "—"}</option>)}
                </select>
                <p className="text-[11px] text-muted-foreground">Não é preciso lançar o teste também como sessão: ele não entra na carga semanal.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1"><Label className="text-xs">Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <NumField label="Idade" value={d.age} onChange={(v) => set({ age: v })} />
              <div className="space-y-1">
                <Label className="text-xs">Sexo</Label>
                <div className="flex gap-1">
                  {(["F", "M"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => set({ sex: s })} className={`h-10 flex-1 rounded-lg border text-sm ${d.sex === s ? "border-primary bg-primary/10" : "border-border"}`}>{s === "F" ? "Fem" : "Masc"}</button>
                  ))}
                </div>
              </div>
              <NumField label="Altura (cm)" value={d.heightCm} onChange={(v) => set({ heightCm: v })} />
              <NumField label="Peso (kg)" value={d.weightKg} onChange={(v) => set({ weightKg: v })} />
              <NumField label={`Resultado (${TEST_INFO[type].unit})`} value={d.result} onChange={(v) => set({ result: v })} />
              {type !== "tc6m" && <NumField label="Previsto (tabela)" value={d.predictedManual} onChange={(v) => set({ predictedManual: v })} />}
            </div>
            <p className="text-[11px] text-muted-foreground">Referência: {TEST_INFO[type].reference}</p>

            <div className="space-y-2 rounded-lg bg-muted/40 p-3">
              <p className="text-sm font-semibold">Repouso</p>
              <div className="grid grid-cols-2 gap-3">
                <NumField label="FC repouso (bpm)" value={d.hrRest} onChange={(v) => set({ hrRest: v })} />
                <NumField label="SpO₂ repouso (%)" value={d.spo2Rest} onChange={(v) => set({ spo2Rest: v })} />
              </div>
              <Borg label="Borg dispneia (falta de ar)" value={d.borgDyspneaRest} onChange={(v) => set({ borgDyspneaRest: v })} />
              <Borg label="Borg fadiga nas pernas" value={d.borgLegsRest} onChange={(v) => set({ borgLegsRest: v })} />
            </div>

            <div className="space-y-2 rounded-lg bg-muted/40 p-3">
              <p className="text-sm font-semibold">Pico / final do teste</p>
              <div className="grid grid-cols-2 gap-3">
                <NumField label="FC pico (bpm)" value={d.hrPeak} onChange={(v) => set({ hrPeak: v })} />
                <NumField label="SpO₂ mínima (%)" value={d.spo2Min} onChange={(v) => set({ spo2Min: v })} />
              </div>
              <Borg label="Borg dispneia (falta de ar)" value={d.borgDyspneaPeak} onChange={(v) => set({ borgDyspneaPeak: v })} />
              <Borg label="Borg fadiga nas pernas" value={d.borgLegsPeak} onChange={(v) => set({ borgLegsPeak: v })} />
            </div>

            <div className="space-y-2 rounded-lg bg-muted/40 p-3">
              <p className="text-sm font-semibold">Recuperação</p>
              <div className="grid grid-cols-2 items-end gap-3">
                <NumField label="FC após 1 min (bpm)" value={d.hrRecovery1} onChange={(v) => set({ hrRecovery1: v })} />
                <label className="flex items-center gap-2 text-xs"><Switch checked={!!d.recoveryActive} onCheckedChange={(c) => set({ recoveryActive: c })} />Recuperação ativa (andando)</label>
              </div>
              <label className="flex items-center gap-2 text-xs"><Switch checked={!!d.betaBlocker} onCheckedChange={(c) => set({ betaBlocker: c })} />Usa betabloqueador</label>
            </div>

            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <p className="font-semibold">Laudo automático</p>
              <ul className="space-y-0.5 text-xs text-foreground">
                {report.predicted != null && <li>Previsto: {report.predicted} {TEST_INFO[type].unit}{report.percentPredicted != null && ` · alcançado ${report.percentPredicted}%`}</li>}
                {report.hrMax != null && <li>FC máxima estimada (Gellish): {report.hrMax} bpm{report.pctHrMax != null && ` · pico em ${report.pctHrMax}%`}{report.pctHrReserve != null && ` · ${report.pctHrReserve}% da reserva`}</li>}
                {report.hrRise != null && <li>Subida da FC: {report.hrRise} bpm</li>}
                {report.hrRecoveryDrop != null && <li>Queda da FC em 1 min: {report.hrRecoveryDrop} bpm</li>}
              </ul>
              {report.alerts.map((a) => <p key={a} className="flex gap-1 text-xs text-destructive"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{a}</p>)}
              {report.patterns.map((p) => <div key={p.key} className="text-xs"><p className="font-medium">{p.title}</p><p className="text-muted-foreground">{p.conduct}</p></div>)}
              {report.notes.map((n) => <p key={n} className="text-[11px] text-muted-foreground">{n}</p>)}
            </div>

            <div className="space-y-1"><Label className="text-xs">Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <Button type="button" className="w-full" onClick={save} disabled={saving}>{editId ? "Salvar alterações" : "Salvar teste"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CardioFunctionalTestsCard;
