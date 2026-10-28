import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronDown, Loader2, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { findOverlaps, fmtMinutes, type AgendaSlot } from "@/lib/appointmentConflicts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  type AppointmentRequest, PERIOD_LABEL, formatBrDate, notifyAppointmentRequest, suggestedTime, whatsappLink,
} from "@/lib/appointmentRequests";

interface Props {
  clinicId?: string | null;
  professionalId?: string | null;
  /** Only clinic owner/admin/secretary or the solo PRO should mount this. */
}

const AppointmentRequestsPanel = ({ clinicId, professionalId }: Props) => {
  const [items, setItems] = useState<AppointmentRequest[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [therapists, setTherapists] = useState<{ id: string; full_name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [target, setTarget] = useState<AppointmentRequest | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("50");
  const [therapistId, setTherapistId] = useState("");
  const [serviceId, setServiceId] = useState("none");
  const [busy, setBusy] = useState(false);
  const [daySlots, setDaySlots] = useState<AgendaSlot[]>([]);

  useEffect(() => {
    if (!target || !date) { setDaySlots([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      let q = (supabase.from("professional_appointments") as any)
        .select("id, appointment_time, duration_minutes, patient_name, service_type, status")
        .eq("appointment_date", date);
      if (clinicId) {
        q = q.eq("clinic_id", clinicId);
        if (therapistId) q = q.eq("professional_id", therapistId);
      } else {
        q = q.eq("professional_id", professionalId ?? "").is("clinic_id", null);
      }
      const { data } = await q;
      if (!cancelled) setDaySlots((data as AgendaSlot[]) || []);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [target, date, therapistId, clinicId, professionalId]);

  const overlaps = useMemo(() => (time ? findOverlaps(time, Number(duration) || 50, daySlots) : []), [time, duration, daySlots]);

  const scopeReady = !!clinicId || !!professionalId;

  const load = useCallback(async () => {
    if (!scopeReady) return;
    let q = (supabase.from("appointment_requests" as any) as any).select("*").eq("status", "pending");
    q = clinicId ? q.eq("clinic_id", clinicId) : q.eq("professional_id", professionalId).is("clinic_id", null);
    let serviceQuery = supabase.from("care_services").select("id, name");
    serviceQuery = clinicId ? serviceQuery.eq("clinic_id", clinicId) : serviceQuery.eq("professional_id", professionalId ?? "").is("clinic_id", null);
    const [{ data, error }, { data: catalog, error: serviceError }] = await Promise.all([
      q.order("requested_date", { ascending: true }), serviceQuery,
    ]);
    if (error || serviceError) {
      toast.error("Não foi possível carregar as solicitações e seus serviços.");
      return;
    }
    const names = new Map((catalog || []).map((service) => [service.id, service.name]));
    setItems(((data as AppointmentRequest[]) || []).map((request) => ({
      ...request, service_name: request.service_id ? names.get(request.service_id) ?? null : null,
    })));
  }, [clinicId, professionalId, scopeReady]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!scopeReady) return;
    const filter = clinicId ? `clinic_id=eq.${clinicId}` : `professional_id=eq.${professionalId}`;
    const ch = supabase
      .channel(`apt-req-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointment_requests", filter }, (payload: any) => {
        if (payload.eventType === "INSERT") toast.info(`Nova solicitação de agendamento: ${payload.new?.patient_name || "paciente"}`);
        void load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clinicId, professionalId, scopeReady, load]);

  useEffect(() => {
    if (!scopeReady) return;
    (async () => {
      let sq = (supabase.from("care_services" as any) as any).select("id, name").eq("active", true);
      sq = clinicId ? sq.eq("clinic_id", clinicId) : sq.eq("professional_id", professionalId).is("clinic_id", null);
      const { data: sv } = await sq;
      setServices(sv || []);
      if (clinicId) {
        const { data: members } = await supabase.from("clinic_members").select("user_id")
          .eq("clinic_id", clinicId).eq("status", "active")
          .in("role", ["owner", "therapist", "osteopath", "pilates_instructor", "doctor", "rpg_specialist", "massage_therapist"]);
        const ids = (members || []).map((m) => m.user_id);
        if (ids.length) {
          const { data: pros } = await supabase.from("professionals").select("id, full_name").in("user_id", ids);
          setTherapists(pros || []);
        }
      }
    })();
  }, [clinicId, professionalId, scopeReady]);

  const openApprove = (r: AppointmentRequest) => {
    setTarget(r);
    setDate(r.requested_date);
    setTime(suggestedTime(r));
    setDuration("50");
    setServiceId(r.service_id || "none");
    setTherapistId(therapists[0]?.id || "");
  };

  const approve = async () => {
    if (!target) return;
    if (clinicId && !therapistId) { toast.error("Escolha o fisioterapeuta."); return; }
    setBusy(true);
    const { error } = await supabase.rpc("approve_appointment_request" as any, {
      _request_id: target.id, _date: date, _time: time, _duration: Number(duration) || 50,
      _professional_id: clinicId ? therapistId : null, _service_id: serviceId === "none" ? null : serviceId,
    });
    setBusy(false);
    if (error) {
      const m = error.message || "";
      const msg = m.includes("invalid slot") ? "Data ou horário inválido."
        : m.includes("invalid therapist") ? "Fisioterapeuta inválido para esta clínica."
        : m.includes("invalid service") ? "Serviço inválido."
        : m.includes("already decided") ? "Esta solicitação já foi decidida."
        : m.includes("forbidden") ? "Você não tem permissão para aprovar."
        : "Não foi possível aprovar.";
      toast.error(msg); return;
    }
    void notifyAppointmentRequest(target.id);
    window.dispatchEvent(new CustomEvent("alivia:appointments-changed"));
    toast.success("Agendamento confirmado e incluído na agenda.");
    setTarget(null);
    void load();
  };

  const dismiss = async (r: AppointmentRequest) => {
    const { error } = await supabase.rpc("dismiss_appointment_request" as any, { _request_id: r.id });
    if (error) toast.error("Não foi possível recusar."); else { toast.success("Solicitação recusada (o paciente não é notificado)."); void load(); }
  };

  if (items.length === 0) return null;

  return (
    <>
      <Card className="border-primary/40">
        <CardContent className="py-3 space-y-3">
          <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => setExpanded((v) => !v)}>
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm flex-1">Solicitações de agendamento</span>
            <Badge>{items.length}</Badge>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded && (
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {items.map((r) => {
                const wa = whatsappLink(r);
                return (
                  <div key={r.id} className="rounded-xl border p-3 space-y-2">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-sm">{r.patient_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatBrDate(r.requested_date)} · {r.requested_time || (r.requested_period ? PERIOD_LABEL[r.requested_period] : "")}
                      </span>
                    </div>
                    <p className="text-sm min-w-0 break-words">
                      <span className="text-muted-foreground">Serviço solicitado: </span>
                      <span className="font-medium">{r.service_name || (r.service_id ? "Serviço indisponível no catálogo" : "Não informado")}</span>
                    </p>
                    {r.notes && <p className="text-xs text-muted-foreground">“{r.notes}”</p>}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" className="gap-1" onClick={() => openApprove(r)}><Check className="h-4 w-4" />Aprovar</Button>
                      {wa && (
                        <Button type="button" size="sm" variant="outline" className="gap-1" asChild>
                          <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a>
                        </Button>
                      )}
                      <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={() => dismiss(r)}><X className="h-4 w-4" />Recusar</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar agendamento</DialogTitle>
            <DialogDescription>{target?.patient_name} — ajuste se necessário antes de confirmar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm min-w-0 break-words">
              <span className="text-muted-foreground">Serviço solicitado pelo paciente: </span>
              <span className="font-medium">{target?.service_name || (target?.service_id ? "Serviço indisponível no catálogo" : "Não informado")}</span>
            </p>
            <div className="space-y-1.5 min-w-0"><Label>Data</Label><Input type="date" className="w-full min-w-0" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0"><Label>Horário</Label><Input type="time" className="w-full min-w-0" value={time} onChange={(e) => setTime(e.target.value)} /></div>
              <div className="space-y-1.5 min-w-0"><Label>Minutos</Label><Input type="number" inputMode="numeric" className="w-full min-w-0" min={10} max={240} value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
            </div>
            {clinicId && (
              <div className="space-y-1.5">
                <Label>Fisioterapeuta</Label>
                <Select value={therapistId} onValueChange={setTherapistId}>
                  <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>{therapists.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {(services.length > 0 || target?.service_id) && (
              <div className="space-y-1.5">
                <Label>Serviço</Label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem serviço (preço padrão)</SelectItem>
                    {target?.service_id && !services.some((service) => service.id === target.service_id) && (
                      <SelectItem value={target.service_id} disabled>{target.service_name || "Serviço indisponível"} (inativo)</SelectItem>
                    )}
                    {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {overlaps.length > 0 && (
              <div role="alert" className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm space-y-1.5">
                <p className="font-medium text-foreground">
                  Atenção: já {overlaps.length === 1 ? "existe 1 agendamento que se sobrepõe" : `existem ${overlaps.length} agendamentos que se sobrepõem`} a este horário{clinicId && !therapistId ? " na clínica" : ""}.
                </p>
                <ul className="space-y-1">
                  {overlaps.map((o, i) => (
                    <li key={o.slot.id || i} className="flex flex-wrap justify-between gap-2 text-muted-foreground">
                      <span className="min-w-0 break-words">{fmtMinutes(o.start)}–{fmtMinutes(o.end)} · {o.slot.patient_name?.trim() || (o.slot.service_type === "compromisso" ? "Compromisso" : "Paciente")}{o.slot.service_type ? ` (${o.slot.service_type})` : ""}</span>
                      <span className="text-xs">sobrepõe {o.overlapMin} min</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">Você ainda pode confirmar, ajustar o horário ou recusar.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={approve} disabled={busy || !date || !time}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Confirmar e agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppointmentRequestsPanel;
