import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, HeartPulse, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePatientBirthDate } from "@/hooks/usePatientBirthDate";
import type { PeriodizationPlan, ReadinessCheckin, SrpeEntry } from "@/lib/periodizationData";
import { acwr, recoverySignal, restingHrStatus } from "@/lib/periodization";
import {
  CARDIO_PROFILES, DEFAULT_CARDIO_PROFILE, OXIMETER_GUIDE, SPO2_ALERT,
  ageFromBirth, cardioMatrix, checkinSafetyFlags, comorbidityHint, hrCeiling, profileRule,
} from "@/lib/cardioSafety";

interface Props {
  patientId: string;
  plan: PeriodizationPlan | null;
  checkins: ReadinessCheckin[];
  entries: SrpeEntry[];
  onChanged: () => void;
  readOnly?: boolean;
}

const CardioSafetyCard = ({ patientId, plan, checkins, entries, onChanged, readOnly }: Props) => {
  const { toast } = useToast();
  const birth = usePatientBirthDate(patientId);
  const [hint, setHint] = useState<string | null>(null);
  const [profile, setProfile] = useState<string>(plan?.cardio_profile ?? DEFAULT_CARDIO_PROFILE);
  const [override, setOverride] = useState(plan?.hr_ceiling_override ? String(plan.hr_ceiling_override) : "");
  const [betaBlocker, setBetaBlocker] = useState(!!plan?.beta_blocker);
  const [saving, setSaving] = useState(false);
  // Recolhido por padrão: a linha-resumo do cabeçalho já traz o teto e as atenções.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setProfile(plan?.cardio_profile ?? DEFAULT_CARDIO_PROFILE);
    setOverride(plan?.hr_ceiling_override ? String(plan.hr_ceiling_override) : "");
    setBetaBlocker(!!plan?.beta_blocker);
  }, [plan?.cardio_profile, plan?.hr_ceiling_override, plan?.beta_blocker]);

  useEffect(() => {
    let off = false;
    (async () => {
      const sb = supabase as any;
      const { data: p } = await sb.from("patients").select("email").eq("id", patientId).maybeSingle();
      if (off) return;
      if (p?.email) {
        const { data: rec } = await sb.from("patient_health_records").select("*").eq("patient_email", p.email).limit(1).maybeSingle();
        if (!off && rec) setHint(comorbidityHint(JSON.stringify(rec)));
      }
    })();
    return () => { off = true; };
  }, [patientId]);

  const age = ageFromBirth(birth);
  const ceil = hrCeiling({ profile, age, override: override ? Number(override) : null });
  const rule = profileRule(profile);

  const cardioRatio = useMemo(() => acwr(entries.filter((e: any) => e.track === "cardio") as any), [entries]);
  const rhr = useMemo(() => restingHrStatus(checkins), [checkins]);
  const recovery = useMemo(() => recoverySignal(checkins as any, profileRule(profile).rhrAlert), [checkins, profile]);
  const matrix = cardioMatrix(cardioRatio, rhr.delta, profile, recovery.strained);

  const flagged = useMemo(
    () => checkins
      .map((c) => ({ c, flags: checkinSafetyFlags(c, ceil.ceiling) }))
      .filter((x) => x.flags.length)
      .sort((a, b) => b.c.checkin_date.localeCompare(a.c.checkin_date))
      .slice(0, 5),
    [checkins, ceil.ceiling],
  );

  const save = async () => {
    if (!plan) return;
    const ov = override ? Math.round(Number(override)) : null;
    if (ov !== null && (ov < 60 || ov > 230)) { toast({ title: "Teto manual entre 60 e 230 bpm", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("periodization_plans")
      .update({ cardio_profile: profile, hr_ceiling_override: ov, beta_blocker: betaBlocker }).eq("id", plan.id);
    setSaving(false);
    if (error) { toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Perfil cardiovascular salvo" });
    onChanged();
  };

  return (
    <Card data-periodization-block>
      <CardContent className="p-0">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left transition hover:bg-muted/50"
        >
          <HeartPulse className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">Teto de frequência cardíaca</span>
            {!open && (
              <span className="block truncate text-xs text-muted-foreground">
                {ceil.ceiling ? (
                  <>
                    <span className="font-medium text-foreground">{ceil.ceiling} bpm</span>{" "}
                    <span>{ceil.source === "manual" ? "(manual)" : `(${Math.round(ceil.pct * 100)}%)`}</span>
                  </>
                ) : (
                  "sem data de nascimento no cadastro"
                )}
                {flagged.length > 0 && (
                  <span className="text-rose-700 dark:text-rose-400">
                    {" "}· {flagged.length} {flagged.length === 1 ? "check-in em atenção" : "check-ins em atenção"}
                  </span>
                )}
              </span>
            )}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Perfil (definido pelo fisioterapeuta)</label>
                <Select value={profile} onValueChange={setProfile} disabled={readOnly}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CARDIO_PROFILES.map((p) => (
                      <SelectItem key={p.key} value={p.key}>{p.label} · {Math.round(p.ceilingPct * 100)}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Teto manual (ex.: teste ergométrico)</label>
                <Input type="number" inputMode="numeric" value={override} onChange={(e) => setOverride(e.target.value)} placeholder="opcional, bpm" className="h-9 text-sm" disabled={readOnly} />
              </div>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-border p-3">
              <Switch checked={betaBlocker} onCheckedChange={setBetaBlocker} disabled={readOnly} aria-label="Usa betabloqueador" />
              <span className="min-w-0 text-xs">
                <span className="block font-medium text-foreground">Usa betabloqueador</span>
                <span className="block text-muted-foreground">A análise cardiovascular passa a usar o esforço percebido (PSE/Borg) como guia principal; a FC fica como apoio.</span>
              </span>
            </label>
            {hint && <p className="text-xs text-amber-700 dark:text-amber-400">{hint}</p>}
            <div className="rounded-xl border border-border p-3 text-sm">
              {ceil.ceiling ? (
                <p>
                  Teto: <strong>{ceil.ceiling} bpm</strong>{" "}
                  <span className="text-xs text-muted-foreground">
                    {ceil.source === "manual" ? "(manual)" : `(${Math.round(ceil.pct * 100)}% de ${ceil.maxHr} bpm — 207 − 0,7 × ${age} anos)`}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Sem data de nascimento no cadastro: informe o teto manual.</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Régua deste perfil: ACWR ideal 0,8–{rule.acwrMax.toLocaleString("pt-BR")}, alerta acima de {rule.acwrAlert.toLocaleString("pt-BR")} ou FC ao acordar +{rule.rhrAlert} bpm. SpO₂ abaixo de {SPO2_ALERT}% gera atenção.
              </p>
            </div>
            <div className="rounded-xl border border-border p-3 text-sm space-y-1">
              <p className="text-xs font-medium text-foreground">Leitura do momento (ACWR cardio × FC ao acordar)</p>
              <p className="text-xs text-muted-foreground">
                ACWR cardio: {cardioRatio !== null ? cardioRatio.toFixed(2).replace(".", ",") : "—"} · FC ao acordar: {rhr.delta !== null ? `${rhr.delta > 0 ? "+" : ""}${rhr.delta} bpm` : "—"}
              </p>
              <p className={`text-xs ${matrix.quadrant === "optimal" || matrix.quadrant === "insufficient" ? "text-foreground" : "text-amber-700 dark:text-amber-400"}`}>{matrix.text}</p>
              <p className="text-[11px] text-muted-foreground">Sugestão, não diagnóstico.</p>
            </div>
            <p className="text-[11px] text-muted-foreground">{OXIMETER_GUIDE} Com betabloqueador, use o esforço percebido como guia principal.</p>
            {flagged.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Atenção nos check-ins</p>
                {flagged.map(({ c, flags }) => (
                  <p key={c.id} className="text-xs text-rose-700 dark:text-rose-400">
                    {new Date(`${c.checkin_date}T12:00:00Z`).toLocaleDateString("pt-BR")}:{" "}
                    {flags.includes("hr_above_ceiling") && `FC ${c.peak_hr} bpm acima do teto. `}
                    {flags.includes("spo2_low") && `SpO₂ ${c.spo2}%.`}
                  </p>
                ))}
                <p className="text-[11px] text-muted-foreground">Sugestão de conferência, não diagnóstico.</p>
              </div>
            )}
            {!readOnly && (plan ? (
              <Button type="button" size="sm" className="rounded-xl" onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar perfil
              </Button>
            ) : (
              <p className="text-[11px] text-muted-foreground">Estimativa com o perfil escolhido. Para salvar perfil e teto manual, estruture a periodização.</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CardioSafetyCard;
