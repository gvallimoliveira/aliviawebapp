import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ImagePlus, Trash2, Sparkles, Plus } from "lucide-react";
import { summarizeHep, loadLevelFromTargetRpe, type HepLoadItem } from "@/lib/hepLoad";

const REGIONS: Record<string, string> = {
  core: "Tronco/Core", spine: "Coluna", shoulder: "Ombro", hip: "Quadril", knee: "Joelho", ankle: "Tornozelo",
  foot: "Pé", cervical: "Cervical", elbow: "Cotovelo", wrist: "Punho", general: "Geral",
};
const CATS: Record<string, string> = {
  strengthening: "Força", stabilization: "Estabilização", proprioception: "Propriocepção", mobility: "Mobilidade", stretching: "Alongamento",
};
const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const INT_LABEL = { light: "Leve", moderate: "Moderada", high: "Alta" } as const;

interface Row { name: string; sets: string; reps: string; region: string; category: string; load_kg: number | null }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Próximas datas (7 dias a partir de hoje) que caem nos dias marcados (0=Seg). */
function datesFor(days: number[]): string[] {
  const t = new Date();
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i);
    if (days.includes((d.getDay() + 6) % 7)) out.push(iso(d));
  }
  return out.sort();
}

const toBase64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] || "");
  r.onerror = rej;
  r.readAsDataURL(f);
});

interface Props { token: string; track: string; onSaved: () => void }

const ExternalWorkoutImport = ({ token, track, onSaved }: Props) => {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const freq = `${Math.max(1, days.length)}x/semana`;
  const summary = useMemo(() => summarizeHep((rows || []).map<HepLoadItem>((r) => ({
    name: r.name, region: r.region, sets: r.sets, reps: r.reps, frequency: freq, category: r.category,
    loadType: r.load_kg ? "kg" : "bodyweight", loadKg: r.load_kg,
  }))), [rows, freq]);

  const read = async () => {
    if (!text.trim() && !file) { setErr("Cole o treino ou envie um print."); return; }
    if (file && file.size > 5 * 1024 * 1024) { setErr("Imagem acima de 5 MB."); return; }
    setErr(""); setBusy(true);
    const body: Record<string, unknown> = { action: "parse_external_workout", token, text };
    if (file) { body.image_base64 = await toBase64(file); body.mime_type = file.type; }
    const { data, error } = await supabase.functions.invoke("periodization-checkin", { body });
    setBusy(false);
    if (error || !Array.isArray(data?.items)) { setErr("Não foi possível ler o treino agora. Tente novamente ou digite os exercícios."); return; }
    if (!data.items.length) { setErr("Nenhum exercício identificado. Confira o texto ou o print."); return; }
    setRows(data.items);
  };

  const upd = (i: number, k: keyof Row, v: string) =>
    setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, [k]: k === "load_kg" ? (v ? Number(v.replace(",", ".")) || null : null) : v } : r)));

  const save = async () => {
    if (!days.length) { setErr("Marque os dias da semana do treino."); return; }
    if (!summary.targetRpe || !summary.durationMin) { setErr("Nenhum exercício com carga (mobilidade e alongamento não contam)."); return; }
    setErr(""); setBusy(true);
    const detail = (rows || []).map((r) => `${r.name}: ${r.sets}×${r.reps}${r.load_kg ? ` ${r.load_kg}kg` : ""}`).join("\n");
    const sessions = datesFor(days).map((d) => ({
      session_date: d, track, planned_duration_min: summary.durationMin, planned_rpe: summary.targetRpe,
      planned_load: loadLevelFromTargetRpe(summary.targetRpe!), title: title.trim() || "Treino externo importado", notes: detail,
    }));
    const { data, error } = await supabase.functions.invoke("periodization-checkin", { body: { action: "submit_planned_batch", token, sessions } });
    setBusy(false);
    if (error || !data?.ok) { setErr("Não foi possível salvar agora. Tente novamente."); return; }
    setRows(null); setText(""); setFile(null); setDays([]); setTitle("");
    onSaved();
  };

  if (!rows) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Cole o treino ou envie um print da planilha. Você confere os exercícios antes de salvar e a dose é calculada pela mesma régua do programa de exercícios do fisioterapeuta.
        </p>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={6000}
          placeholder={"Ex.:\nAgachamento 4x8 60kg\nPrancha 3x30s\nRemada baixa 3x12"} className="text-sm" />
        <label className="flex items-center gap-2 text-xs cursor-pointer rounded-xl border border-dashed border-border px-3 py-2 hover:border-primary/60">
          <ImagePlus className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{file ? file.name : "Enviar print do treino (opcional)"}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button type="button" className="w-full rounded-xl gap-2" onClick={read} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Ler treino
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Confira e corrija antes de salvar.</p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-border p-2 space-y-1.5">
            <div className="flex gap-2">
              <Input value={r.name} onChange={(e) => upd(i, "name", e.target.value)} className="h-8 text-xs" />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remover exercício">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Input value={r.sets} onChange={(e) => upd(i, "sets", e.target.value)} placeholder="Séries" className="h-8 text-xs" />
              <Input value={r.reps} onChange={(e) => upd(i, "reps", e.target.value)} placeholder="Reps ou 30s" className="h-8 text-xs" />
              <Input value={r.load_kg ?? ""} onChange={(e) => upd(i, "load_kg", e.target.value)} placeholder="kg" inputMode="decimal" className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <select value={r.region} onChange={(e) => upd(i, "region", e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                {Object.entries(REGIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <select value={r.category} onChange={(e) => upd(i, "category", e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                {Object.entries(CATS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-full rounded-xl gap-1 text-xs"
          onClick={() => setRows([...rows, { name: "", sets: "3", reps: "10", region: "general", category: "strengthening", load_kg: null }])}>
          <Plus className="h-3.5 w-3.5" /> Adicionar exercício
        </Button>
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">Dias da semana</span>
        <div className="grid grid-cols-7 gap-1">
          {DOW.map((d, i) => (
            <Button key={d} type="button" size="sm" variant={days.includes(i) ? "default" : "outline"} className="text-[11px] px-0 rounded-lg"
              onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])}>{d}</Button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Entra no microciclo dos próximos 7 dias.</p>
      </div>

      <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Nome do treino (opcional)" className="text-sm" />

      {summary.targetRpe ? (
        <div className="rounded-xl bg-muted/50 p-3 space-y-1.5 text-xs">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">~{summary.durationMin} min/sessão</Badge>
            <Badge variant="outline">Esforço alvo {summary.targetRpe}</Badge>
            {summary.predominant && <Badge variant="outline">Intensidade {INT_LABEL[summary.predominant]}</Badge>}
            <Badge variant="outline">Dose {Math.round(summary.durationMin * summary.targetRpe)} por sessão</Badge>
          </div>
          {summary.byRegion.map((r) => (
            <div key={r.region} className="flex justify-between">
              <span>{REGIONS[r.region] || r.region}</span>
              <span className="text-muted-foreground">{Math.round(r.weeklySets * 10) / 10} séries/semana · {r.volume === "high" ? "alto" : r.volume === "moderate" ? "moderado" : "leve"}</span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">Força conta inteira, estabilização vale metade, mobilidade e alongamento não entram na carga.</p>
        </div>
      ) : null}

      {err && <p className="text-xs text-destructive">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setRows(null)} disabled={busy}>Voltar</Button>
        <Button type="button" className="rounded-xl gap-2" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar no microciclo
        </Button>
      </div>
    </div>
  );
};

export default ExternalWorkoutImport;
