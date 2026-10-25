import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Target, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { CARE_APPOINTMENT_FILTER, isCare } from "@/lib/managementMetrics";

interface Props {
  /** owner: pass clinicId. Pro autônomo: pass professionalId. */
  clinicId?: string;
  professionalId?: string;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const RevenueGoalCard = ({ clinicId, professionalId }: Props) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";

  const [goal, setGoal] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [completed, setCompleted] = useState<number>(0);
  const [noShowRate, setNoShowRate] = useState<number>(0);
  const [occupancy, setOccupancy] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Permite ao usuário sobrescrever a base do simulador quando ainda
  // não há histórico suficiente no mês (caso comum no início do mês ou
  // em clínicas que ainda não estão registrando atendimentos no app).
  const [baseTouched, setBaseTouched] = useState(false);
  const [baseSessions, setBaseSessions] = useState<number>(0);
  const [baseNoShow, setBaseNoShow] = useState<number>(0);

  // simulator
  const [reduceNoShow, setReduceNoShow] = useState<number>(0); // pp
  const [increaseOcc, setIncreaseOcc] = useState<number>(0); // pp

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setCompleted(0);
      setNoShowRate(0);
      setOccupancy(0);
      setBaseTouched(false);
      const table = clinicId ? "clinics" : "professionals";
      const id = clinicId ?? professionalId;
      if (!id) { setLoading(false); return; }
      const { data } = await (supabase as any).from(table)
        .select("monthly_revenue_goal, default_session_price")
        .eq("id", id)
        .maybeSingle();
      if (!cancelled && data) {
        setGoal(Number(data.monthly_revenue_goal) || 0);
        setPrice(Number(data.default_session_price) || 0);
      }
      // KPIs
      if (clinicId) {
        const { data: kpi } = await (supabase as any).rpc("get_clinic_kpis", { _clinic_id: clinicId });
        const row = Array.isArray(kpi) ? kpi[0] : kpi;
        if (!cancelled && row) {
          setCompleted(row.completed_this_month || 0);
          setOccupancy(row.occupancy || 0);
          // derive no-show rate from status_data
          const sd: any[] = row.status_data || [];
          const total = sd.reduce((s, x) => s + (x.value || 0), 0);
          const ns = sd.find((x) => /n[aã]o|no.show/i.test(x.name))?.value || 0;
          setNoShowRate(total ? Math.round((100 * ns) / total) : 0);
        }
      } else if (professionalId) {
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
        const { data: appts } = await (supabase as any).from("professional_appointments")
          .select("status, appointment_date, service_type")
          .or(CARE_APPOINTMENT_FILTER)
          .is("clinic_id", null)
          .eq("professional_id", professionalId)
          .gte("appointment_date", monthStart.toISOString().slice(0, 10));
        if (!cancelled && Array.isArray(appts)) {
          const care = appts.filter(isCare);
          const done = care.filter((a: any) => a.status === "completed").length;
          const consid = care.filter((a: any) => ["completed","no_show","cancelled"].includes(a.status));
          setCompleted(done);
          setNoShowRate(consid.length ? Math.round((100 * consid.filter((a:any)=>a.status==="no_show").length) / consid.length) : 0);
          setOccupancy(0);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId, professionalId]);

  // Sincroniza inputs editáveis com dados reais até o usuário ajustar.
  useEffect(() => {
    if (!baseTouched) {
      setBaseSessions(completed);
      setBaseNoShow(noShowRate);
    }
  }, [completed, noShowRate, baseTouched]);

  const effectiveSessions = baseSessions;
  const effectiveNoShow = baseNoShow;
  const currentRevenue = effectiveSessions * price;
  // Recupera no-show: cada ponto percentual reduzido vira sessões extras
  // proporcionais ao volume total estimado (sessões + no-shows).
  const totalScheduled = effectiveNoShow > 0
    ? effectiveSessions / (1 - effectiveNoShow / 100)
    : effectiveSessions;
  const recoveredFromNoShow = Math.round(totalScheduled * (reduceNoShow / 100));
  const occupancyGain = Math.round(Math.max(effectiveSessions, 1) * (increaseOcc / 100));
  const extraSessions = recoveredFromNoShow + occupancyGain;
  const projectedRevenue = (effectiveSessions + extraSessions) * price;
  const extraRevenue = projectedRevenue - currentRevenue;
  const goalProgress = goal > 0 ? Math.min(100, Math.round((projectedRevenue / goal) * 100)) : 0;
  const sessionsToGoal = goal > 0 && price > 0 ? Math.ceil(goal / price) : 0;

