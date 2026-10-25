import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Activity, Loader2, RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { useInsightPrefs } from "./useInsightPreferences";

interface Props {
  clinicId?: string;
  professionalId?: string;
}

interface LoadAlertRow {
  patient_id: string;
  patient_name: string | null;
  acwr: number | null;
  acute_load: number;
  chronic_load: number;
  readiness_current: number | null;
  readiness_baseline: number | null;
  last_srpe_date: string | null;
  last_checkin_date: string | null;
  pain_spike: boolean;
  level: "ok" | "caution" | "danger" | string;
  reasons: string[];
}

const DEFAULTS = {
  /** Mostrar também pacientes sem alerta (nível "ok"). */
  showAll: 0,
  /** ACWR a partir do qual o caso é considerado de risco alto. */
  dangerAcwr: 1.5,
};

const levelStyle = (level: string) =>
  level === "danger"
    ? "bg-rose-500/10 text-rose-700 border-rose-500/30"
    : level === "caution"
    ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
    : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";

const fmtDate = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

const LoadReadinessCard = ({ clinicId, professionalId }: Props) => {
  const [rows, setRows] = useState<LoadAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const { prefs, update, reset } = useInsightPrefs("load-readiness", DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_patient_load_alerts" as any, {
        _clinic_id: clinicId ?? null,
        _professional_id: professionalId ?? null,
      });
      if (cancelled) return;
      if (!error && Array.isArray(data)) {
        setRows(
          (data as any[]).map((r) => ({
            ...r,
            acwr: r.acwr === null || r.acwr === undefined ? null : Number(r.acwr),
            reasons: Array.isArray(r.reasons) ? r.reasons : [],
          })),
        );
      }
      setLoading(false);
    };
    if (clinicId || professionalId) load();
    else setLoading(false);
    return () => {
      cancelled = true;
    };
  }, [clinicId, professionalId]);

  const filtered = useMemo(() => {
    const withLevel = rows.map((r) => ({
      ...r,
      level:
        r.acwr !== null && r.acwr > Number(prefs.dangerAcwr)
          ? "danger"
          : r.level,
    }));
    return prefs.showAll ? withLevel : withLevel.filter((r) => r.level !== "ok");
  }, [rows, prefs.showAll, prefs.dangerAcwr]);

  const t = (pt: string, en: string, es?: string) =>
    lang === "pt" ? pt : lang === "es" ? es ?? en : en;

  const infoContent = (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-semibold mb-1">{t("Como é calculado", "How it's calculated")}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t(
            "Carga da sessão = duração (min) × esforço percebido (0–10). Carga aguda = soma dos últimos 7 dias; carga crônica = média semanal dos últimos 28 dias. ACWR = aguda ÷ crônica. Faixa ideal: 0,8–1,3. A prontidão (0–100) vem dos check-ins diários e serve para detectar tolerância à carga — não entra no ACWR. Flare-up: dor informada no último check-in (em até 3 dias) pelo menos 2 pontos acima da média dos últimos 30 dias, com 3+ check-ins. Pico de dor combinado com ACWR acima de 1,3 eleva o caso a risco alto.",
            "Session load = duration (min) × perceived effort (0–10). Acute load = last 7 days; chronic load = weekly average of last 28 days. ACWR = acute ÷ chronic. Ideal range: 0.8–1.3. Readiness (0–100) comes from daily check-ins and flags load tolerance — it does not feed the ACWR. Flare-up: pain reported in the latest check-in (within 3 days) at least 2 points above the 30-day average, with 3+ check-ins. A pain spike combined with ACWR above 1.3 raises the case to high risk.",
          )}
        </p>
      </div>
      <div className="border-t pt-3 space-y-3">
        <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
          {t("Personalizar", "Customize")}
        </p>
        <div className="space-y-1">
          <Label className="text-xs">{t("ACWR de risco alto", "High-risk ACWR")}</Label>
          <Input
            type="number"
            step="0.1"
            min={1}
            max={3}
            value={prefs.dangerAcwr}
            onChange={(e) => update({ dangerAcwr: Number(e.target.value) || DEFAULTS.dangerAcwr })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("Mostrar todos os pacientes", "Show every patient")}</Label>
          <select
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={prefs.showAll}
            onChange={(e) => update({ showAll: Number(e.target.value) })}
          >
            <option value={0}>{t("Somente com alerta", "Alerts only")}</option>
            <option value={1}>{t("Todos com dados", "All with data")}</option>
          </select>
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={reset}>
          <RotateCcw className="h-3 w-3 mr-1" />
          {t("Restaurar padrão", "Reset")}
        </Button>
      </div>
    </div>
  );

  return (
    <InsightCardShell
      id="load-readiness"
      icon={<Activity className="h-4 w-4 text-primary" />}
      title={t("Flare-up e sobrecarga", "Flare-up & overload", "Brote y sobrecarga")}
      description={t(
        "Picos de dor nos check-ins, carga fora da faixa segura ou queda de prontidão.",
        "Pain spikes in check-ins, load outside the safe range or dropping readiness.",
      )}
      rightSlot={
        filtered.length > 0 ? (
          <Badge variant="outline" className="text-xs">
            {filtered.length}
          </Badge>
        ) : null
      }
      infoContent={infoContent}
    >
      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {rows.length === 0
            ? t(
                "Nenhum registro de carga ou check-in ainda. Envie o link de carga na seção Periodização do prontuário.",
                "No load or check-in data yet. Share the load link from the Periodization section of the patient record.",
              )
            : t("Todos os pacientes monitorados estão na faixa segura.", "All monitored patients are within the safe range.")}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.patient_id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {r.patient_name || t("Paciente", "Patient")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Última sessão", "Last session")}: {fmtDate(r.last_srpe_date)} ·{" "}
                    {t("Último check-in", "Last check-in")}: {fmtDate(r.last_checkin_date)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className={`${levelStyle(r.level)} text-xs`}>
                    {r.level === "danger"
                      ? t("Risco alto", "High risk")
                      : r.level === "caution"
                      ? t("Atenção", "Caution")
                      : t("Seguro", "Safe")}
                  </Badge>
                  {r.pain_spike && (
                    <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 border-rose-500/30">
                      {t("Flare-up de dor", "Pain flare-up", "Brote de dolor")}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/50 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ACWR</p>
                  <p className="text-sm font-semibold">
                    {r.acwr === null ? "—" : r.acwr.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("Carga 7d", "7d load")}
                  </p>
                  <p className="text-sm font-semibold">{r.acute_load}</p>
                </div>
                <div className="rounded-md bg-muted/50 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("Prontidão", "Readiness")}
                  </p>
                  <p className="text-sm font-semibold">
                    {r.readiness_current === null ? "—" : `${r.readiness_current}/100`}
                  </p>
                </div>
              </div>

              {r.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {r.reasons.map((reason, i) => (
                    <Badge key={i} variant="secondary" className="text-[11px] font-normal">
                      {reason}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </InsightCardShell>
  );
};

export default LoadReadinessCard;
