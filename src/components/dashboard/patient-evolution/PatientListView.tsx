import { useState } from "react";
import { Activity, ArrowDownAZ, ArrowDownWideNarrow, Archive, ArchiveRestore, Calendar, ChevronRight, Download, Dumbbell, Eye, EyeOff, FileCheck, FilePlus, Link2, Loader2, Lock, Mail, NotebookPen, Pencil, Plus, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import AddPatientModal from "../AddPatientModal";
import ManualAssessmentModal from "../ManualAssessmentModal";

export default function PatientListView(props: any) {
  const {
    t,
    language,
    patients,
    hiddenKeys,
    showHidden,
    setShowHidden,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    readOnly,
    canAddPatient,
    allowManualAssessment,
    allowAssessmentLink,
    allowQuickNote,
    setEditPatientData,
    setAddPatientOpen,
    batchExporting,
    handleBatchExport,
    assessments,
    exerciseAdherence,
    handleAcquireBadgeClick,
    longPressFiredRef,
    longPressTimerRef,
    setLongPressPatient,
    setSelectedEmail,
    handleRestorePatient,
    handleArchivePatient,
    archiving,
    ensurePatientAssessmentToken,
    buildPersonalizedAssessmentLink,
    professionalId,
    clinicId,
    toast,
    setQuickNotePatient,
    setQuickNoteContent,
    addPatientOpen,
    setAddPatientOpenState,
    editPatientData,
    manualAssessmentTarget,
    setManualAssessmentTarget,
    quickNotePatient,
    setQuickNotePatientState,
    quickNoteContent,
    setQuickNoteContentState,
    handleQuickNoteSave,
    quickNoteSaving,
    longPressPatient,
    setLongPressPatientState,
    deleteConfirmPatient,
    setDeleteConfirmPatient,
    deletingPatient,
    handleDeletePatient,
    isDemo,
  } = props;

  // Default to the most recently attended patients: the daily routine opens the
  // record of whoever came last, so alphabetical order is the opt-in view.
  const [sortMode, setSortMode] = useState<"alpha" | "recent">("recent");

  return (
    <div className="space-y-3">
      <div className="mb-2 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t("pro.patients_title")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("pro.patients_desc")}</p>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => { setEditPatientData(null); setAddPatientOpen(true); }}>
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("pro.add_patient")}</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" disabled={batchExporting} onClick={() => handleBatchExport(assessments)}>
                {batchExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{t("pro.export_pdfs")}</span>
              </Button>
            </div>
          )}
          {readOnly && canAddPatient && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => { setEditPatientData(null); setAddPatientOpen(true); }}>
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("pro.add_patient")}</span>
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === "pt" ? "Buscar por nome, email, CPF ou telefone..." : "Search by name, email, CPF or phone..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {hiddenKeys.size > 0 && (
            <Button variant={showHidden ? "secondary" : "outline"} size="sm" className="gap-1.5 shrink-0 text-xs" onClick={() => setShowHidden(!showHidden)}>
              {showHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showHidden ? "Ocultar arquivados" : `Arquivados (${hiddenKeys.size})`}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "active", "inactive"] as const).map((status) => (
            <Button key={status} variant={statusFilter === status ? "default" : "outline"} size="sm" className="text-xs rounded-xl h-7" onClick={() => setStatusFilter(status)}>
              {status === "all" ? (language === "pt" ? "Todos" : "All") : status === "active" ? (language === "pt" ? "Ativos" : "Active") : (language === "pt" ? "Inativos (30d+)" : "Inactive (30d+)")}
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant={sortMode === "alpha" ? "default" : "outline"}
              size="sm"
              className="text-xs rounded-xl h-7 gap-1"
              onClick={() => setSortMode("alpha")}
              title={language === "pt" ? "Ordem alfabética" : language === "es" ? "Orden alfabético" : "Alphabetical"}
            >
              <ArrowDownAZ className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">A-Z</span>
            </Button>
            <Button
              variant={sortMode === "recent" ? "default" : "outline"}
              size="sm"
              className="text-xs rounded-xl h-7 gap-1"
              onClick={() => setSortMode("recent")}
              title={language === "pt" ? "Avaliação mais recente" : language === "es" ? "Evaluación más reciente" : "Most recent assessment"}
            >
              <ArrowDownWideNarrow className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{language === "pt" ? "Recentes" : language === "es" ? "Recientes" : "Recent"}</span>
            </Button>
          </div>
        </div>
      </div>

      {(() => {
        const isPlaceholderAssessment = (a: any) => {
          const ad = a?.anamnesis_data;
          if (!ad || typeof ad !== "object") return false;
          const flagged = !!(ad.externalPatient || ad.quickEvolutionOnly || ad.placeholder);
          if (!flagged) return false;
          // A record flagged as placeholder but that already carries real clinical
          // content (diagnosis, pain data, questionnaires, strength table…) must NOT
          // be hidden — otherwise it becomes an unreachable "ghost" assessment.
          const hasRealContent = !!(
            a.diagnosis ||
            a.treatment_plan ||
            a.pain_score != null ||
            (Array.isArray(a.pain_regions) && a.pain_regions.length > 0) ||
            (Array.isArray(ad.strengthTable) && ad.strengthTable.length > 0) ||
            a.test_results ||
            a.questionnaire_results
          );
          return !hasRealContent;
        };

        const realAssessmentsOf = (p: any) =>
          (p.assessments || []).filter((a: any) => !isPlaceholderAssessment(a));

        const filteredPatients = [...patients].sort((a: any, b: any) => {
          if (sortMode === "recent") {
            return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
          }
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        }).filter((p: any) => {
          const isHidden = hiddenKeys.has(p.groupKey);
          if (isHidden && !showHidden) return false;
          if (statusFilter !== "all") {
            const daysSinceLast = Math.floor((Date.now() - new Date(p.lastDate).getTime()) / (1000 * 60 * 60 * 24));
            const isActive = daysSinceLast <= 30;
            if (statusFilter === "active" && !isActive) return false;
            if (statusFilter === "inactive" && isActive) return false;
          }
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase().replace(/[.\-/()\s]/g, "");
          const rec = p.patientRecord;
          const cpfRaw = (rec?.cpf || "").replace(/\D/g, "");
          const phoneRaw = (rec?.phone || "").replace(/\D/g, "");
          return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || cpfRaw.includes(q) || phoneRaw.includes(q);
        });

        const VISIBLE_LIMIT = 8;
        const isScrollable = filteredPatients.length > VISIBLE_LIMIT;
        const isEmpty = filteredPatients.length === 0;
        const hasSearch = !!searchQuery.trim();

        return (
          <>
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>
                {language === "pt"
                  ? `Mostrando ${filteredPatients.length} ${filteredPatients.length === 1 ? "paciente" : "pacientes"}`
                  : language === "es"
                  ? `Mostrando ${filteredPatients.length} ${filteredPatients.length === 1 ? "paciente" : "pacientes"}`
                  : `Showing ${filteredPatients.length} ${filteredPatients.length === 1 ? "patient" : "patients"}`}
              </span>
              {isScrollable && (
                <span className="hidden sm:inline text-[11px] opacity-70">
                  {language === "pt"
                    ? "Role para ver mais ou use a busca"
                    : language === "es"
                    ? "Desplázate o usa la búsqueda"
                    : "Scroll for more or use search"}
                </span>
              )}
            </div>
            {isEmpty ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center space-y-3">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {hasSearch
                      ? (language === "pt"
                          ? "Nenhum paciente encontrado para a busca."
                          : language === "es"
                          ? "Ningún paciente encontrado para la búsqueda."
                          : "No patients found for your search.")
                      : t("pro.no_patients")}
                  </p>
                  {!hasSearch && !readOnly && (
                    <Button
                      size="sm"
                      className="gap-1.5 rounded-xl"
                      onClick={() => { setEditPatientData(null); setAddPatientOpen(true); }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("pro.add_patient")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
            <div
              className={`space-y-3 ${
                isScrollable
                  ? "max-h-[640px] sm:max-h-[640px] max-h-[70vh] overflow-y-auto pr-1 rounded-xl border border-border/40 p-2 bg-background/40"
                  : ""
              }`}
            >

              {filteredPatients.map((p: any) => {
                const realAssessments = realAssessmentsOf(p);
                const firstScore = realAssessments[0]?.pain_score;
                const lastScore = realAssessments[realAssessments.length - 1]?.pain_score;
                const trend = firstScore != null && lastScore != null ? (lastScore < firstScore ? "improving" : lastScore > firstScore ? "worsening" : "stable") : null;
                const isHidden = hiddenKeys.has(p.groupKey);
                const patientRec = p.patientRecord;
                const isIncomplete = patientRec && (!patientRec.email || !patientRec.cpf || !patientRec.phone);
                const isImportedOnly = !patientRec && realAssessments.length === 0;
                const showIncomplete = isIncomplete || isImportedOnly;

                const startLongPress = () => {
                  longPressFiredRef.current = false;
                  longPressTimerRef.current = setTimeout(() => {
                    longPressTimerRef.current = null;
                    longPressFiredRef.current = true;
                    setLongPressPatient({ groupKey: p.groupKey, name: p.name });
                  }, 400);
                };
                const cancelLongPress = () => {
                  if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                };
                const patientAdherence = realAssessments.reduce((acc: { total: number; completed: number }, a: any) => {
                  const adh = exerciseAdherence[a.id];
                  if (adh) {
                    acc.total += adh.total;
                    acc.completed += adh.completed;
                  }
                  return acc;
                }, { total: 0, completed: 0 });
                const pct = patientAdherence.total > 0 ? Math.round((patientAdherence.completed / patientAdherence.total) * 100) : null;
                const color = pct == null ? "" : pct >= 70 ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : pct >= 40 ? "bg-amber-500/10 text-amber-600 border-amber-200" : "bg-destructive/10 text-destructive border-destructive/20";


                return (
                  <Card
                    key={p.groupKey}
                    className={`cursor-pointer hover:shadow-md transition-all hover:border-primary/20 group select-none ${isHidden ? "opacity-50" : ""}`}
                    onClick={() => {
                      if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
                      setSelectedEmail(p.email || p.groupKey);
                    }}
                    onTouchStart={readOnly ? undefined : startLongPress}
                    onTouchEnd={readOnly ? undefined : cancelLongPress}
                    onTouchMove={readOnly ? undefined : cancelLongPress}
                    onMouseDown={readOnly ? undefined : startLongPress}
                    onMouseUp={readOnly ? undefined : cancelLongPress}
                    onMouseLeave={readOnly ? undefined : cancelLongPress}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />{p.name}</p>
                            {isHidden && <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Arquivado</Badge>}
                            {realAssessments.length > 0 && (
                              <Badge variant="outline" className="text-[10px]">{realAssessments.length} {t("pro.assessments_count")}</Badge>
                            )}
                            {trend === "improving" && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">Melhorando</Badge>}
                            {trend === "worsening" && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">Piorando</Badge>}
                            {trend === "stable" && <Badge variant="outline" className="text-[10px]">Estável</Badge>}
                            {realAssessments.some((a: any) => a.treatment_plan) ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1"><FileCheck className="h-3 w-3" /> Tratamento Liberado</Badge>
                            
                            ) : null}
                            {showIncomplete && !readOnly && (
                              <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-200 gap-1 cursor-pointer hover:bg-orange-500/20 transition-colors" onClick={(e) => {
                                e.stopPropagation();
                                const rec = { ...(patientRec || { id: "", full_name: p.name, email: p.email || null }), assessmentIds: p.assessments.map((a: any) => a.id) };
                                setEditPatientData(rec);
                                setAddPatientOpen(true);
                              }}>
                                <Pencil className="h-3 w-3" />
                                {language === "pt" ? "Completar cadastro" : "Complete registration"}
                              </Badge>
                            )}
                            {pct != null && p.assessments.some((a: any) => a.user_id) && <Badge variant="outline" className={`text-[10px] gap-1 ${color}`}><Dumbbell className="h-3 w-3" /> {pct}% {language === "pt" ? "adesão" : "adherence"}</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t("pro.last_assessment")}: {new Date(p.lastDate).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>
                        <div className="flex w-full flex-wrap items-center gap-1 pt-1 shrink-0 sm:w-auto sm:flex-nowrap sm:justify-end sm:self-auto sm:pt-0 -mr-1 sm:mr-0">
                          {(!readOnly || allowManualAssessment) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={language === "pt" ? "Nova avaliação manual" : "New manual assessment"} onClick={(e) => { e.stopPropagation(); setManualAssessmentTarget({ name: p.name, email: p.email || "" }); }}>
                              <FilePlus className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          {(!readOnly || allowAssessmentLink) && patientRec && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={language === "pt" ? "Copiar link de avaliação personalizado" : "Copy personalized assessment link"} onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const token = await ensurePatientAssessmentToken(patientRec);
                                const link = buildPersonalizedAssessmentLink({ professionalId, clinicId }, token);
                                const { createShortAppLink } = await import("@/lib/shortLink");
                                const short = await createShortAppLink(link);
                                await navigator.clipboard.writeText(short);
                                toast({ title: language === "pt" ? "Link copiado!" : "Link copied!", description: language === "pt" ? "Envie ao paciente. A avaliação será vinculada automaticamente a este card." : "Send to the patient. The assessment will be auto-linked to this card." });
                              } catch (err: any) {
                                toast({ title: "Erro", description: err.message, variant: "destructive" });
                              }
                            }}>
                              <Link2 className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          {(!readOnly || allowQuickNote) && !isHidden && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={language === "pt" ? "Nota rápida" : "Quick note"} onClick={(e) => {
                              e.stopPropagation();
                              const emailKey = p.email || `imported:${p.groupKey || p.name}`;
                              setQuickNotePatient({ groupKey: p.groupKey, email: emailKey, name: p.name });
                              setQuickNoteContent("");
                            }}>
                              <NotebookPen className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          {( !readOnly || canAddPatient) && (isHidden ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Restaurar paciente" disabled={archiving === p.groupKey} onClick={(e) => handleRestorePatient(p.groupKey, e)}>
                              {archiving === p.groupKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Arquivar paciente" disabled={archiving === p.groupKey} onClick={(e) => handleArchivePatient(p.groupKey, e)}>
                              {archiving === p.groupKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                          ))}
                          <ChevronRight className="hidden sm:block h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            )}
          </>

        );
      })()}

      <AddPatientModal
        open={addPatientOpen}
        onOpenChange={(open) => {
          setAddPatientOpenState(open);
          if (!open) setEditPatientData(null);
        }}
        professionalId={professionalId}
        clinicId={clinicId}
        onAdded={() => { window.dispatchEvent(new CustomEvent("reload-pro-patients")); }}
        editPatient={editPatientData}
        onCreateManualAssessment={(p: any) => setManualAssessmentTarget(p)}
      />

      {manualAssessmentTarget && (
        <ManualAssessmentModal
          open={!!manualAssessmentTarget}
          onOpenChange={(o) => { if (!o) setManualAssessmentTarget(null); }}
          professionalId={professionalId}
          clinicId={clinicId}
          patientName={manualAssessmentTarget.name}
          patientEmail={manualAssessmentTarget.email}
          patientId={manualAssessmentTarget.id}
          demoMode={!!isDemo}
        />
      )}

      <Dialog open={!!quickNotePatient} onOpenChange={(open) => { if (!open) setQuickNotePatientState(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><NotebookPen className="h-4 w-4 text-primary" />{language === "pt" ? "Nota rápida de evolução" : "Quick evolution note"}</DialogTitle>
            <DialogDescription>{quickNotePatient?.name} — {new Date().toLocaleDateString("pt-BR")}</DialogDescription>
          </DialogHeader>
          <Textarea placeholder={language === "pt" ? "Ex: Paciente relata melhora de 30% na dor. Mantém exercícios..." : "Ex: Patient reports 30% pain improvement..."} value={quickNoteContent} onChange={(e) => setQuickNoteContentState(e.target.value)} className="min-h-[100px] resize-y text-sm" />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setQuickNotePatientState(null)}>{language === "pt" ? "Cancelar" : "Cancel"}</Button>
            <Button size="sm" className="gap-1.5 rounded-xl" onClick={handleQuickNoteSave} disabled={quickNoteSaving || !quickNoteContent.trim()}>
              {quickNoteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <NotebookPen className="h-3.5 w-3.5" />}
              {language === "pt" ? "Salvar" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!longPressPatient} onOpenChange={(open) => { if (!open) setLongPressPatientState(null); }}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{longPressPatient?.name}</AlertDialogTitle>
            <AlertDialogDescription>O que deseja fazer com este paciente?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
            <Button variant="outline" className="gap-1.5" onClick={(e) => {
              e.stopPropagation();
              if (longPressPatient) {
                handleArchivePatient(longPressPatient.groupKey);
                setLongPressPatientState(null);
              }
            }}><Archive className="h-4 w-4" />Arquivar</Button>
            <Button variant="destructive" className="gap-1.5" onClick={(e) => {
              e.stopPropagation();
              if (longPressPatient) {
                const p = patients.find((pat: any) => pat.groupKey === longPressPatient.groupKey);
                if (p) {
                  setDeleteConfirmPatient({ groupKey: longPressPatient.groupKey, name: longPressPatient.name, assessmentIds: p.assessments.map((a: any) => a.id) });
                }
                setLongPressPatientState(null);
              }
            }}><Archive className="h-4 w-4" />Excluir permanentemente</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConfirmPatient} onOpenChange={(open) => { if (!open) setDeleteConfirmPatient(null); }}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão permanente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <span className="font-semibold">{deleteConfirmPatient?.name}</span> e todas as suas {deleteConfirmPatient?.assessmentIds.length} avaliação(ões)?
              <br /><br />
              <span className="text-destructive font-medium">Esta ação é irreversível. Todos os dados de avaliações, planos de tratamento, exercícios e notas serão permanentemente apagados.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingPatient} onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5" disabled={!!deletingPatient} onClick={(e) => {
              e.stopPropagation();
              if (deleteConfirmPatient) handleDeletePatient(deleteConfirmPatient.groupKey, deleteConfirmPatient.assessmentIds);
            }}>
              {deletingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}