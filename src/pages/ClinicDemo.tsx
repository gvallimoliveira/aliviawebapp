import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import logoAlivia from "@/assets/logo-alivia.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Building2, Calendar as CalendarIcon, Stethoscope, Users, MessageCircle, Crown,
  Link2, Copy, Check, Clock, MapPin, Video, ExternalLink, ChevronLeft, ChevronRight,
  Plus, User, Sparkles, ToggleLeft, Eye, FileText, UserPlus, Settings, ArrowLeft,
  GripVertical, Activity,
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DEMO_CLINIC,
  DEMO_TEAM,
  DEMO_APPOINTMENTS,
  DEMO_CLINIC_ASSESSMENTS,
} from "@/data/mockClinicData";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

// ─── Schedule Demo Component ───
const TYPE_ICONS: Record<string, typeof Video> = {
  video_call: Video,
  in_person: MapPin,
  external: ExternalLink,
};

const TYPE_COLORS: Record<string, string> = {
  video_call: "bg-blue-500/10 text-blue-600 border-blue-200",
  in_person: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  external: "bg-amber-500/10 text-amber-600 border-amber-200",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-600 border-blue-200",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 20;

function getTimeSlots(apts: typeof DEMO_APPOINTMENTS): string[] {
  let minH = DEFAULT_START_HOUR;
  let maxH = DEFAULT_END_HOUR;
  for (const a of apts) {
    const h = parseInt(a.appointment_time.slice(0, 2), 10);
    if (h < minH) minH = h;
    const endH = h + Math.ceil(a.duration_minutes / 60);
    if (endH > maxH) maxH = endH;
  }
  const slots: string[] = [];
  for (let h = minH; h <= maxH; h++) slots.push(`${String(h).padStart(2, "0")}:00`);
  return slots;
}

// ─── Main Demo Page ───
const ClinicDemo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("agenda");
  const [appointments, setAppointments] = useState(DEMO_APPOINTMENTS);
  const [assessments] = useState(DEMO_CLINIC_ASSESSMENTS);
  const [selectedApt, setSelectedApt] = useState<(typeof DEMO_APPOINTMENTS)[0] | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Schedule state
  const daysToShow = isMobile ? 3 : 7;
  const [viewDate, setViewDate] = useState(() => new Date());
  const startDate = isMobile ? viewDate : startOfWeek(viewDate, { weekStartsOn: 1 });
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));

  const visibleApts = useMemo(() => {
    const rangeStart = format(days[0], "yyyy-MM-dd");
    const rangeEnd = format(days[days.length - 1], "yyyy-MM-dd");
    return appointments.filter(a => a.appointment_date >= rangeStart && a.appointment_date <= rangeEnd);
  }, [appointments, days]);

  const timeSlots = getTimeSlots(visibleApts);

  // Drag state
  const [draggedApt, setDraggedApt] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; hour: string } | null>(null);

  const handleDrop = useCallback((date: string, hour: string) => {
    if (!draggedApt) return;
    setAppointments(prev => prev.map(a =>
      a.id === draggedApt ? { ...a, appointment_date: date, appointment_time: hour + ":00" } : a
    ));
    toast({ title: "📋 Agendamento movido", description: `Reagendado para ${format(new Date(date), "dd/MM")} às ${hour}h` });
    setDraggedApt(null);
    setDropTarget(null);
  }, [draggedApt, toast]);

  const copyClinicLink = () => {
    const link = `${getPublicOrigin()}/assessment/clinic/${DEMO_CLINIC.id}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setLinkCopied(true);
    toast({ title: "Link copiado!" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Filter for selected therapist in secretary view
  const [filterTherapist, setFilterTherapist] = useState<string>("all");
  const therapists = DEMO_TEAM.filter(t => t.role === "owner" || t.role === "therapist");

  const filteredApts = useMemo(() => {
    if (filterTherapist === "all") return visibleApts;
    return visibleApts.filter(a => a.professional_id === filterTherapist);
  }, [visibleApts, filterTherapist]);

  const filteredAssessments = useMemo(() => {
    if (filterTherapist === "all") return assessments;
    return assessments.filter(a => a.professional_id === filterTherapist || !a.professional_id);
  }, [assessments, filterTherapist]);

  const getProName = (proId: string | null) => {
    if (!proId) return "Não atribuído";
    return therapists.find(t => t.id === proId)?.full_name || "—";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/clinica")} className="flex items-center gap-2">
              <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
              <span className="text-xl font-bold text-foreground">Aliv.iA</span>
            </button>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px] gap-1">
              <ToggleLeft className="h-3 w-3" />
              Demo
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/clinica")} className="gap-1.5 rounded-xl">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <Button size="sm" onClick={() => navigate("/clinica#planos")} className="gap-1.5 rounded-xl">
              <Crown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Assinar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl py-6 px-4 space-y-6">
        {/* Demo banner */}
        <Card className="border-amber-200 bg-amber-500/5">
          <CardContent className="py-3 px-5 flex items-center gap-3">
            <ToggleLeft className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Modo demonstração.</span> Explore todas as funcionalidades do Aliv.iA Clinic com dados fictícios interativos. Mova cards na agenda, abra avaliações e veja como funciona a gestão de equipe.
            </p>
          </CardContent>
        </Card>

        {/* Clinic status bar */}
        <Card className="border-emerald-200 bg-emerald-500/5">
          <CardContent className="py-4 px-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  {DEMO_CLINIC.name}
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                    Ativo
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">{DEMO_CLINIC.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {DEMO_TEAM.length} membros
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="agenda" className="gap-1.5 text-xs">
              <CalendarIcon className="h-4 w-4" /><span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="patients" className="gap-1.5 text-xs">
              <Stethoscope className="h-4 w-4" /><span className="hidden sm:inline">Pacientes</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 text-xs">
              <Users className="h-4 w-4" /><span className="hidden sm:inline">Equipe</span>
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-1.5 text-xs">
              <Link2 className="h-4 w-4" /><span className="hidden sm:inline">Link</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5 text-xs">
              <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">Mensagens</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── Agenda ─── */}
          <TabsContent value="agenda" className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewDate(d => addDays(d, -daysToShow))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setViewDate(new Date())}>Hoje</Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewDate(d => addDays(d, daysToShow))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Select value={filterTherapist} onValueChange={setFilterTherapist}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Todos os profissionais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {therapists.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => toast({ title: "📋 Demo", description: "No modo real, aqui você criaria um novo agendamento." })}>
                <Plus className="h-3.5 w-3.5" />
                Novo
              </Button>
            </div>

            {/* Schedule grid */}
            <Card>
              <ScrollArea className="w-full">
                <div style={{ minWidth: `${60 + daysToShow * 110}px` }}>
                  {/* Days header */}
                  <div className="grid border-b border-border/60 sticky top-0 bg-background z-10" style={{ gridTemplateColumns: `60px repeat(${daysToShow}, 1fr)` }}>
                    <div className="p-2 text-[10px] text-muted-foreground border-r border-border/40" />
                    {days.map(day => (
                      <div key={day.toISOString()} className={cn(
                        "p-2 text-center border-r border-border/40 last:border-r-0",
                        isToday(day) && "bg-primary/5"
                      )}>
                        <p className="text-[10px] uppercase text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</p>
                        <p className={cn("text-sm font-semibold", isToday(day) ? "text-primary" : "text-foreground")}>
                          {format(day, "dd")}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Time rows */}
                  {timeSlots.map(slot => {
                    const hour = slot.slice(0, 2);
                    return (
                      <div key={slot} className="grid border-b border-border/30" style={{ gridTemplateColumns: `60px repeat(${daysToShow}, 1fr)` }}>
                        <div className="p-1.5 text-[10px] text-muted-foreground border-r border-border/40 flex items-start justify-end pr-2 pt-1">
                          {slot}
                        </div>
                        {days.map(day => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const slotApts = filteredApts.filter(a => a.appointment_date === dateStr && a.appointment_time.startsWith(hour));
                          const isDropping = dropTarget?.date === dateStr && dropTarget?.hour === hour;
                          return (
                            <div
                              key={dateStr}
                              className={cn(
                                "p-0.5 min-h-[52px] border-r border-border/40 last:border-r-0 transition-colors overflow-hidden min-w-0",
                                isToday(day) && "bg-primary/[0.02]",
                                isDropping && "bg-primary/10 ring-1 ring-primary/30 rounded"
                              )}
                              onDragOver={(e) => { e.preventDefault(); setDropTarget({ date: dateStr, hour }); }}
                              onDragLeave={() => setDropTarget(null)}
                              onDrop={(e) => { e.preventDefault(); handleDrop(dateStr, hour); }}
                            >
                              <div className={cn("flex gap-0.5 w-full min-w-0", slotApts.length > 1 ? "flex-row" : "flex-col")}>
                                {slotApts.map(apt => {
                                  const Icon = TYPE_ICONS[apt.type] || MapPin;
                                  const colorClass = TYPE_COLORS[apt.type] || TYPE_COLORS.in_person;
                                  const proName = getProName(apt.professional_id);
                                  return (
                                    <div
                                      key={apt.id}
                                      draggable
                                      onDragStart={() => setDraggedApt(apt.id)}
                                      onDragEnd={() => { setDraggedApt(null); setDropTarget(null); }}
                                      onClick={() => setSelectedApt(apt)}
                                      className={cn(
                                        "p-1.5 rounded-md border cursor-pointer hover:shadow-sm transition-all text-left group overflow-hidden",
                                        colorClass,
                                        slotApts.length > 1 ? "flex-1 min-w-0" : "w-full min-w-0",
                                        draggedApt === apt.id && "opacity-50"
                                      )}
                                    >
                                      <div className="flex items-center gap-1 mb-0.5 min-w-0">
                                        <GripVertical className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 shrink-0 cursor-grab" />
                                        <span className="text-[10px] font-semibold tabular-nums shrink-0">{apt.appointment_time.slice(0, 5)}</span>
                                        <Icon className="h-2.5 w-2.5 shrink-0" />
                                      </div>
                                      <p className="text-[10px] font-medium truncate">{apt.patient_name}</p>
                                      <p className="text-[9px] opacity-70 truncate">{proName}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* ─── Patients ─── */}
          <TabsContent value="patients" className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Avaliações da clínica
              </h2>
              <Select value={filterTherapist} onValueChange={setFilterTherapist}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {therapists.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unassigned assessments */}
            {filteredAssessments.filter(a => !a.professional_id).length > 0 && (
              <Card className="border-amber-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                    <UserPlus className="h-4 w-4" />
                    Aguardando atribuição
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredAssessments.filter(a => !a.professional_id).map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-200/50 bg-amber-500/5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{a.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{a.patient_email}</p>
                      </div>
                      <Select onValueChange={(v) => toast({ title: "📋 Demo", description: `Avaliação atribuída a ${getProName(v)}` })}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue placeholder="Atribuir a..." />
                        </SelectTrigger>
                        <SelectContent>
                          {therapists.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Assessment cards */}
            <div className="space-y-3">
              {filteredAssessments.filter(a => a.professional_id).map(a => (
                <Card key={a.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => toast({ title: "📋 Demo", description: "No modo real, aqui abriria o prontuário do paciente com todos os detalhes." })}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{a.patient_name}</p>
                          <Badge variant="outline" className={cn("text-[10px]", a.status === "completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-blue-500/10 text-blue-600 border-blue-200")}>
                            {a.status === "completed" ? "Concluída" : "Em andamento"}
                          </Badge>
                          {a.diagnosis && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                              Diagnóstico IA
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getProName(a.professional_id)} • {format(new Date(a.created_at), "dd/MM/yyyy")}
                        </p>
                        {a.diagnosis && (
                          <p className="text-xs text-foreground/80 mt-1 truncate">
                            {a.diagnosis.hypothesis}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {a.pain_score && (
                          <div className="text-center px-2">
                            <p className="text-lg font-bold text-foreground">{a.pain_score}</p>
                            <p className="text-[9px] text-muted-foreground">NRS</p>
                          </div>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{assessments.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-primary">{assessments.filter(a => a.status === "completed").length}</p>
                  <p className="text-[10px] text-muted-foreground">Concluídas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{assessments.filter(a => !a.professional_id).length}</p>
                  <p className="text-[10px] text-muted-foreground">Sem atribuição</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Team ─── */}
          <TabsContent value="team" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Equipe
              </h2>
              <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => toast({ title: "📋 Demo", description: "No modo real, aqui você adicionaria novos membros à equipe." })}>
                <UserPlus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>

            <div className="space-y-3">
              {DEMO_TEAM.map(member => (
                <Card key={member.id}>
                  <CardContent className="py-4 px-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          {member.full_name}
                          <Badge variant="outline" className={cn("text-[10px] capitalize",
                            member.role === "owner" ? "bg-primary/10 text-primary border-primary/20" :
                            member.role === "secretary" ? "bg-amber-500/10 text-amber-600 border-amber-200" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {member.role === "owner" ? "Proprietário" : member.role === "secretary" ? "Secretária" : "Fisioterapeuta"}
                          </Badge>
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                        {member.specialties.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {member.specialties.map(s => (
                              <Badge key={s} variant="outline" className="text-[9px] px-1.5 py-0">{s}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {member.role !== "owner" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast({ title: "📋 Demo", description: "No modo real, aqui você gerenciaria o membro." })}>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Clinic settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  Configurações da clínica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Nome</label>
                    <Input value={DEMO_CLINIC.name} readOnly className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">WhatsApp</label>
                    <Input value={DEMO_CLINIC.phone || ""} readOnly className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground">Endereço</label>
                    <Input value={DEMO_CLINIC.address || ""} readOnly className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Link ─── */}
          <TabsContent value="link" className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  Link de pré-avaliação da clínica
                </CardTitle>
                <CardDescription className="text-sm">
                  Compartilhe este link com seus pacientes. As avaliações entram em um pool compartilhado da clínica e podem ser atribuídas a qualquer fisioterapeuta da equipe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-muted/60 px-3 py-2.5 rounded-lg text-muted-foreground truncate">
                    {getPublicOrigin()}/assessment/clinic/{DEMO_CLINIC.id}
                  </code>
                  <Button onClick={copyClinicLink} variant="outline" className="gap-1.5 rounded-xl shrink-0">
                    {linkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    {linkCopied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-5 space-y-3">
                <h3 className="font-semibold text-foreground text-sm">Como funciona</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {[
                    "Paciente acessa o link e preenche a avaliação",
                    "A avaliação aparece no pool da clínica como 'Sem atribuição'",
                    "Secretária ou proprietário atribui a um fisioterapeuta",
                    "O diagnóstico IA é gerado automaticamente ao completar",
                    "O plano de tratamento é gratuito (incluso na assinatura)",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Messages ─── */}
          <TabsContent value="messages" className="space-y-4">
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-foreground mb-1">Mensagens da clínica</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  No modo real, aqui você veria as conversas com pacientes da clínica. As mensagens são compartilhadas entre os membros da equipe.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA bottom */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10">
          <CardContent className="py-6 text-center space-y-3">
            <Sparkles className="h-8 w-8 text-primary mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Gostou do que viu?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Comece seu teste gratuito de 15 dias. Sem cartão de crédito, sem compromisso.
            </p>
            <Button onClick={() => navigate("/clinica#planos")} size="lg" className="gap-2 rounded-xl">
              <Crown className="h-4 w-4" />
              Iniciar teste gratuito
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Appointment detail modal */}
      <Dialog open={!!selectedApt} onOpenChange={(o) => !o && setSelectedApt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Detalhes do agendamento
            </DialogTitle>
            <DialogDescription>Visualização demonstrativa</DialogDescription>
          </DialogHeader>
          {selectedApt && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Paciente</label>
                  <p className="text-sm font-medium text-foreground">{selectedApt.patient_name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Profissional</label>
                  <p className="text-sm font-medium text-foreground">{getProName(selectedApt.professional_id)}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Data</label>
                  <p className="text-sm text-foreground">{format(new Date(selectedApt.appointment_date), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Horário</label>
                  <p className="text-sm text-foreground">{selectedApt.appointment_time.slice(0, 5)} ({selectedApt.duration_minutes}min)</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[selectedApt.type])}>
                    {selectedApt.type === "video_call" ? "Teleconsulta" : selectedApt.type === "external" ? "Domiciliar" : "Presencial"}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Badge variant="outline" className={cn("text-xs capitalize", STATUS_COLORS[selectedApt.status])}>
                    {selectedApt.status === "scheduled" ? "Agendado" : selectedApt.status === "completed" ? "Realizado" : "Cancelado"}
                  </Badge>
                </div>
              </div>
              {selectedApt.notes && (
                <div>
                  <label className="text-xs text-muted-foreground">Observações</label>
                  <p className="text-sm text-foreground mt-0.5">{selectedApt.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedApt(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClinicDemo;
