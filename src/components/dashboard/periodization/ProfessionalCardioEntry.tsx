import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertTriangle, ImageUp, Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { saveProfessionalSession, type PeriodizationPlan, type SrpeEntry } from "@/lib/periodizationData";
import { CARDIO_PRINT_ERR } from "@/components/periodization/CardioPrintReader";
import { TRACK_LABEL } from "./scales";
import { SPO2_ALERT, ageFromBirth, hrCeiling } from "@/lib/cardioSafety";
import { localISODate } from "@/lib/periodization";
import { monitorFlags, sanitizeZones, srpeLoad, trimp } from "@/lib/cardioLoad";

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
  const [birth, setBirth] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [track, setTrack] = useState("cardio");
  const [duration, setDuration] = useState("");
  const [rpe, setRpe] = useState("");
  const [hrAvg, setHrAvg] = useState("");
  const [hrMax, setHrMax] = useState("");
  const [spo2, setSpo2] = useState("");
  const [zones, setZones] = useState(["", "", "", "", ""]);
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<"manual" | "print">("manual");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (supabase as any).from("patients").select("birth_date").eq("id", patientId).maybeSingle()
      .then(({ data }: any) => setBirth(data?.birth_date ?? null));
  }, [patientId]);

  const ceil = hrCeiling({ profile: plan?.cardio_profile, age: ageFromBirth(birth), override: plan?.hr_ceiling_override ?? null });
  const z = sanitizeZones(zones.map((x) => num(x)));
  const d = num(duration) ?? 0;
  const r = num(rpe);
  const sload = r != null ? srpeLoad(d, r) : null;
  const t = trimp({ zones: z, durationMin: d, hrAvg: num(hrAvg), hrMax: ceil.maxHr });
  const flags = monitorFlags({ hrMax: num(hrMax), spo2Min: num(spo2) }, ceil.ceiling, SPO2_ALERT);
  const existing = entries.find((e) => e.session_date === date && e.track === track);

  const monitored = useMemo(
    () => entries.filter((e) => e.monitor_source).slice(-6).reverse(),
    [entries],
  );

  const reset = () => {
    setDuration(""); setRpe(""); setHrAvg(""); setHrMax(""); setSpo2(""); setZones(["", "", "", "", ""]);
    setNotes(""); setSource("manual");
  };

  const readPrint = async (file: File) => {
    if (file.size > 5_000_000) { toast({ title: "Imagem muito grande (máx. 5 MB)", variant: "destructive" }); return; }
    setReading(true);
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
      if (x.duration_min != null) setDuration(s(Math.round(x.duration_min)));
      if (x.avg_hr != null) setHrAvg(s(Math.round(x.avg_hr)));
      if (x.max_hr != null) setHrMax(s(Math.round(x.max_hr)));
      if (x.spo2 != null) setSpo2(s(Math.round(x.spo2)));
      if (Array.isArray(x.zone_minutes)) setZones(x.zone_minutes.map((m: number) => (m ? String(m) : "")));
      if (x.suggested_rpe != null && !rpe) setRpe(s(x.suggested_rpe));
      if (x.summary && !notes) setNotes(x.summary);
      setSource("print");
      toast({ title: "Print lido", description: "Confira os números antes de salvar." });
    } catch (e: any) {
      toast({ title: "Não consegui ler o print", description: CARDIO_PRINT_ERR[e?.message] ?? "Preencha os campos manualmente.", variant: "destructive" });
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    if (!(d > 0 && d <= 600)) { toast({ title: "Informe a duração", variant: "destructive" }); return; }
    if (r == null || r < 0 || r > 10) { toast({ title: "Informe a PSE (0–10)", variant: "destructive" }); return; }
    setSaving(true);
    const ri = (v: string) => { const n = num(v); return n == null ? null : Math.round(n); };
    let merged = false;
    let error: unknown = null;
    try {
      ({ merged } = await saveProfessionalSession({
        patientId, planId: plan?.id ?? null, sessionDate: date, track, durationMin: d, rpe: r, notes,
        monitor: { hr_avg: ri(hrAvg), hr_max: ri(hrMax), spo2_min: ri(spo2), zone_minutes: z, trimp: t.value, monitor_source: source },
      }));
    } catch (e) { error = e; }
    setSaving(false);
    if (error) { toast({ title: "Não foi possível salvar", variant: "destructive" }); return; }
    toast({ title: merged ? "Sessão unida ao check-in do paciente" : "Sessão monitorada salva" });
    reset(); setOpen(false); onChanged();
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 shrink-0 text-primary" /> Sessões monitoradas
        </div>
        <Button type="button" size="sm" variant={open ? "ghost" : "outline"} onClick={() => setOpen((o) => !o)}>
          {open ? <><X className="h-4 w-4 mr-1" />Fechar</> : <><Plus className="h-4 w-4 mr-1" />Lançar sessão monitorada</>}
        </Button>
      </div>

      {open && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Dados do monitor cardíaco (cinta, relógio ou oxímetro). Envie um print do app ou digite os números.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => e.target.files?.[0] && readPrint(e.target.files[0])} />
            <Button type="button" size="sm" variant="secondary" disabled={reading} onClick={() => fileRef.current?.click()}>
              {reading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImageUp className="h-4 w-4 mr-1" />}
              Ler print do monitor
            </Button>
            <span className="text-[11px] text-muted-foreground">usa créditos de IA só nesta leitura</span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-3 [&>label]:block [&>label]:min-w-0 [&_input]:min-w-0 [&_input]:max-w-full">
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
            <label className="text-xs space-y-1 col-span-2">SpO₂ mínima (%) — opcional<Input inputMode="numeric" value={spo2} onChange={(e) => setSpo2(e.target.value)} /></label>
          </div>

          <div className="min-w-0 space-y-1">
            <div className="text-xs">Minutos por zona de FC (opcional)</div>
            <div className="grid grid-cols-5 gap-1.5 [&_input]:min-w-0 [&_input]:px-2">
              {zones.map((v, i) => (
                <Input key={i} aria-label={`Zona ${i + 1}`} placeholder={`Z${i + 1}`} inputMode="numeric" value={v}
                  onChange={(e) => setZones((zs) => zs.map((x, j) => (j === i ? e.target.value : x)))} />
              ))}
            </div>
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
                {t.method === "zones" ? "pelas zonas" : t.method === "avg_hr" ? "estimada pela FC média" : ceil.maxHr ? "informe zonas ou FC média" : "precisa de zonas (sem idade cadastrada)"}
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
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar sessão
          </Button>
        </div>
      )}

      {monitored.length > 0 && (
        <ul className="space-y-1 text-xs">
          {monitored.map((e) => (
            <li key={e.id} className="flex flex-wrap justify-between gap-x-3 rounded-md bg-background px-2 py-1">
              <span>{e.session_date.split("-").reverse().join("/")} · {TRACKS.find((x) => x.v === e.track)?.l ?? e.track}</span>
              <span className="text-muted-foreground">
                sRPE {e.training_load ?? Math.round(e.duration_min * e.rpe)} · TRIMP {e.trimp ?? "—"}
                {e.hr_avg ? ` · FC ${e.hr_avg}/${e.hr_max ?? "—"}` : ""}
                {e.patient_rpe != null ? ` · PSE paciente ${e.patient_rpe}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProfessionalCardioEntry;
