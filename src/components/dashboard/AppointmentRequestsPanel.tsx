import { useCallback, useEffect, useState } from "react";
import { Bell, Check, ChevronDown, Loader2, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const scopeReady = !!clinicId || !!professionalId;

  const load = useCallback(async () => {
    if (!scopeReady) return;
    let q = (supabase.from("appointment_requests" as any) as any).select("*").eq("status", "pending");
    q = clinicId ? q.eq("clinic_id", clinicId) : q.eq("professional_id", professionalId).is("clinic_id", null);
    const { data } = await q.order("requested_date", { ascending: true });
    setItems((data as AppointmentRequest[]) || []);
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
    setServiceId("none");
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
            {services.length > 0 && (
              <div className="space-y-1.5">
                <Label>Serviço</Label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem serviço (preço padrão)</SelectItem>
                    {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
