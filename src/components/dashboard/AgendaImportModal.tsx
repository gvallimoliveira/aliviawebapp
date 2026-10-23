import { endTimeFrom, durationBetween } from "@/lib/appointmentTime";
import { expandRecurrence } from "@/lib/appointmentRecurrence";
import { Repeat } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, Loader2, CalendarIcon, Clock, Image as ImageIcon, CheckCircle2, XCircle, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { findBestPatient, looksLikeCommitment, normalizeName } from "@/lib/patientNameMatch";

type RowMode = "link" | "create" | "none";
interface PatientOpt { id: string; full_name: string }

interface ParsedAppointment {
  patient_name: string;
  date: string;
  time: string;
  duration_minutes: number;
  type: string;
  notes: string | null;
  selected?: boolean;
  is_patient?: boolean;
  mode: RowMode;
  patientId?: string;
  suggested?: boolean;
  editedName: string;
}

interface AgendaImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId: string;
  clinicId?: string | null;
  onImported: () => void;
}

const AgendaImportModal = ({ open, onOpenChange, professionalId, clinicId, onImported }: AgendaImportModalProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const lang = language as "pt" | "en" | "es";
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "review" | "importing">("upload");
  const [parsing, setParsing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<ParsedAppointment[]>([]);
  const [importing, setImporting] = useState(false);
  const [patients, setPatients] = useState<PatientOpt[]>([]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: lang === "pt" ? "Selecione uma imagem" : "Select an image", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: lang === "pt" ? "Imagem muito grande (máx 10MB)" : "Image too large (max 10MB)", variant: "destructive" });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    // Convert to base64 and send to AI
    setParsing(true);
    try {
      const base64Reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        base64Reader.onload = () => {
          const result = base64Reader.result as string;
          resolve(result.split(",")[1]);
        };
        base64Reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("parse-schedule-image", {
        body: { imageBase64: base64, mimeType: file.type },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      let pts: PatientOpt[] = [];
      {
        let q = (supabase.from("patients" as any) as any).select("id, full_name");
        q = clinicId ? q.eq("clinic_id", clinicId) : q.eq("professional_id", professionalId);
        const { data: pdata } = await q.order("full_name").limit(2000);
        pts = (pdata || []) as PatientOpt[];
        setPatients(pts);
      }
      const parsed = (data.appointments || []).map((a: any) => {
        const name = String(a.patient_name || "").trim();
        const match = findBestPatient(name, pts);
        const mode: RowMode = a.is_patient === false || (!match && looksLikeCommitment(name))
          ? "none" : match ? "link" : "create";
        const fromEnd = a.end_time ? durationBetween(a.time, a.end_time) : null;
        const duration_minutes = fromEnd ?? (Number(a.duration_minutes) > 0 ? Number(a.duration_minutes) : 50);
        return { ...a, duration_minutes, patient_name: name, selected: true, mode, patientId: match?.id, suggested: !!match, editedName: name };
      });
      if (parsed.length === 0) {
        toast({ title: lang === "pt" ? "Nenhum agendamento encontrado na imagem" : "No appointments found in image" });
      } else {
        setAppointments(parsed);
        setStep("review");
      }
    } catch (err: any) {
      console.error("Parse error:", err);
      toast({ title: lang === "pt" ? "Erro ao processar imagem" : "Error processing image", description: err.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const toggleAppointment = (index: number) => {
    setAppointments((prev) =>
      prev.map((a, i) => (i === index ? { ...a, selected: !a.selected } : a))
    );
  };

  // Mode/patient choice propagates to rows with the same read name.
  const updateRow = (index: number, patch: Partial<ParsedAppointment>) => {
    setAppointments((prev) => {
      const key = normalizeName(prev[index].patient_name);
      const shared: Partial<ParsedAppointment> = {};
      if (patch.mode) shared.mode = patch.mode;
      if (patch.patientId) shared.patientId = patch.patientId;
      return prev.map((a, i) => {
        if (i === index) return { ...a, ...patch, suggested: false };
        if (Object.keys(shared).length && normalizeName(a.patient_name) === key) return { ...a, ...shared, suggested: false };
        return a;
      });
    });
  };

  const [repeatFreq, setRepeatFreq] = useState<"none" | "weekly" | "biweekly">("none");
  const [repeatWeeks, setRepeatWeeks] = useState(8);
  const [repeatCommitments, setRepeatCommitments] = useState(false);

  const handleImport = async () => {
    const selected = appointments.filter((a) => a.selected);
    if (selected.length === 0) return;
    if (selected.some((a) => a.mode === "link" && !a.patientId)) {
      toast({ title: lang === "pt" ? "Escolha o paciente a vincular" : "Choose the patient to link", variant: "destructive" });
      return;
    }

    setImporting(true);
    setStep("importing");

    try {
      // Create each new patient once (grouped by normalized name), skipping exact existing ones.
      const created = new Map<string, string>();
      for (const a of selected.filter((x) => x.mode === "create")) {
        const name = (a.editedName || a.patient_name).trim();
        const key = normalizeName(name);
        if (!key || created.has(key)) continue;
        const existing = patients.find((p) => normalizeName(p.full_name) === key);
        if (existing) { created.set(key, existing.full_name); continue; }
        const patientRow: any = { full_name: name };
        if (clinicId) patientRow.clinic_id = clinicId; else patientRow.professional_id = professionalId;
        const { error: pErr } = await (supabase.from("patients" as any) as any).insert(patientRow);
        if (pErr) throw pErr;
        created.set(key, name);
      }

      const rows = selected.map((a) => {
        const isCommitment = a.mode === "none";
        const name = a.mode === "link"
          ? patients.find((p) => p.id === a.patientId)?.full_name || a.patient_name
          : a.mode === "create"
            ? created.get(normalizeName(a.editedName || a.patient_name)) || a.editedName || a.patient_name
            : a.editedName || a.patient_name;
        return {
          professional_id: professionalId,
          clinic_id: clinicId || null,
          patient_name: name,
          appointment_date: a.date,
          appointment_time: a.time,
          duration_minutes: a.duration_minutes || 50,
          type: a.type || "in_person",
          notes: a.notes ? `[Importado] ${a.notes}` : isCommitment ? "[Compromisso importado]" : "[Importado de outro app]",
          status: "scheduled",
          service_type: isCommitment ? "compromisso" : "fisioterapia",
          external_import_data: { kind: isCommitment ? "commitment" : "patient", read_name: a.patient_name },
        };
      });

      let finalRows: any[] = rows;
      if (repeatFreq !== "none") {
        const seriesByKey = new Map<string, string>();
        finalRows = rows.flatMap((r: any) => {
          if (r.service_type === "compromisso" && !repeatCommitments) return [r];
          const rule = { freq: repeatFreq, count: repeatFreq === "weekly" ? repeatWeeks : Math.ceil(repeatWeeks / 2) } as const;
          const key = `${r.patient_name}|${r.appointment_time}|${r.appointment_date}`;
          const sid = seriesByKey.get(key) || crypto.randomUUID();
          seriesByKey.set(key, sid);
          return expandRecurrence(r.appointment_date, rule).map((d) => ({ ...r, appointment_date: d, series_id: sid, recurrence_rule: rule }));
        });
      }
      const { error } = await supabase.from("professional_appointments").insert(finalRows as any);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("reload-pro-patients"));

      toast({
        title: lang === "pt"
          ? `${selected.length} agendamento(s) importado(s)!`
          : `${selected.length} appointment(s) imported!`,
      });
      onImported();
      handleClose();
    } catch (err: any) {
      console.error("Import error:", err);
      toast({ title: lang === "pt" ? "Erro ao importar" : "Import error", description: err.message, variant: "destructive" });
      setStep("review");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setImagePreview(null);
    setAppointments([]);
    setParsing(false);
    setImporting(false);
    onOpenChange(false);
  };

  const selectedCount = appointments.filter((a) => a.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {lang === "pt" ? "Importar agenda com IA" : "Import schedule with AI"}
          </DialogTitle>
          <DialogDescription>
            {lang === "pt"
              ? "Envie um print/screenshot do seu app de agenda. A IA irá interpretar e copiar os agendamentos."
              : "Upload a screenshot of your scheduling app. AI will interpret and copy the appointments."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="Schedule" className="w-full max-h-64 object-contain bg-muted/30" />
                {parsing && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">
                      {lang === "pt" ? "Analisando com IA..." : "Analyzing with AI..."}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center gap-3 hover:bg-primary/5 transition-colors"
              >
                <ImageIcon className="h-10 w-10 text-primary/40" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {lang === "pt" ? "Clique para selecionar uma imagem" : "Click to select an image"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === "pt" ? "PNG, JPG ou captura de tela" : "PNG, JPG or screenshot"}
                  </p>
                </div>
              </button>
            )}

            {!parsing && imagePreview && (
              <Button variant="outline" className="w-full" onClick={() => { setImagePreview(null); fileRef.current?.click(); }}>
                {lang === "pt" ? "Selecionar outra imagem" : "Select another image"}
              </Button>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {lang === "pt"
                  ? `${appointments.length} agendamento(s) encontrado(s). Selecione os que deseja importar.`
                  : `${appointments.length} appointment(s) found. Select the ones to import.`}
              </p>
              <Badge variant="outline" className="text-xs">
                {selectedCount}/{appointments.length}
              </Badge>
            </div>

            <ScrollArea className="h-80">
              <div className="space-y-2 pr-2">
                {appointments.map((a, i) => (
                  <Card key={i} className={`transition-colors ${a.selected ? "border-primary/30 bg-primary/5" : "opacity-60"}`}>
                    <CardContent className="py-2.5 px-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={a.selected} onCheckedChange={() => toggleAppointment(i)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.patient_name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{a.date}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <input type="time" aria-label={lang === "pt" ? "Início" : "Start"} value={a.time} onChange={(e) => e.target.value && updateRow(i, { time: e.target.value })} className="bg-transparent border border-border rounded px-1 h-6 text-xs" />
                              –
                              <input type="time" aria-label={lang === "pt" ? "Fim" : "End"} value={endTimeFrom(a.time, a.duration_minutes)} onChange={(e) => { const d = durationBetween(a.time, e.target.value); if (d) updateRow(i, { duration_minutes: d }); }} className="bg-transparent border border-border rounded px-1 h-6 text-xs" />
                            </span>
                          </div>
                          {a.notes && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{a.notes}</p>}
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {a.mode === "none" ? "Compromisso" : a.type === "video_call" ? "Vídeo" : a.type === "external" ? "Externo" : "Presencial"}
                        </Badge>
                      </div>
                      {a.selected && (
                        <div className="space-y-1.5 pl-7">
                          <Select value={a.mode} onValueChange={(v) => updateRow(i, { mode: v as RowMode })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="link">Vincular a paciente existente</SelectItem>
                              <SelectItem value="create">Criar novo paciente</SelectItem>
                              <SelectItem value="none">Não é paciente (compromisso)</SelectItem>
                            </SelectContent>
                          </Select>
                          {a.mode === "link" && (
                            <>
                              <Select value={a.patientId || ""} onValueChange={(v) => updateRow(i, { patientId: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Escolha o paciente" /></SelectTrigger>
                                <SelectContent className="max-h-64">
                                  {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              {a.suggested && a.patientId && (
                                <p className="text-[10px] text-primary">Possível: {patients.find((p) => p.id === a.patientId)?.full_name} — confira</p>
                              )}
                            </>
                          )}
                          {a.mode !== "link" && (
                            <Input className="h-8 text-xs" value={a.editedName}
                              onChange={(e) => updateRow(i, { editedName: e.target.value })}
                              placeholder={a.mode === "create" ? "Nome do paciente" : "Descrição do compromisso"} />
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const s = appointments.filter((a) => a.selected);
                return `${s.filter((a) => a.mode === "link").length} vinculado(s) · ${s.filter((a) => a.mode === "create").length} novo(s) · ${s.filter((a) => a.mode === "none").length} compromisso(s)`;
              })()}
            </p>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {lang === "pt" ? `Importando ${selectedCount} agendamento(s)...` : `Importing ${selectedCount} appointment(s)...`}
            </p>
          </div>
        )}

        {step === "review" && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
            <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{lang === "pt" ? "Repetir os selecionados:" : "Repeat selected:"}</span>
            <select value={repeatFreq} onChange={(e) => setRepeatFreq(e.target.value as any)} className="h-8 rounded-md border border-input bg-background px-2">
              <option value="none">{lang === "pt" ? "Não se repete" : "Does not repeat"}</option>
              <option value="weekly">{lang === "pt" ? "Toda semana" : "Every week"}</option>
              <option value="biweekly">{lang === "pt" ? "A cada 2 semanas" : "Every 2 weeks"}</option>
            </select>
            {repeatFreq !== "none" && (
              <>
                <span>{lang === "pt" ? "por" : "for"}</span>
                <input type="number" min={2} max={26} value={repeatWeeks} onChange={(e) => setRepeatWeeks(Math.min(26, Math.max(2, parseInt(e.target.value) || 2)))} className="h-8 w-14 rounded-md border border-input bg-background px-2" />
                <span>{lang === "pt" ? "semanas" : "weeks"}</span>
                <label className="flex items-center gap-1 ml-auto">
                  <input type="checkbox" checked={repeatCommitments} onChange={(e) => setRepeatCommitments(e.target.checked)} className="accent-primary" />
                  {lang === "pt" ? "Incluir compromissos" : "Include commitments"}
                </label>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => { setStep("upload"); setImagePreview(null); }}>
                {lang === "pt" ? "Voltar" : "Back"}
              </Button>
              <Button onClick={handleImport} disabled={selectedCount === 0 || importing} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {lang === "pt" ? `Importar ${selectedCount} selecionado(s)` : `Import ${selectedCount} selected`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgendaImportModal;
