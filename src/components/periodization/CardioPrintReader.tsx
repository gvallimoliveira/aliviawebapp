import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface CardioReading {
  duration_min: number | null;
  distance_km: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  spo2: number | null;
  suggested_rpe: number | null;
  summary: string;
}

export const CARDIO_PRINT_ERR: Record<string, string> = {
  ai_credits: "Leitura indisponível no momento. Preencha manualmente.",
  ai_rate_limited: "Muitas leituras seguidas. Tente em instantes.",
  image_too_large: "Imagem grande demais. Envie um print menor.",
};

/** Lê print de monitor cardíaco, relógio, esteira, app ou oxímetro. Usuário revisa antes de salvar. */
const CardioPrintReader = ({ token, onApply }: { token: string; onApply: (r: CardioReading) => void }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [reading, setReading] = useState<CardioReading | null>(null);

  const read = async (file: File) => {
    setBusy(true); setMsg(""); setReading(null);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result).split(",")[1] || "");
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("periodization-checkin", {
        body: { action: "parse_cardio_print", token, image_base64: b64, mime_type: file.type },
      });
      if (error || !data?.reading) { setMsg(CARDIO_PRINT_ERR[data?.error] || "Não consegui ler o print. Preencha manualmente."); return; }
      setReading(data.reading);
    } finally { setBusy(false); if (input.current) input.current.value = ""; }
  };

  const f = (v: number | null, u: string) => (v === null ? "—" : `${String(v).replace(".", ",")} ${u}`);

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        Ler print do treino
      </Button>
      <p className="text-[11px] text-muted-foreground">Monitor cardíaco, relógio, esteira, app de treino ou oxímetro. Você confere antes de salvar.</p>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
      {reading && (
        <div className="space-y-2 text-xs">
          <p className="text-foreground">
            Duração {f(reading.duration_min, "min")} · Distância {f(reading.distance_km, "km")} · FC média {f(reading.avg_hr, "bpm")} · FC máx. {f(reading.max_hr, "bpm")} · SpO₂ {f(reading.spo2, "%")}
            {reading.suggested_rpe !== null && ` · Esforço sugerido ${reading.suggested_rpe}`}
          </p>
          {reading.summary && <p className="text-muted-foreground">{reading.summary}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" className="rounded-xl" onClick={() => { onApply(reading); setReading(null); }}>Usar estes dados</Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-xl" onClick={() => setReading(null)}>Descartar</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardioPrintReader;
