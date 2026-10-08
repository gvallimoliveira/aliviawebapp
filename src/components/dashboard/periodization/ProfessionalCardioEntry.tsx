import { useMemo, useRef, useState } from "react";
import { usePatientBirthDate } from "@/hooks/usePatientBirthDate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertTriangle, ImageUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { deleteSrpe, saveProfessionalSession, type PeriodizationPlan, type SrpeEntry } from "@/lib/periodizationData";
import { CARDIO_PRINT_ERR } from "@/components/periodization/CardioPrintReader";
import { TRACK_LABEL } from "./scales";
import { SPO2_ALERT, ageFromBirth, hrCeiling } from "@/lib/cardioSafety";
import { localISODate } from "@/lib/periodization";
import { formatZoneMinutes, monitorFlags, parseZoneMinutes, sanitizeZones, srpeLoad, trimp } from "@/lib/cardioLoad";
import { TEXT_WINDOW_DAYS, groupByDay, inWindow, recentDaysWindow } from "@/lib/loadWindows";
import DayGroupList, { type DayGroup } from "./DayGroupList";
import LoadHistoryDialog from "./LoadHistoryDialog";

// Entrada do profissional: sessão medida com monitor cardíaco (cinta, relógio
// ou oxímetro). Se já houver check-in do paciente da mesma data e frente, junta
// na mesma sessão: monitor + PSE do profissional valem; a PSE do paciente fica
// guardada como percepção dele. Uma sessão só, sem dupla contagem no ACWR.

const TRACKS = Object.entries(TRACK_LABEL).map(([v, l]) => ({ v, l }));

interface Props {
  patientId: string;
  plan: PeriodizationPlan | null;
  entries: SrpeEntry[];
  onChanged: () => void;
}

const today = () => localISODate();
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

