import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, CalendarCheck, Clock, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { localISODate } from "@/lib/localDate";
import {
  type AppointmentRequest, type RequestPeriod, PERIOD_LABEL, formatBrDate, notifyAppointmentRequest,
} from "@/lib/appointmentRequests";

interface Provider { kind: "clinic" | "professional"; provider_id: string; name: string; logo_url: string | null }

const PatientAppointmentsTab = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [providerKey, setProviderKey] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [period, setPeriod] = useState<RequestPeriod | "">("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [{ data: prov }, { data: reqs }] = await Promise.all([
      supabase.rpc("get_my_care_providers" as any),
      (supabase.from("appointment_requests" as any) as any)
        .select("*").eq("patient_user_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);
    const list = ((prov as Provider[]) || []).filter((p, i, arr) =>
      arr.findIndex((x) => x.kind === p.kind && x.provider_id === p.provider_id) === i);
    setProviders(list);
    if (list.length === 1) setProviderKey(`${list[0].kind}:${list[0].provider_id}`);
    setRequests((reqs as AppointmentRequest[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`my-apt-req-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointment_requests", filter: `patient_user_id=eq.${user.id}` }, () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, load]);

  const providerName = (r: AppointmentRequest) =>
    providers.find((p) => p.provider_id === (r.clinic_id || r.professional_id))?.name || "";

  const submit = async () => {
    const [kind, id] = providerKey.split(":");
    if (!kind || !id || !date) { toast.error("Escolha o local e a data."); return; }
    if (!time && !period) { toast.error("Informe um horário ou turno de preferência."); return; }
    setSaving(true);
    const { data, error } = await supabase.rpc("create_appointment_request" as any, {
      _kind: kind, _provider_id: id, _date: date, _time: time || null, _period: period || null,
      _notes: notes || null, _phone: phone || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("too many") ? "Você já tem 5 solicitações aguardando resposta." : "Não foi possível enviar a solicitação.");
      return;
    }
    if (data) void notifyAppointmentRequest(data as string);
    toast.success("Solicitação enviada! Você será avisado quando for confirmada.");
    setOpen(false); setDate(""); setTime(""); setPeriod(""); setNotes("");
    void load();
  };

  const cancel = async (id: string) => {
    const { error } = await (supabase.from("appointment_requests" as any) as any).update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error("Não foi possível cancelar."); else void load();
  };

  const today = localISODate();
  const pending = requests.filter((r) => r.status === "pending");
  const confirmed = requests.filter((r) => r.status === "approved" && (r.confirmed_date || r.requested_date) >= today);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Meus agendamentos</CardTitle>
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)} disabled={providers.length === 0}>
            <CalendarPlus className="h-4 w-4" /> Solicitar horário
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {providers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Para solicitar horários, seu cadastro precisa estar vinculado a um fisioterapeuta ou clínica que usa o Aliv.iA (com o mesmo e-mail desta conta).
            </p>
          )}
          {confirmed.length === 0 && pending.length === 0 && providers.length > 0 && (
            <p className="text-sm text-muted-foreground">Nenhum agendamento por aqui ainda.</p>
          )}
          {confirmed.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border p-3">
              <CalendarCheck className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{formatBrDate(r.confirmed_date || r.requested_date)} às {r.confirmed_time || r.requested_time}</p>
                <p className="text-xs text-muted-foreground truncate">{providerName(r)}</p>
              </div>
              <Badge>Confirmado</Badge>
            </div>
          ))}
          {pending.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-dashed p-3">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {formatBrDate(r.requested_date)} · {r.requested_time || (r.requested_period ? PERIOD_LABEL[r.requested_period] : "")}
                </p>
                <p className="text-xs text-muted-foreground truncate">{providerName(r)} · aguardando confirmação</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Cancelar solicitação" onClick={() => cancel(r.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Solicitar horário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {providers.length > 1 && (
              <div className="space-y-1.5">
                <Label>Com quem?</Label>
                <Select value={providerKey} onValueChange={setProviderKey}>
                  <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={`${p.kind}:${p.provider_id}`} value={`${p.kind}:${p.provider_id}`}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Horário (opcional)</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ou turno de preferência</Label>
              <div className="flex gap-2">
                {(Object.keys(PERIOD_LABEL) as RequestPeriod[]).map((p) => (
                  <Button key={p} type="button" size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(period === p ? "" : p)}>
                    {PERIOD_LABEL[p]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp para contato</Label>
              <Input inputMode="tel" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} maxLength={500} placeholder="Ex.: prefiro depois das 15h" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Enviar solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientAppointmentsTab;
