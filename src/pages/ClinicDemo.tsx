import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import logoAlivia from "@/assets/logo-alivia.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Building2, Calendar as CalendarIcon, Stethoscope, Users, MessageCircle, Crown,
  Link2, Copy, Check, MapPin, Video, ExternalLink, ChevronLeft, ChevronRight,
  Plus, User, Sparkles, ArrowLeft, GripVertical, Activity, HelpCircle, LogOut,
  Settings, UserPlus, Palette, Image as ImageIcon, BarChart3, Brain,
} from "lucide-react";
import { format, addDays, startOfWeek, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DEMO_CLINIC, DEMO_TEAM, DEMO_APPOINTMENTS, DEMO_CLINIC_ASSESSMENTS,
} from "@/data/mockClinicData";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import DemoUpsellBanner from "@/components/demo/DemoUpsellBanner";
import DemoInsightsMock from "@/components/demo/DemoInsightsMock";
import DemoMessagesMock from "@/components/demo/DemoMessagesMock";
import DemoManagementMock from "@/components/demo/DemoManagementMock";
import DemoFeedbackMock from "@/components/demo/DemoFeedbackMock";
import DemoDailySummaryMock from "@/components/demo/DemoDailySummaryMock";
import DemoClinicalAgentMock from "@/components/demo/DemoClinicalAgentMock";
import PatientEvolutionDashboard from "@/components/dashboard/PatientEvolutionDashboard";
import { mockPatientAssessments } from "@/data/mockPatientData";
import ExportDataCard from "@/components/dashboard/ExportDataCard";
import ImportDataCard from "@/components/dashboard/ImportDataCard";
import { clinicDemoTabs, scopeDemoRows, DEMO_THERAPIST_ID, DEMO_ROLE_LABELS, DEMO_TEAM_ROLE_LABELS, type ClinicDemoRole } from "@/lib/clinicDemoViews";

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