  const handleSave = async () => {
    setSaving(true);
    const table = clinicId ? "clinics" : "professionals";
    const id = clinicId ?? professionalId;
    if (!id) return;
    const { error } = await (supabase as any).from(table)
      .update({ monthly_revenue_goal: goal || null, default_session_price: price || null })
      .eq("id", id);
    setSaving(false);
    if (error) toast({ title: lang === "pt" ? "Erro ao salvar" : "Save error", variant: "destructive" });
    else toast({ title: lang === "pt" ? "Meta salva!" : "Goal saved!" });
  };

  return (
    <InsightCardShell
      id="revenue"
      className="border-primary/20"
      icon={<Target className="h-4 w-4 text-primary" />}
      title={lang === "pt" ? "Meta de receita & Simulador" : lang === "es" ? "Meta de ingresos & Simulador" : "Revenue goal & Simulator"}
      description={
        lang === "pt"
          ? "Defina sua meta mensal e simule o impacto de melhorar no-show e ocupação."
          : "Set your monthly target and simulate the impact of reducing no-shows and raising occupancy."
      }
    >
      <div className="space-y-5">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{lang === "pt" ? "Meta mensal (R$)" : "Monthly goal (R$)"}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={goal || ""}
                  onChange={(e) => setGoal(Number(e.target.value) || 0)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{lang === "pt" ? "Valor da sessão (R$)" : "Session price (R$)"}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={price || ""}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  className="h-9"
                />
              </div>
            </div>

            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {lang === "pt" ? "Salvar" : "Save"}
            </Button>

            {/* Current revenue + base inputs */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
              <p className="text-xs text-muted-foreground">
                {lang === "pt" ? "Receita atual estimada (mês)" : "Current estimated revenue (month)"}
              </p>
              <p className="text-xl font-bold text-foreground">{fmtBRL(currentRevenue)}</p>
              <p className="text-[11px] text-muted-foreground">
                {lang === "pt"
                  ? "Ajuste a base se ainda não há histórico suficiente:"
                  : "Adjust the base if there's no history yet:"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    {lang === "pt" ? "Sessões/mês" : "Sessions/month"}
                  </Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={baseSessions || ""}
                    onChange={(e) => { setBaseTouched(true); setBaseSessions(Number(e.target.value) || 0); }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    {lang === "pt" ? "No-show atual (%)" : "Current no-show (%)"}
                  </Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={baseNoShow || ""}
                    onChange={(e) => { setBaseTouched(true); setBaseNoShow(Math.min(100, Math.max(0, Number(e.target.value) || 0))); }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              {sessionsToGoal > 0 && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  {lang === "pt"
                    ? `Para bater a meta: ~${sessionsToGoal} sessões/mês`
                    : `To hit goal: ~${sessionsToGoal} sessions/month`}
                </p>
              )}
            </div>

            {/* Simulator */}
            <div className="space-y-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                {lang === "pt" ? "Simulador what-if" : "What-if simulator"}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>{lang === "pt" ? "Reduzir no-show em" : "Reduce no-show by"}</span>
                  <span className="font-semibold tabular-nums">{reduceNoShow}pp</span>
                </div>
                <Slider value={[reduceNoShow]} onValueChange={(v) => setReduceNoShow(v[0])} min={0} max={15} step={1} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>{lang === "pt" ? "Aumentar ocupação em" : "Increase occupancy by"}</span>
                  <span className="font-semibold tabular-nums">{increaseOcc}pp</span>
                </div>
                <Slider value={[increaseOcc]} onValueChange={(v) => setIncreaseOcc(v[0])} min={0} max={25} step={1} />
              </div>

              <div className="pt-2 border-t border-primary/20">
                <p className="text-xs text-muted-foreground">
                  {lang === "pt" ? "Receita projetada" : "Projected revenue"}
                </p>
                <p className="text-xl font-bold text-emerald-700">{fmtBRL(projectedRevenue)}</p>
                {extraRevenue > 0 && (
                  <p className="text-xs font-medium text-emerald-700">
                    +{fmtBRL(extraRevenue)} ({extraSessions} {lang === "pt" ? "sessões extras" : "extra sessions"})
                  </p>
                )}
                {price <= 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    {lang === "pt"
                      ? "Defina o valor da sessão acima para ver projeções em R$."
                      : "Set the session price above to see R$ projections."}
                  </p>
                )}
                {goal > 0 && (
                  <div className="mt-2 space-y-1">
                    <Progress value={goalProgress} className="h-2" />
                    <p className="text-[11px] text-muted-foreground">
                      {goalProgress}% {lang === "pt" ? "da meta" : "of goal"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </InsightCardShell>
  );
};

export default RevenueGoalCard;
