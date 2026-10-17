import {
  Activity,
  Brain,
  ClipboardList,
  Dumbbell,
  FileText,
  FolderOpen,
  HeartPulse,
  History,
  ListChecks,
  Mic,
  NotebookPen,
  Stethoscope,
  TrendingUp,
  User,
  Map,
  Gauge,
  MessageSquarePlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PatientSectionDef {
  /** DOM id da seção correspondente no prontuário. */
  id: string;
  icon: LucideIcon;
  label: { pt: string; en: string; es: string };
}

/**
 * Registro ordenado das seções do prontuário do paciente.
 * A ordem aqui deve espelhar a ordem de renderização em PatientDetailView.
 * Ícones reaproveitam os mesmos usados nos cards da página.
 */
export const PATIENT_SECTIONS: PatientSectionDef[] = [
  { id: "patient-detail-anchor", icon: User, label: { pt: "Paciente", en: "Patient", es: "Paciente" } },
  { id: "treatment-unlock-section", icon: Stethoscope, label: { pt: "Hipótese diagnóstica", en: "Diagnostic hypothesis", es: "Hipótesis diagnóstica" } },
  { id: "sec-impressao-clinica", icon: Brain, label: { pt: "Impressão clínica", en: "Clinical impression", es: "Impresión clínica" } },
  { id: "sec-adendos", icon: MessageSquarePlus, label: { pt: "Informações adicionais", en: "Additional information", es: "Información adicional" } },

  { id: "sec-anamnese", icon: ClipboardList, label: { pt: "Anamnese", en: "Anamnesis", es: "Anamnesis" } },
  { id: "saude-geral", icon: HeartPulse, label: { pt: "Saúde geral", en: "General health", es: "Salud general" } },
  { id: "sec-timeline", icon: History, label: { pt: "Linha do tempo", en: "Timeline", es: "Línea de tiempo" } },
   { id: "sec-evolucao-dor", icon: Activity, label: { pt: "Dor por região", en: "Pain by region", es: "Dolor por región" } },
  { id: "sec-mecanismo-dor", icon: TrendingUp, label: { pt: "Mecanismo de dor", en: "Pain mechanism", es: "Mecanismo de dolor" } },
  { id: "sec-mapa-dor", icon: Map, label: { pt: "Mapa de dor", en: "Pain map", es: "Mapa de dolor" } },
  { id: "sec-questionarios", icon: FileText, label: { pt: "Questionários", en: "Questionnaires", es: "Cuestionarios" } },
  { id: "sec-especializados", icon: Brain, label: { pt: "Questionários complementares", en: "Complementary questionnaires", es: "Cuestionarios complementarios" } },

  { id: "sec-notas-voz", icon: Mic, label: { pt: "Notas de voz", en: "Voice notes", es: "Notas de voz" } },
  { id: "sec-notas-sessao", icon: NotebookPen, label: { pt: "Notas de sessão", en: "Session notes", es: "Notas de sesión" } },
  { id: "sec-dinamometria", icon: Dumbbell, label: { pt: "Dinamometria", en: "Dynamometry", es: "Dinamometría" } },
  { id: "sec-adm", icon: Activity, label: { pt: "Mobilidade e flexibilidade", en: "Mobility & flexibility", es: "Movilidad y flexibilidad" } },
  { id: "sec-arquivos", icon: FolderOpen, label: { pt: "Arquivos e fotos", en: "Files & photos", es: "Archivos y fotos" } },
  { id: "sec-hep", icon: Dumbbell, label: { pt: "Programas de exercícios", en: "Exercise programs", es: "Programas de ejercicios" } },
  { id: "sec-periodizacao", icon: Gauge, label: { pt: "Carga e periodização", en: "Load & periodization", es: "Carga y periodización" } },
  { id: "sec-historico", icon: History, label: { pt: "Histórico de avaliações", en: "Assessment history", es: "Historial de evaluaciones" } },

];
