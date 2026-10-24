import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, MessageCircle, CalendarPlus, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { useInsightPrefs } from "./useInsightPreferences";

interface Props {
  clinicId?: string;
  professionalId?: string;
}

interface ChurnRow {
  patient_email: string;
  patient_name: string | null;
  professional_id: string | null;
  score: number;
  reasons: string[];
  last_session_date: string | null;
  next_session_date: string | null;
  silent_days: number | null;
}

const scoreColor = (score: number) => {
  if (score >= 80) return "bg-red-500/10 text-red-700 border-red-500/30";
  if (score >= 60) return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
};

const DEFAULTS = {
  minScore: 50,
  noShowThreshold: 2,
  silenceDays: 14,
  painStagnationWeeks: 3,
};

const ChurnRiskCard = ({ clinicId, professionalId }: Props) => {
  const [rows, setRows] = useState<ChurnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const { prefs, update, reset } = useInsightPrefs("churn", DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_patient_churn_risk" as any, {
        _clinic_id: clinicId ?? null,
        _professional_id: professionalId ?? null,
      });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setRows(data as any);
      setLoading(false);
    };
    if (clinicId || professionalId) load();
    return () => { cancelled = true; };
  }, [clinicId, professionalId]);

  const filtered = useMemo(
    () => rows.filter((r) => r.score >= prefs.minScore),
    [rows, prefs.minScore]
  );

  const infoContent = (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-semibold mb-1">
          {lang === "pt" ? "Como o score é calculado" : "How the score is calculated"}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {lang === "pt"
            ? "O score (0–100) combina: faltas recentes, ausência de próximo agendamento, dor estagnada e silêncio digital — dias sem diário de dor, sem check-in de prontidão e sem mensagem escrita pelo paciente. O silêncio total pesa mais porque costuma preceder o abandono."
            : "Score (0–100) combines: recent no-shows, no upcoming appointment, stagnant pain and digital silence — days without pain diary, readiness check-in or a message written by the patient. Full silence weighs more because it usually precedes dropout."}
        </p>
      </div>
      <div className="border-t pt-3 space-y-3">
        <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
          {lang === "pt" ? "Personalizar" : "Customize"}
        </p>
        <div className="space-y-1">
          <Label className="text-xs">
            {lang === "pt" ? "Score mínimo para exibir" : "Minimum score to show"}
          </Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={prefs.minScore}
            onChange={(e) => update({ minScore: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {lang === "pt" ? "Faltas a considerar (referência)" : "No-show threshold (reference)"}
          </Label>
          <Input
            type="number"
            min={1}
            value={prefs.noShowThreshold}
            onChange={(e) => update({ noShowThreshold: Math.max(1, Number(e.target.value) || 1) })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {lang === "pt" ? "Dias de silêncio (referência)" : "Silence days (reference)"}
          </Label>
          <Input
            type="number"
            min={1}
            value={prefs.silenceDays}
            onChange={(e) => update({ silenceDays: Math.max(1, Number(e.target.value) || 1) })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {lang === "pt" ? "Semanas de estagnação de dor" : "Pain stagnation (weeks)"}
          </Label>
          <Input
            type="number"
            min={1}
            value={prefs.painStagnationWeeks}
            onChange={(e) => update({ painStagnationWeeks: Math.max(1, Number(e.target.value) || 1) })}
            className="h-8"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {lang === "pt"
            ? "Apenas o score mínimo filtra a lista local; os outros parâmetros servem como referência (o cálculo é feito no servidor)."
            : "Only minimum score filters the list locally; other parameters are reference (calculation runs server-side)."}
        </p>
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1 text-xs h-7">
          <RotateCcw className="h-3 w-3" />
          {lang === "pt" ? "Restaurar padrões" : "Reset defaults"}
        </Button>
      </div>
    </div>
  );

  return (
    <InsightCardShell
      id="churn"
      className="border-red-500/20"
      icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
      title={lang === "pt" ? "Abandono silencioso" : lang === "es" ? "Abandono silencioso" : "Silent dropout"}
      description={
        lang === "pt"
          ? "Pacientes esfriando: sem agendar, faltando, com dor estagnada ou em silêncio digital (sem diário, check-in ou mensagem)."
          : lang === "es"
          ? "Pacientes enfriándose: sin agendar, faltando, con dolor estancado o en silencio digital (sin diario, check-in o mensaje)."
          : "Patients cooling off: not booking, missing sessions, stagnant pain or digitally silent (no diary, check-in or message)."
      }
      rightSlot={
        !loading && filtered.length > 0 ? (
          <Badge variant="destructive" className="ml-auto text-[10px] px-2 py-0">{filtered.length}</Badge>
        ) : null
      }
      infoContent={infoContent}
    >
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {lang === "pt" ? "Nenhum paciente em risco no momento ✨" : lang === "es" ? "Sin pacientes en riesgo ✨" : "No patients at risk ✨"}
          </p>
        ) : (
          filtered.slice(0, 10).map((r) => (
            <div key={r.patient_email} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-background">
              <Badge variant="outline" className={`shrink-0 px-2 py-1 text-xs font-bold ${scoreColor(r.score)}`}>
                {r.score}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.patient_name || r.patient_email}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {(r.reasons || []).slice(0, 2).join(" · ") || "—"}
                </p>
                {typeof r.silent_days === "number" && r.silent_days > 0 && r.silent_days < 9999 && (
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                    {lang === "pt"
                      ? `Último sinal de atividade há ${r.silent_days} dia(s)`
                      : lang === "es"
                      ? `Última señal de actividad hace ${r.silent_days} día(s)`
                      : `Last sign of activity ${r.silent_days} day(s) ago`}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => navigate("/dashboard?tab=agenda")}
                  title={lang === "pt" ? "Reagendar" : "Reschedule"}
                >
                  <CalendarPlus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => navigate("/dashboard?tab=messages")}
                  title={lang === "pt" ? "Mensagem" : "Message"}
                >
                  <MessageCircle className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </InsightCardShell>
  );
};

export default ChurnRiskCard;
