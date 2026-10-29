import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, FileDown, HandCoins, Loader2, Plus, Settings2, Trash2 } from "lucide-react";
import InsightCardShell from "./InsightCardShell";
import type { ManagementData } from "./useManagementData";
import { usePriceOf } from "./ManagementCards";
import { computePayouts, type Compensation, type PayoutAdjustment, type ServicePayoutRule, type SessionMode } from "@/lib/payouts";
import { downloadPayoutPdf } from "@/utils/generatePayoutPdf";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: string) => { const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const shiftMonth = (m: string, d: number) => { const [y, mo] = m.split("-").map(Number); const t = new Date(Date.UTC(y, mo - 1 + d, 1)); return t.toISOString().slice(0, 7); };
const sb = supabase as any;

/** Repasses da equipe: regra por profissional, descontos por serviço, ajustes do mês e PDF. Só dono/admin. */
const PayoutsCard = ({ d, clinicId }: { d: ManagementData; clinicId: string }) => {
  const { activeClinic } = useClinic();
  const { user } = useAuth();
  const priceOf = usePriceOf(d);
  const [month, setMonth] = useState(d.today.slice(0, 7));
  const [comp, setComp] = useState<Compensation[]>([]);
  const [adj, setAdj] = useState<PayoutAdjustment[]>([]);
  const [rules, setRules] = useState<ServicePayoutRule[]>([]);
  const [team, setTeam] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [showServices, setShowServices] = useState(false);
  const [draft, setDraft] = useState({ label: "", amount: "", sign: "-" as "+" | "-" });

  const loadBase = useCallback(async () => {
    const [c, s, m] = await Promise.all([
      sb.from("clinic_compensation").select("professional_id, session_mode, session_value, monthly_fixed").eq("clinic_id", clinicId),
      sb.from("care_services").select("id, name, deduction_pct, payout_mode, payout_value").eq("clinic_id", clinicId).order("name"),
      sb.rpc("get_clinic_members_with_details", { _clinic_id: clinicId }),
    ]);
    setComp((c.data || []).map((r: any) => ({ ...r, session_value: Number(r.session_value), monthly_fixed: Number(r.monthly_fixed) })));
    setRules((s.data || []).map((r: any) => ({ ...r, deduction_pct: Number(r.deduction_pct) || 0, payout_value: r.payout_value == null ? null : Number(r.payout_value) })));
    const members = (m.data || []).filter((x: any) => x.status === "active" && x.role !== "secretary");
    const byUser: Record<string, string> = {};
    members.forEach((x: any) => { byUser[x.user_id] = x.full_name || x.email || "Profissional"; });
    const map: Record<string, string> = {};
    if (members.length) {
      const { data } = await sb.from("professionals").select("id, user_id").in("user_id", Object.keys(byUser));
      (data || []).forEach((p: any) => { map[p.id] = byUser[p.user_id]; });
    }
    setTeam(map);
  }, [clinicId]);

  const loadAdj = useCallback(async () => {
    const { data } = await sb.from("clinic_payout_adjustments").select("id, professional_id, label, amount").eq("clinic_id", clinicId).eq("month", month).order("created_at");
    setAdj((data || []).map((r: any) => ({ ...r, amount: Number(r.amount) })));
  }, [clinicId, month]);

  useEffect(() => { setLoading(true); void Promise.all([loadBase(), loadAdj()]).finally(() => setLoading(false)); }, [loadBase, loadAdj]);

  const names = useMemo(() => ({ ...d.names, ...team }), [d.names, team]);
  const r = useMemo(() => computePayouts({ appts: d.appts, month, priceOf, services: rules, compensation: comp, adjustments: adj, names, professionalIds: Object.keys(team) }), [d.appts, month, priceOf, rules, comp, adj, names, team]);

  const fail = (e: any) => { if (e) { toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" }); return true; } return false; };
  const saveComp = async (pid: string, patch: Partial<Compensation>) => {
    const cur = comp.find((c) => c.professional_id === pid) || { professional_id: pid, session_mode: "none" as SessionMode, session_value: 0, monthly_fixed: 0 };
    const next = { ...cur, ...patch };
    setComp((l) => [...l.filter((c) => c.professional_id !== pid), next]);
    const { error } = await sb.from("clinic_compensation").upsert({ clinic_id: clinicId, ...next, updated_at: new Date().toISOString() }, { onConflict: "clinic_id,professional_id" });
    fail(error);
  };
  const saveRule = async (id: string, patch: Partial<ServicePayoutRule>) => {
    setRules((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const { error } = await sb.from("care_services").update(patch).eq("id", id);
    fail(error);
  };
  const addAdj = async (pid: string) => {
    const v = num(draft.amount);
    if (!draft.label.trim() || !v) { toast({ title: "Informe a descrição e o valor", variant: "destructive" }); return; }
    const { error } = await sb.from("clinic_payout_adjustments").insert({ clinic_id: clinicId, professional_id: pid, month, label: draft.label.trim(), amount: draft.sign === "-" ? -Math.abs(v) : Math.abs(v), created_by: user?.id });
    if (fail(error)) return;
    setDraft({ label: "", amount: "", sign: "-" }); loadAdj();
  };
  const delAdj = async (id: string) => { const { error } = await sb.from("clinic_payout_adjustments").delete().eq("id", id); if (!fail(error)) loadAdj(); };

  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const Tile = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className="rounded-lg bg-muted/50 p-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={`text-sm font-semibold ${strong ? "text-primary" : ""}`}>{value}</p></div>
  );

  return (
    <InsightCardShell id="payouts" icon={<HandCoins className="h-4 w-4 text-primary" />} title="Faturamento e repasses da equipe"
      description="Bruto, descontos, repasse de cada profissional e o que fica para a clínica no mês."
      rightSlot={<div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-xs capitalize min-w-[96px] text-center">{monthLabel}</span>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
      </div>}
      infoContent={<p className="text-xs text-muted-foreground leading-relaxed">Considera só atendimentos realizados. O valor vem do serviço agendado (mensalidades divididas pelas sessões do mês). O desconto do serviço (impostos, taxas) sai antes do percentual. Fixo mensal (salário, bolsa) e ajustes entram independentemente do volume. Regra do serviço, quando definida, substitui a do profissional.</p>}>
      {loading || d.loading ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="Faturamento bruto" value={brl(r.totals.gross)} />
            <Tile label="Descontos/impostos" value={brl(r.totals.deductions)} />
            <Tile label="Repasses da equipe" value={brl(r.totals.payouts)} />
            <Tile label="Líquido da clínica" value={brl(r.totals.clinicNet)} strong />
          </div>

          {r.rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum atendimento realizado neste mês.</p>}
          {r.rows.map((p) => {
            const c = comp.find((x) => x.professional_id === p.professionalId);
            const isOpen = open === p.professionalId;
            return (
              <div key={p.professionalId} className="rounded-lg border border-border/60 bg-background p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[140px]"><p className="text-sm font-medium truncate">{p.name}</p><p className="text-[11px] text-muted-foreground">{p.rule}</p></div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setOpen(isOpen ? null : p.professionalId)}><Settings2 className="h-3.5 w-3.5" />Regra e ajustes</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => downloadPayoutPdf({ payout: p, month, clinicName: activeClinic?.clinic_name || "Clínica", logoUrl: activeClinic?.logo_url, brandColor: activeClinic?.brand_color })}><FileDown className="h-3.5 w-3.5" />PDF</Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-md bg-muted/50 py-1"><p className="text-[10px] text-muted-foreground">Atendimentos</p><b>{p.sessions}</b></div>
                  <div className="rounded-md bg-muted/50 py-1"><p className="text-[10px] text-muted-foreground">Bruto gerado</p><b>{brl(p.gross)}</b></div>
                  <div className="rounded-md bg-muted/50 py-1"><p className="text-[10px] text-muted-foreground">A repassar</p><b>{brl(p.total)}</b></div>
                  <div className="rounded-md bg-muted/50 py-1"><p className="text-[10px] text-muted-foreground">Fica na clínica</p><b>{brl(p.clinicNet)}</b></div>
                </div>
                {isOpen && (
                  <div className="space-y-3 border-t border-border pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="text-[11px] text-muted-foreground">Por atendimento
                        <Select value={c?.session_mode || "none"} onValueChange={(v) => saveComp(p.professionalId, { session_mode: v as SessionMode })}>
                          <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="none">Sem repasse por sessão</SelectItem><SelectItem value="percent">Percentual (%)</SelectItem><SelectItem value="fixed">Valor fixo (R$)</SelectItem></SelectContent>
                        </Select>
                      </label>
                      <label className="text-[11px] text-muted-foreground">{c?.session_mode === "fixed" ? "R$ por atendimento" : "% do valor"}
                        <Input key={`sv-${p.professionalId}-${c?.session_value}`} disabled={!c || c.session_mode === "none"} defaultValue={c?.session_value || ""} inputMode="decimal" className="h-8 mt-1 text-xs" onBlur={(e) => saveComp(p.professionalId, { session_value: num(e.target.value) })} />
                      </label>
                      <label className="text-[11px] text-muted-foreground">Fixo mensal (salário/bolsa)
                        <Input key={`mf-${p.professionalId}-${c?.monthly_fixed}`} defaultValue={c?.monthly_fixed || ""} inputMode="decimal" placeholder="0" className="h-8 mt-1 text-xs" onBlur={(e) => saveComp(p.professionalId, { monthly_fixed: num(e.target.value) })} />
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium">Descontos e repasses adicionais de {monthLabel}</p>
                      {p.adjustments.map((a) => (
                        <div key={a.id} className="flex items-center gap-2 text-xs"><span className="flex-1 truncate">{a.label}</span><b className={a.amount < 0 ? "text-destructive" : "text-primary"}>{a.amount < 0 ? "- " : "+ "}{brl(Math.abs(a.amount))}</b>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => delAdj(a.id)} aria-label="Remover ajuste"><Trash2 className="h-3 w-3" /></Button></div>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        <Select value={draft.sign} onValueChange={(v) => setDraft({ ...draft, sign: v as "+" | "-" })}>
                          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="-">Desconto (−)</SelectItem><SelectItem value="+">Adicional (+)</SelectItem></SelectContent>
                        </Select>
                        <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Ex.: vale, bônus, imposto" className="h-8 flex-1 min-w-[140px] text-xs" />
                        <Input value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="R$" inputMode="decimal" className="h-8 w-[90px] text-xs" />
                        <Button type="button" size="sm" className="h-8 gap-1 text-xs" onClick={() => addAdj(p.professionalId)}><Plus className="h-3.5 w-3.5" />Lançar</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="border-t border-border pt-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowServices((v) => !v)}>{showServices ? "Ocultar" : "Ajustar"} descontos e regras por serviço</Button>
            {showServices && (
              <div className="space-y-1.5 mt-2">
                {rules.length === 0 && <p className="text-xs text-muted-foreground">Cadastre serviços em Operação → Serviços e valores.</p>}
                {rules.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-border/60 p-2">
                    <p className="flex-1 min-w-[120px] text-xs font-medium">{s.name}</p>
                    <label className="text-[10px] text-muted-foreground">Desconto na base (%)
                      <Input key={`d-${s.id}-${s.deduction_pct}`} defaultValue={s.deduction_pct || ""} placeholder="0" inputMode="decimal" className="h-8 w-[90px] mt-0.5 text-xs" onBlur={(e) => saveRule(s.id, { deduction_pct: num(e.target.value) })} />
                    </label>
                    <label className="text-[10px] text-muted-foreground">Repasse deste serviço
                      <Select value={s.payout_mode || "inherit"} onValueChange={(v) => saveRule(s.id, { payout_mode: v === "inherit" ? null : (v as "percent" | "fixed") })}>
                        <SelectTrigger className="h-8 w-[150px] mt-0.5 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="inherit">Regra do profissional</SelectItem><SelectItem value="percent">Percentual (%)</SelectItem><SelectItem value="fixed">Valor fixo (R$)</SelectItem></SelectContent>
                      </Select>
                    </label>
                    {s.payout_mode && (
                      <label className="text-[10px] text-muted-foreground">{s.payout_mode === "fixed" ? "R$" : "%"}
                        <Input key={`pv-${s.id}-${s.payout_value}`} defaultValue={s.payout_value ?? ""} inputMode="decimal" className="h-8 w-[80px] mt-0.5 text-xs" onBlur={(e) => saveRule(s.id, { payout_value: num(e.target.value) })} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </InsightCardShell>
  );
};

export default PayoutsCard;