const ClinicDemo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("agenda");
  const [viewerRole, setViewerRole] = useState<ClinicDemoRole>("owner");
  const allowedTabs = clinicDemoTabs(viewerRole);
  const changeRole = (role: ClinicDemoRole) => {
    setViewerRole(role);
    setFilterTherapist("all");
    setSelectedApt(null);
    if (!clinicDemoTabs(role).includes(activeTab)) setActiveTab("agenda");
  };
  const [clinicSubTab, setClinicSubTab] = useState("team");
  const [appointments, setAppointments] = useState(DEMO_APPOINTMENTS);
  const [assessments, setAssessments] = useState(DEMO_CLINIC_ASSESSMENTS);
  const [selectedApt, setSelectedApt] = useState<(typeof DEMO_APPOINTMENTS)[0] | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [filterTherapist, setFilterTherapist] = useState<string>("all");

  // Schedule
  const daysToShow = isMobile ? 3 : 7;
  const [viewDate, setViewDate] = useState(() => new Date());
  const startDate = isMobile ? viewDate : startOfWeek(viewDate, { weekStartsOn: 1 });
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));

  const visibleApts = useMemo(() => {
    const rangeStart = format(days[0], "yyyy-MM-dd");
    const rangeEnd = format(days[days.length - 1], "yyyy-MM-dd");
    return scopeDemoRows(appointments, viewerRole).filter(a => a.appointment_date >= rangeStart && a.appointment_date <= rangeEnd);
  }, [appointments, days, viewerRole]);

  const timeSlots = getTimeSlots(visibleApts);
  const therapists = DEMO_TEAM.filter(t => t.role === "owner" || t.role === "therapist" || t.role === "osteopath");

  // Drag and drop
  const [draggedApt, setDraggedApt] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; hour: string } | null>(null);

  const handleDrop = useCallback((date: string, hour: string) => {
    if (!draggedApt) return;
    setAppointments(prev => prev.map(a =>
      a.id === draggedApt ? { ...a, appointment_date: date, appointment_time: hour + ":00" } : a
    ));
    toast({ title: "Agendamento movido", description: `Reagendado para ${format(new Date(date), "dd/MM")} às ${hour}h` });
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

  const filteredApts = useMemo(() => {
    if (filterTherapist === "all") return visibleApts;
    return visibleApts.filter(a => a.professional_id === filterTherapist);
  }, [visibleApts, filterTherapist]);

  const filteredAssessments = useMemo(() => {
    const scoped = scopeDemoRows(assessments, viewerRole);
    if (filterTherapist === "all") return scoped;
    return scoped.filter(a => a.professional_id === filterTherapist || !a.professional_id);
  }, [assessments, filterTherapist, viewerRole]);
  const recordAssessments = useMemo(() => {
    const owners = ["demo-pro-owner", DEMO_THERAPIST_ID, "demo-pro-t2"];
    const emails = Array.from(new Set(mockPatientAssessments.map(a => a.patient_email)));
    const rows = mockPatientAssessments.map(a => ({ ...a, professional_id: owners[emails.indexOf(a.patient_email) % owners.length] }));
    return scopeDemoRows(rows, viewerRole).filter(a => filterTherapist === "all" || a.professional_id === filterTherapist);
  }, [viewerRole, filterTherapist]);
  const assignAssessment = (id: string, professionalId: string | null) => {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, professional_id: professionalId } : a));
    toast({ title: "Avaliação atribuída", description: getProName(professionalId) });
  };

  const getProName = (proId: string | null) => {
    if (!proId) return "Não atribuído";
    return therapists.find(t => t.id === proId)?.full_name || "—";
  };

  const demoToast = (msg: string) => toast({ title: "Modo demo", description: msg });

  return (
    <div className="min-h-screen bg-background">
      {/* Header — mirrors Dashboard.tsx clinic header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/clinica")} className="flex items-center gap-2">
              <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
              <span className="text-xl font-bold text-foreground">Aliv.iA</span>
            </button>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300/40 text-[10px] gap-1">
              Demo Clínica
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/clinica/suporte")} className="hidden md:inline-flex" aria-label="Suporte da clínica">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/clinica")} className="gap-1.5 rounded-xl">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair do demo</span>
            </Button>
            <Button size="sm" onClick={() => navigate("/clinica#planos")} className="gap-1.5 rounded-xl">
              <Crown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Iniciar trial grátis</span>
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("container py-6 px-4 space-y-6", activeTab === "agenda" || activeTab === "clinic" ? "max-w-7xl" : "max-w-5xl")}>
        {/* WelcomeSection-like header */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="py-4 px-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                  {DEMO_CLINIC.name}
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300/40 text-[10px]">Ativo</Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">Plano Médio · 8 membros</Badge>
                </p>
                <p className="text-xs text-muted-foreground">{DEMO_CLINIC.address} · {DEMO_TEAM.length} membros</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span id="demo-role-label" className="text-xs text-muted-foreground">Visualizar como</span>
              <Select value={viewerRole} onValueChange={value => changeRole(value as ClinicDemoRole)}>
                <SelectTrigger aria-labelledby="demo-role-label" className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(DEMO_ROLE_LABELS).map(([role, label]) => <SelectItem key={role} value={role}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full flex">
            <TabsTrigger value="agenda" aria-label="Agenda" className="flex-1 gap-1.5 text-xs">
              <CalendarIcon className="h-4 w-4" /><span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            {allowedTabs.includes("patients") && <TabsTrigger value="patients" aria-label="Pacientes" className="flex-1 gap-1.5 text-xs">
              <Stethoscope className="h-4 w-4" /><span className="hidden sm:inline">Pacientes</span>
            </TabsTrigger>}
            {allowedTabs.includes("reception") && <TabsTrigger value="reception" className="flex-1 gap-1.5 text-xs"><Users className="h-4 w-4" />Recepção</TabsTrigger>}
            {allowedTabs.includes("insights") && <TabsTrigger value="insights" aria-label="Insights" className="flex-1 gap-1.5 text-xs">
              <Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Insights</span>
            </TabsTrigger>}
            {allowedTabs.includes("messages") && <TabsTrigger value="messages" aria-label="Mensagens" className="flex-1 gap-1.5 text-xs">
              <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">Mensagens</span>
            </TabsTrigger>}
            {allowedTabs.includes("agente") && <TabsTrigger value="agente" aria-label="Agente" className="flex-1 gap-1.5 text-xs">
              <Brain className="h-4 w-4" /><span className="hidden sm:inline">Agente</span>
            </TabsTrigger>}
            {allowedTabs.includes("clinic") && <TabsTrigger value="clinic" aria-label="Clínica" className="flex-1 gap-1.5 text-xs">
              <Building2 className="h-4 w-4" /><span className="hidden sm:inline">Clínica</span>
            </TabsTrigger>}
          </TabsList>

          {/* ─── Agenda ─── */}
          <TabsContent value="agenda" className="space-y-5">
            <DemoUpsellBanner section="agenda" />
            {viewerRole !== "secretary" && <DemoDailySummaryMock professionalId={viewerRole === "therapist" ? DEMO_THERAPIST_ID : undefined} />}

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
              {viewerRole !== "therapist" && <Select value={filterTherapist} onValueChange={setFilterTherapist}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Todos os profissionais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {therapists.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>}
              <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => demoToast("No modo real, você criaria um novo agendamento aqui.")}>
                <Plus className="h-3.5 w-3.5" />
                Novo
              </Button>
            </div>

            <Card>
              <ScrollArea className="w-full">
                <div style={{ minWidth: `${60 + daysToShow * 110}px` }}>
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

          {/* ─── Pacientes ─── */}
          {allowedTabs.includes("patients") && <TabsContent value="patients" className="space-y-5">
            <DemoUpsellBanner section="patients" />

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Pool de avaliações
              </h2>
              {viewerRole !== "therapist" && <Select value={filterTherapist} onValueChange={setFilterTherapist}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {therapists.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>}
            </div>

            {filteredAssessments.filter(a => !a.professional_id).length > 0 && (
              <Card className="border-amber-300/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                    <UserPlus className="h-4 w-4" />
                    Aguardando atribuição
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredAssessments.filter(a => !a.professional_id).map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-300/30 bg-amber-500/5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{a.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{a.patient_email}</p>
                      </div>
                      <Select onValueChange={(v) => assignAssessment(a.id, v)}>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Prontuários completos
                </h3>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  Dados de exemplo
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Clique em qualquer paciente para abrir o prontuário, evolução, anotações e documentos.
              </p>
              <div className="rounded-2xl border border-border/60 bg-card p-3 sm:p-4">
                <PatientEvolutionDashboard
                  key={viewerRole + filterTherapist}
                  assessments={recordAssessments as any}
                  professionalId="demo-clinic-professional"
                  clinicId="demo-clinic"
                  clinicName={DEMO_CLINIC.name}
                  isDemo
                  readOnly
                  lifetimeTreatment
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-foreground">{filteredAssessments.length}</p><p className="text-[10px] text-muted-foreground">Total</p></CardContent></Card>
              <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-primary">{filteredAssessments.filter(a => a.status === "completed").length}</p><p className="text-[10px] text-muted-foreground">Concluídas</p></CardContent></Card>
              <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-accent-foreground">{filteredAssessments.filter(a => !a.professional_id).length}</p><p className="text-[10px] text-muted-foreground">Sem atribuição</p></CardContent></Card>
            </div>
          </TabsContent>}


          {/* ─── Insights ─── */}
          {allowedTabs.includes("insights") && <TabsContent value="insights" className="space-y-5">
            <DemoUpsellBanner section="insights" />
            <DemoInsightsMock variant="clinic" />
            <DemoFeedbackMock />
          </TabsContent>}

          {/* ─── Mensagens ─── */}
          {allowedTabs.includes("messages") && <TabsContent value="messages" className="space-y-5">
            <DemoUpsellBanner section="messages" />
            <DemoMessagesMock />
          </TabsContent>}

          {/* ─── Agente ─── */}
          {allowedTabs.includes("agente") && <TabsContent value="agente" className="space-y-5">
            <DemoUpsellBanner section="agente" />
            <DemoClinicalAgentMock />
          </TabsContent>}


          {/* ─── Clínica (sub-tabs) ─── */}
          {allowedTabs.includes("clinic") && <TabsContent value="clinic" className="space-y-5">
            <DemoUpsellBanner section="clinic" />
            <Tabs value={clinicSubTab} onValueChange={setClinicSubTab} className="space-y-5">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="team" className="gap-1.5 text-xs">
                  <Building2 className="h-4 w-4" /><span className="hidden sm:inline">Equipe & Config</span><span className="sm:hidden">Equipe</span>
                </TabsTrigger>
                <TabsTrigger value="link" className="gap-1.5 text-xs">
                  <Link2 className="h-4 w-4" /><span className="hidden sm:inline">Link da clínica</span><span className="sm:hidden">Link</span>
                </TabsTrigger>
                <TabsTrigger value="management" className="gap-1.5 text-xs">
                  <BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Gestão & KPIs</span><span className="sm:hidden">Gestão</span>
                </TabsTrigger>
              </TabsList>

              {/* Equipe & Configurações */}
              <TabsContent value="team" className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Equipe
                  </h2>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => demoToast("No modo real, convide membros por e-mail.")}>
                    <UserPlus className="h-3.5 w-3.5" /> Adicionar
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
                            <p className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                              {member.full_name}
                              <Badge variant="outline" className={cn("text-[10px] capitalize",
                                member.role === "owner" ? "bg-primary/10 text-primary border-primary/30" :
                                member.role === "secretary" ? "bg-amber-500/10 text-amber-600 border-amber-300/40" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {DEMO_TEAM_ROLE_LABELS[member.role] ?? member.role}
                              </Badge>
                            </p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                            {member.specialties.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {member.specialties.map(s => (
                                  <Badge key={s} variant="outline" className="text-[9px] px-1.5 py-0">{s}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {member.role !== "owner" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => demoToast("Aqui você gerenciaria permissões e horários.")}>
                            <Settings className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Settings + white-label */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-4 w-4 text-primary" /> Configurações da clínica
                    </CardTitle>
                    <CardDescription className="text-xs">Branding white-label, horários, contato</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                    <div className="border-t pt-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <Palette className="h-3.5 w-3.5" /> Identidade visual (white-label)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Cor da marca</label>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-9 w-9 rounded-lg border" style={{ background: DEMO_CLINIC.brand_color }} />
                            <Input value={DEMO_CLINIC.brand_color} readOnly />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Logo</label>
                          <div className="mt-1 flex items-center gap-2 border rounded-lg p-2 bg-muted/30">
                            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-primary" />
                            </div>
                            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => demoToast("Upload de logo white-label estará disponível no plano.")}>
                              Enviar logo
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Sua logo e cor aparecem nos PDFs de avaliação, no link público e no app dos pacientes.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Link */}
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

              {/* Gestão & KPIs */}
              <TabsContent value="management" className="space-y-5">
                <DemoManagementMock />
                <ExportDataCard mode="demo" entityName={DEMO_CLINIC.name} clinicId="demo-clinic" />
                <ImportDataCard mode="demo" entityName={DEMO_CLINIC.name} clinicId="demo-clinic" />
              </TabsContent>
            </Tabs>
          </TabsContent>}
          {viewerRole === "secretary" && <TabsContent value="reception" className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Recepção · Ana Carolina Lima</h2>
            <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => demoToast("Cadastro iniciado no ambiente de demonstração.")}><UserPlus className="h-4 w-4 mr-2" />Cadastrar paciente</Button><Button variant="outline" onClick={copyClinicLink}><Link2 className="h-4 w-4 mr-2" />Link institucional</Button></div>
            <h3 className="text-sm font-medium text-foreground">Distribuição de pacientes</h3>
            {assessments.map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3">
              <div><p className="text-sm font-medium text-foreground">{a.patient_name}</p><p className="text-xs text-muted-foreground">{a.patient_email}</p></div>
              <Select value={a.professional_id ?? "unassigned"} onValueChange={id => assignAssessment(a.id, id === "unassigned" ? null : id)}>
                <SelectTrigger aria-label={`Responsável por ${a.patient_name}`} className="w-[210px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="unassigned">Aguardando atribuição</SelectItem>{therapists.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>)}
          </TabsContent>}
        </Tabs>

        {/* Final CTA */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/10">
          <CardContent className="py-6 text-center space-y-3">
            <Sparkles className="h-8 w-8 text-primary mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Pronto para transformar sua clínica?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Comece seu trial gratuito de 15 dias. Sem cartão de crédito, sem compromisso.
              Cancele a qualquer momento.
            </p>
            <Button onClick={() => navigate("/clinica#planos")} size="lg" className="gap-2 rounded-xl">
              <Crown className="h-4 w-4" /> Iniciar teste gratuito
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Appointment detail dialog */}
      <Dialog open={!!selectedApt} onOpenChange={(o) => !o && setSelectedApt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" /> Detalhes do agendamento
            </DialogTitle>
            <DialogDescription>Visualização demonstrativa</DialogDescription>
          </DialogHeader>
          {selectedApt && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Paciente</label><p className="text-sm font-medium text-foreground">{selectedApt.patient_name}</p></div>
                <div><label className="text-xs text-muted-foreground">Profissional</label><p className="text-sm font-medium text-foreground">{getProName(selectedApt.professional_id)}</p></div>
                <div><label className="text-xs text-muted-foreground">Data</label><p className="text-sm text-foreground">{format(new Date(selectedApt.appointment_date), "dd/MM/yyyy")}</p></div>
                <div><label className="text-xs text-muted-foreground">Horário</label><p className="text-sm text-foreground">{selectedApt.appointment_time.slice(0, 5)} ({selectedApt.duration_minutes}min)</p></div>
                <div><label className="text-xs text-muted-foreground">Tipo</label><Badge variant="outline" className={cn("text-xs", TYPE_COLORS[selectedApt.type])}>{selectedApt.type === "video_call" ? "Teleconsulta" : selectedApt.type === "external" ? "Domiciliar" : "Presencial"}</Badge></div>
                <div><label className="text-xs text-muted-foreground">Status</label><Badge variant="outline" className={cn("text-xs capitalize", STATUS_COLORS[selectedApt.status])}>{selectedApt.status === "scheduled" ? "Agendado" : selectedApt.status === "confirmed" ? "Confirmado" : selectedApt.status === "completed" ? "Realizado" : "Cancelado"}</Badge></div>
              </div>
              {viewerRole !== "secretary" && selectedApt.notes && (
                <div><label className="text-xs text-muted-foreground">Observações</label><p className="text-sm text-foreground mt-0.5">{selectedApt.notes}</p></div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedApt && selectedApt.status === "scheduled" && viewerRole === "secretary" && <Button onClick={() => {
              setAppointments(prev => prev.map(a => a.id === selectedApt.id ? { ...a, status: "confirmed" } : a));
              setSelectedApt({ ...selectedApt, status: "confirmed" });
              toast({ title: "Presença confirmada" });
            }}>Confirmar presença</Button>}
            <Button variant="outline" onClick={() => setSelectedApt(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClinicDemo;