const ProfessionalCardioEntry = ({ patientId, plan, entries, onChanged }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const birth = usePatientBirthDate(patientId, open);
  const [date, setDate] = useState(today());
  const [track, setTrack] = useState("cardio");
  const [duration, setDuration] = useState("");
  const [rpe, setRpe] = useState("");
  const [hrAvg, setHrAvg] = useState("");
  const [hrMax, setHrMax] = useState("");
  const [spo2, setSpo2] = useState("");
  const [hrRec, setHrRec] = useState("");
  const [distance, setDistance] = useState("");
  const [power, setPower] = useState("");
  const [zones, setZones] = useState(["", "", "", "", ""]);
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<"manual" | "print">("manual");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [readCount, setReadCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const ceil = hrCeiling({ profile: plan?.cardio_profile, age: ageFromBirth(birth), override: plan?.hr_ceiling_override ?? null });
  const z = sanitizeZones(zones.map((x) => parseZoneMinutes(x)));
  const d = num(duration) ?? 0;
  const r = num(rpe);
  const sload = r != null ? srpeLoad(d, r) : null;
  const t = trimp({ zones: z, durationMin: d, hrAvg: num(hrAvg), hrMax: ceil.maxHr });
  const flags = monitorFlags({ hrMax: num(hrMax), spo2Min: num(spo2) }, ceil.ceiling, SPO2_ALERT);
  const existing = editingId ? undefined : entries.find((e) => e.session_date === date && e.track === track);
  const recDrop = num(hrMax) && num(hrRec) && num(hrRec)! < num(hrMax)! ? Math.round(num(hrMax)! - num(hrRec)!) : null;
  const dist = num(distance);
  const pace = dist && dist > 0 && d > 0 ? d / dist : null;

  const monitored = useMemo(() => {
    const list = entries.filter((e) => e.monitor_source);
    const w = recentDaysWindow(list.map((e) => e.session_date), TEXT_WINDOW_DAYS, today());
    const groups: DayGroup[] = groupByDay(list.filter((e) => inWindow(e.session_date, w)), (e) => e.session_date).map((g) => ({
      date: g.date,
      summary: `${g.items.length} ${g.items.length === 1 ? "sessão" : "sessões"} · sRPE ${g.items.reduce((a, e) => a + (e.training_load ?? Math.round(e.duration_min * e.rpe)), 0)}`,
      rows: g.items.map((e) => ({
        key: e.id,
        left: TRACKS.find((x) => x.v === e.track)?.l ?? e.track,
        right: (
          <span className="inline-flex items-center gap-1">
            {`sRPE ${e.training_load ?? Math.round(e.duration_min * e.rpe)} · TRIMP ${e.trimp ?? "—"}${e.hr_avg ? ` · FC ${e.hr_avg}/${e.hr_max ?? "—"}` : ""}${e.patient_rpe != null ? ` · PSE paciente ${e.patient_rpe}` : ""}`}
            <button type="button" aria-label="Editar sessão" className="rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => startEdit(e)}><Pencil className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Excluir sessão" className="rounded p-1 text-muted-foreground hover:text-destructive" onClick={() => remove(e)}><Trash2 className="h-3.5 w-3.5" /></button>
          </span>
        ),
      })),
    }));
    return { groups, fallback: w.fallback };
  }, [entries]);

  const reset = () => {
    setDuration(""); setRpe(""); setHrAvg(""); setHrMax(""); setSpo2(""); setZones(["", "", "", "", ""]);
    setHrRec(""); setDistance(""); setPower("");
    setNotes(""); setSource("manual"); setEditingId(null); setReadCount(0);
  };

  const startEdit = (e: SrpeEntry) => {
    const s = (v: number | null | undefined) => (v == null ? "" : String(v));
    setEditingId(e.id); setDate(e.session_date); setTrack(e.track);
    setDuration(s(e.duration_min)); setRpe(s(e.rpe)); setHrAvg(s(e.hr_avg)); setHrMax(s(e.hr_max));
    setSpo2(s(e.spo2_min)); setHrRec(s(e.hr_recovery_1min)); setDistance(s(e.distance_km).replace(".", ","));
    setPower(s(e.avg_power_w)); setNotes(e.notes ?? "");
    const zs = Array.isArray(e.zone_minutes) ? e.zone_minutes : [];
    setZones([0, 1, 2, 3, 4].map((i) => formatZoneMinutes(zs[i])));
    setSource((e.monitor_source as "manual" | "print") ?? "manual"); setReadCount(0);
    setOpen(true);
  };

  const remove = async (e: SrpeEntry) => {
    const msg = e.patient_rpe != null || e.source === "patient"
      ? "Excluir esta sessão? A resposta do paciente nessa data e frente também sai dos gráficos e relatórios."
      : "Excluir esta sessão? Os dados saem dos gráficos, da carga e dos relatórios.";
    if (!window.confirm(msg)) return;
    try {
      await deleteSrpe(e.id);
      if (editingId === e.id) { reset(); setOpen(false); }
      toast({ title: "Sessão excluída" });
      onChanged();
    } catch { toast({ title: "Não foi possível excluir", variant: "destructive" }); }
  };

  // Vários prints: cada um completa o que faltou (o primeiro valor lido de cada campo vale).
  const readPrints = async (files: File[]) => {
    setReading(true);
    let ok = 0;
    const filled: Record<string, boolean> = {};
    const put = (k: string, v: string, set: (x: string) => void) => { if (!filled[k]) { filled[k] = true; set(v); } };
    for (const file of files.slice(0, 6)) {
      if (file.size > 5_000_000) { toast({ title: `${file.name}: imagem muito grande (máx. 5 MB)`, variant: "destructive" }); continue; }
      try {
      const b64 = await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result).split(",")[1] ?? "");
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("periodization-checkin", {
        body: { action: "pro_parse_cardio_print", patient_id: patientId, image_base64: b64, mime_type: file.type },
      });
      if (error || !data?.reading) throw new Error(data?.error || (error as any)?.context?.error || "falha");
      const x = data.reading;
      const s = (v: number | null) => (v == null ? "" : String(v));
      if (x.duration_min != null) put("d", s(Math.round(x.duration_min)), setDuration);
      if (x.avg_hr != null) put("ha", s(Math.round(x.avg_hr)), setHrAvg);
      if (x.max_hr != null) put("hm", s(Math.round(x.max_hr)), setHrMax);
      if (x.spo2 != null) put("sp", s(Math.round(x.spo2)), setSpo2);
      if (x.hr_1min_after != null) put("hr", s(Math.round(x.hr_1min_after)), setHrRec);
      if (x.distance_km != null) put("di", s(x.distance_km).replace(".", ","), setDistance);
      if (x.avg_power_w != null) put("pw", s(Math.round(x.avg_power_w)), setPower);
      if (Array.isArray(x.zone_minutes) && x.zone_minutes.some((m: number) => m > 0) && !filled.z) {
        filled.z = true; setZones([0, 1, 2, 3, 4].map((i) => formatZoneMinutes(x.zone_minutes[i])));
      }
      if (x.suggested_rpe != null && !rpe && !filled.r) { filled.r = true; setRpe(s(x.suggested_rpe)); }
      if (x.summary && !notes) setNotes((n) => (n ? `${n} ${x.summary}` : x.summary));
      setSource("print"); ok++;
      } catch (e: any) {
        toast({ title: `Não consegui ler ${file.name}`, description: CARDIO_PRINT_ERR[e?.message] ?? "Preencha os campos manualmente.", variant: "destructive" });
      }
    }
    setReading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (ok) { setReadCount((c) => c + ok); toast({ title: ok === 1 ? "Print lido" : `${ok} prints lidos`, description: "Confira os números antes de salvar." }); }
  };

  const save = async () => {
    if (!(d > 0 && d <= 600)) { toast({ title: "Informe a duração", variant: "destructive" }); return; }
    if (r == null || r < 0 || r > 10) { toast({ title: "Informe a PSE (0–10)", variant: "destructive" }); return; }
    const rec = num(hrRec);
    if (rec != null && (rec < 30 || rec > 240 || (num(hrMax) != null && rec >= num(hrMax)!))) { toast({ title: "FC 1 min após deve ser menor que a FC máxima", variant: "destructive" }); return; }
    if (dist != null && !(dist > 0 && dist <= 500)) { toast({ title: "Distância inválida", variant: "destructive" }); return; }
    const pw = num(power);
    if (pw != null && !(pw >= 1 && pw <= 2500)) { toast({ title: "Potência inválida", variant: "destructive" }); return; }
    setSaving(true);
    const ri = (v: string) => { const n = num(v); return n == null ? null : Math.round(n); };
    let merged = false;
    let error: unknown = null;
    try {
      ({ merged } = await saveProfessionalSession({
        entryId: editingId, patientId, planId: plan?.id ?? null, sessionDate: date, track, durationMin: d, rpe: r, notes,
        monitor: { hr_avg: ri(hrAvg), hr_max: ri(hrMax), spo2_min: ri(spo2), zone_minutes: z, trimp: t.value, monitor_source: source,
          hr_recovery_1min: ri(hrRec), distance_km: dist != null ? Math.round(dist * 100) / 100 : null, avg_power_w: ri(power) },
      }));
    } catch (e) { error = e; }
    setSaving(false);
    if (error) { toast({ title: "Não foi possível salvar", variant: "destructive" }); return; }
    toast({ title: editingId ? "Sessão atualizada" : merged ? "Sessão unida ao check-in do paciente" : "Sessão monitorada salva" });
    reset(); setOpen(false); onChanged();
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 shrink-0 text-primary" /> Sessões monitoradas
        </div>
        <Button type="button" size="sm" variant={open ? "ghost" : "outline"} onClick={() => { if (open) reset(); setOpen((o) => !o); }}>
          {open ? <><X className="h-4 w-4 mr-1" />Fechar</> : <><Plus className="h-4 w-4 mr-1" />Lançar sessão monitorada</>}
        </Button>
      </div>

      {open && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {editingId ? "Editando sessão já registrada. Você pode ler novos prints ou corrigir os números." : "Dados do monitor cardíaco (cinta, relógio ou oxímetro). Envie um ou mais prints do app ou digite os números."}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => e.target.files?.length && readPrints(Array.from(e.target.files))} />
            <Button type="button" size="sm" variant="secondary" disabled={reading} onClick={() => fileRef.current?.click()}>
              {reading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImageUp className="h-4 w-4 mr-1" />}
              {readCount ? "Adicionar outro print" : "Ler prints do monitor"}
            </Button>
            <span className="text-[11px] text-muted-foreground">até 6 por vez{readCount ? ` · ${readCount} lido(s)` : ""} · usa créditos de IA só nesta leitura</span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-3 [&>label]:flex [&>label]:flex-col [&>label]:gap-1 [&>label]:min-w-0 [&_input]:min-w-0 [&_input]:max-w-full">
            <label className="col-span-2 block min-w-0 space-y-1 text-xs sm:col-span-1">Data<Input className="block w-full min-w-0 appearance-none" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="col-span-2 block min-w-0 space-y-1 text-xs sm:col-span-1">Frente
              <Select value={track} onValueChange={setTrack}>
                <SelectTrigger className="w-full min-w-0 [&>span]:truncate"><SelectValue /></SelectTrigger>
                <SelectContent>{TRACKS.map((x) => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label className="text-xs space-y-1">Duração (min)<Input inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
            <label className="text-xs space-y-1">PSE do paciente (0–10)<Input inputMode="decimal" value={rpe} onChange={(e) => setRpe(e.target.value)} /></label>
            <label className="text-xs space-y-1">FC média (bpm)<Input inputMode="numeric" value={hrAvg} onChange={(e) => setHrAvg(e.target.value)} /></label>
            <label className="text-xs space-y-1">FC máxima (bpm)<Input inputMode="numeric" value={hrMax} onChange={(e) => setHrMax(e.target.value)} /></label>
            <label className="text-xs space-y-1">FC 1 min após o esforço (bpm)<Input inputMode="numeric" value={hrRec} onChange={(e) => setHrRec(e.target.value)} placeholder="opcional" /></label>
            <label className="text-xs space-y-1">SpO₂ mínima (%)<Input inputMode="numeric" value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="opcional" /></label>
            <label className="text-xs space-y-1">Distância (km)<Input inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="opcional" /></label>
            <label className="text-xs space-y-1">Potência média (W)<Input inputMode="numeric" value={power} onChange={(e) => setPower(e.target.value)} placeholder="bicicleta, opcional" /></label>
          </div>
          {(recDrop !== null || pace !== null) && (
            <p className="text-[11px] text-muted-foreground">
              {recDrop !== null && <>Recuperação no 1º minuto: <strong className={recDrop <= 12 ? "text-destructive" : "text-foreground"}>{recDrop} bpm</strong>{recDrop <= 12 ? " (atenção: ≤12)" : ""}. </>}
              {pace !== null && <>Ritmo: <strong className="text-foreground">{Math.floor(pace)}:{String(Math.round((pace % 1) * 60)).padStart(2, "0")} min/km</strong>.</>}
            </p>
          )}

          <div className="min-w-0 space-y-1">
            <div className="text-xs">Tempo por zona de FC (opcional)</div>
            <div className="grid grid-cols-5 gap-1.5 [&_input]:min-w-0 [&_input]:px-2">
              {zones.map((v, i) => (
                <Input key={i} aria-label={`Zona ${i + 1}`} placeholder={`Z${i + 1}`} inputMode="numeric" value={v}
                  onChange={(e) => setZones((zs) => zs.map((x, j) => (j === i ? e.target.value : x)))} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Aceita minutos (12 ou 12,5) ou minutos e segundos (12:30).</p>
          </div>

          <Input placeholder="Observação (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-background p-2">
              <div className="text-[11px] text-muted-foreground">Carga por PSE (sRPE)</div>
              <div className="text-lg font-semibold">{sload ?? "—"}</div>
            </div>
            <div className="rounded-lg bg-background p-2">
              <div className="text-[11px] text-muted-foreground">Carga por FC (TRIMP)</div>
              <div className="text-lg font-semibold">{t.value ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground">
                {t.method === "zones" ? "pelas zonas" : "só com minutos por zona"}
              </div>
            </div>
          </div>

          {flags.length > 0 && (
            <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              <div>
                {flags.includes("hr_above_ceiling") && <div>FC máxima acima do teto do perfil ({ceil.ceiling} bpm).</div>}
                {flags.includes("spo2_low") && <div>SpO₂ abaixo de {SPO2_ALERT}%.</div>}
              </div>
            </div>
          )}

          {existing && (
            <p className="text-xs text-muted-foreground">
              Já existe registro nesta data e frente{existing.source === "patient" ? ` (PSE do paciente: ${existing.rpe})` : ""}. Ao salvar, os dois viram uma sessão só.
            </p>
          )}

          <Button type="button" className="w-full" disabled={saving} onClick={save}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{editingId ? "Salvar alterações" : "Salvar sessão"}
          </Button>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {monitored.groups.length === 0
              ? "Nenhuma sessão monitorada ainda."
              : monitored.fallback
                ? "Sem registros nos últimos 3 dias — exibindo os mais recentes."
                : "Últimos 3 dias"}
          </p>
          <LoadHistoryDialog patientId={patientId} />
        </div>
        <DayGroupList groups={monitored.groups} />
      </div>
    </div>
  );
};

export default ProfessionalCardioEntry;
