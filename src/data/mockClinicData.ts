import { format, addDays, subDays } from "date-fns";

const today = new Date();
const todayStr = format(today, "yyyy-MM-dd");
const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");
const dayAfterStr = format(addDays(today, 2), "yyyy-MM-dd");
const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

export const DEMO_CLINIC = {
  id: "demo-clinic-001",
  name: "Clínica FisioVida",
  logo_url: null,
  phone: "(11) 98765-4321",
  address: "Rua das Palmeiras, 123 — São Paulo, SP",
  subscription_status: "active" as const,
  max_members: 8,
  created_at: subDays(today, 30).toISOString(),
};

export const DEMO_TEAM = [
  { id: "demo-pro-owner", user_id: "demo-user-owner", full_name: "Dr. Ricardo Almeida", role: "owner" as const, specialties: ["Ortopedia", "Esportiva"], email: "ricardo@fisiovida.com" },
  { id: "demo-pro-t1", user_id: "demo-user-t1", full_name: "Dra. Camila Santos", role: "therapist" as const, specialties: ["Neurologia", "Respiratória"], email: "camila@fisiovida.com" },
  { id: "demo-pro-t2", user_id: "demo-user-t2", full_name: "Dr. Felipe Oliveira", role: "therapist" as const, specialties: ["Ortopedia", "RPG"], email: "felipe@fisiovida.com" },
  { id: "demo-sec", user_id: "demo-user-sec", full_name: "Ana Carolina Lima", role: "secretary" as const, specialties: [], email: "ana@fisiovida.com" },
];

export const DEMO_APPOINTMENTS = [
  // Today — filling ~50% of slots across 3 therapists (7h-20h = 13 slots each, ~6-7 per pro)
  { id: "demo-apt-1", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Maria Silva", patient_email: "maria@exemplo.com", appointment_date: todayStr, appointment_time: "08:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: "Retorno lombar", created_at: subDays(today, 3).toISOString() },
  { id: "demo-apt-2", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "João Pereira", patient_email: "joao@exemplo.com", appointment_date: todayStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: "Avaliação inicial ombro", created_at: subDays(today, 2).toISOString() },
  { id: "demo-apt-2b", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Renata Gomes", patient_email: "renata@exemplo.com", appointment_date: todayStr, appointment_time: "10:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: "Fortalecimento quadril", created_at: subDays(today, 2).toISOString() },
  { id: "demo-apt-2c", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Marcos Vieira", patient_email: "marcos@exemplo.com", appointment_date: todayStr, appointment_time: "14:00", duration_minutes: 50, type: "video_call", status: "scheduled", notes: "Teleconsulta retorno", created_at: subDays(today, 1).toISOString() },
  { id: "demo-apt-2d", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Helena Rocha", patient_email: "helena@exemplo.com", appointment_date: todayStr, appointment_time: "16:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-3", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Ana Costa", patient_email: "ana.costa@exemplo.com", appointment_date: todayStr, appointment_time: "08:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: subDays(today, 1).toISOString() },
  { id: "demo-apt-4", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Carlos Mendes", patient_email: "carlos@exemplo.com", appointment_date: todayStr, appointment_time: "10:00", duration_minutes: 50, type: "video_call", status: "scheduled", notes: "Teleconsulta pós-cirúrgico", created_at: subDays(today, 1).toISOString() },
  { id: "demo-apt-4b", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Tatiane Lopes", patient_email: "tatiane@exemplo.com", appointment_date: todayStr, appointment_time: "11:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: "RPG + liberação miofascial", created_at: subDays(today, 1).toISOString() },
  { id: "demo-apt-4c", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Bruno Nascimento", patient_email: "bruno@exemplo.com", appointment_date: todayStr, appointment_time: "14:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-4d", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Isabela Duarte", patient_email: "isabela@exemplo.com", appointment_date: todayStr, appointment_time: "15:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: "Avaliação cervical", created_at: today.toISOString() },
  { id: "demo-apt-5", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Lucia Ferreira", patient_email: "lucia@exemplo.com", appointment_date: todayStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-5b", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "André Martins", patient_email: "andre@exemplo.com", appointment_date: todayStr, appointment_time: "10:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: "Reabilitação joelho D", created_at: today.toISOString() },
  { id: "demo-apt-5c", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Patrícia Souza", patient_email: "patricia@exemplo.com", appointment_date: todayStr, appointment_time: "11:00", duration_minutes: 50, type: "external", status: "scheduled", notes: "Domiciliar", created_at: today.toISOString() },
  { id: "demo-apt-5d", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Gabriel Reis", patient_email: "gabriel@exemplo.com", appointment_date: todayStr, appointment_time: "15:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-5e", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Juliana Prado", patient_email: "juliana@exemplo.com", appointment_date: todayStr, appointment_time: "17:00", duration_minutes: 50, type: "video_call", status: "scheduled", notes: "Orientação exercícios", created_at: today.toISOString() },
  // Tomorrow
  { id: "demo-apt-6", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Pedro Santos", patient_email: "pedro@exemplo.com", appointment_date: tomorrowStr, appointment_time: "08:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-6b", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Maria Silva", patient_email: "maria@exemplo.com", appointment_date: tomorrowStr, appointment_time: "10:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: "Retorno lombar", created_at: today.toISOString() },
  { id: "demo-apt-6c", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "João Pereira", patient_email: "joao@exemplo.com", appointment_date: tomorrowStr, appointment_time: "14:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-7", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Fernanda Lima", patient_email: "fernanda@exemplo.com", appointment_date: tomorrowStr, appointment_time: "08:00", duration_minutes: 50, type: "external", status: "scheduled", notes: "Domiciliar", created_at: today.toISOString() },
  { id: "demo-apt-7b", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "André Martins", patient_email: "andre@exemplo.com", appointment_date: tomorrowStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-7c", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Tatiane Lopes", patient_email: "tatiane@exemplo.com", appointment_date: tomorrowStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-7d", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Ana Costa", patient_email: "ana.costa@exemplo.com", appointment_date: tomorrowStr, appointment_time: "11:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-7e", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Carlos Mendes", patient_email: "carlos@exemplo.com", appointment_date: tomorrowStr, appointment_time: "16:00", duration_minutes: 50, type: "video_call", status: "scheduled", notes: "Reavaliação", created_at: today.toISOString() },
  // Day after
  { id: "demo-apt-8", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Roberto Alves", patient_email: "roberto@exemplo.com", appointment_date: dayAfterStr, appointment_time: "11:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-8b", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Helena Rocha", patient_email: "helena@exemplo.com", appointment_date: dayAfterStr, appointment_time: "08:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-8c", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Renata Gomes", patient_email: "renata@exemplo.com", appointment_date: dayAfterStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: "Reavaliação", created_at: today.toISOString() },
  { id: "demo-apt-8d", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Gabriel Reis", patient_email: "gabriel@exemplo.com", appointment_date: dayAfterStr, appointment_time: "10:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-8e", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Patrícia Souza", patient_email: "patricia@exemplo.com", appointment_date: dayAfterStr, appointment_time: "14:00", duration_minutes: 50, type: "external", status: "scheduled", notes: "Domiciliar", created_at: today.toISOString() },
  // Yesterday (completed)
  { id: "demo-apt-9", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Maria Silva", patient_email: "maria@exemplo.com", appointment_date: yesterdayStr, appointment_time: "08:00", duration_minutes: 50, type: "in_person", status: "completed", notes: "Sessão realizada", created_at: subDays(today, 5).toISOString() },
  { id: "demo-apt-9b", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Marcos Vieira", patient_email: "marcos@exemplo.com", appointment_date: yesterdayStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "completed", notes: "Alta parcial", created_at: subDays(today, 5).toISOString() },
  { id: "demo-apt-9c", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Bruno Nascimento", patient_email: "bruno@exemplo.com", appointment_date: yesterdayStr, appointment_time: "10:00", duration_minutes: 50, type: "in_person", status: "completed", notes: null, created_at: subDays(today, 4).toISOString() },
  { id: "demo-apt-9d", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Lucia Ferreira", patient_email: "lucia@exemplo.com", appointment_date: yesterdayStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "completed", notes: "Boa evolução", created_at: subDays(today, 4).toISOString() },
  { id: "demo-apt-9e", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Juliana Prado", patient_email: "juliana@exemplo.com", appointment_date: yesterdayStr, appointment_time: "14:00", duration_minutes: 50, type: "video_call", status: "completed", notes: "Teleconsulta concluída", created_at: subDays(today, 4).toISOString() },
];

export const DEMO_CLINIC_ASSESSMENTS = [
  {
    id: "demo-clinic-a1",
    clinic_id: DEMO_CLINIC.id,
    professional_id: "demo-pro-owner",
    patient_name: "Maria Silva",
    patient_email: "maria@exemplo.com",
    type: "professional",
    status: "completed",
    pain_score: 7,
    pain_regions: ["lower_back", "right_hip"],
    created_at: subDays(today, 10).toISOString(),
    anamnesis_data: { chiefComplaints: ["anamnesis.complaint.back_pain"], onset: "anamnesis.onset.gradual", painDuration: "anamnesis.duration.three_six_months" },
    diagnosis: { hypothesis: "Lombalgia mecânica com componente radicular L4-L5", confidence: "high", icd10: "M54.5", differentials: ["Hérnia discal L4-L5", "Estenose foraminal"], reasoning: "Padrão de dor radicular associado a déficit de flexibilidade." },
    treatment_plan: { goals: ["Reduzir dor para NRS ≤ 3", "Restaurar ADM lombar"], phases: [{ name: "Fase aguda", duration: "2 semanas", exercises: ["Mobilização neural", "Estabilização segmentar"] }] },
  },
  {
    id: "demo-clinic-a2",
    clinic_id: DEMO_CLINIC.id,
    professional_id: "demo-pro-t1",
    patient_name: "Ana Costa",
    patient_email: "ana.costa@exemplo.com",
    type: "professional",
    status: "completed",
    pain_score: 5,
    pain_regions: ["neck", "right_shoulder"],
    created_at: subDays(today, 7).toISOString(),
    anamnesis_data: { chiefComplaints: ["anamnesis.complaint.neck_pain"], onset: "anamnesis.onset.sudden" },
    diagnosis: { hypothesis: "Cervicalgia tensional com síndrome miofascial", confidence: "high", icd10: "M54.2", differentials: ["Cervicobraquialgia"], reasoning: "Pontos-gatilho em trapézio e ECM." },
    treatment_plan: null,
  },
  {
    id: "demo-clinic-a3",
    clinic_id: DEMO_CLINIC.id,
    professional_id: null,
    patient_name: "Carlos Mendes",
    patient_email: "carlos@exemplo.com",
    type: "professional",
    status: "completed",
    pain_score: 6,
    pain_regions: ["right_knee"],
    created_at: subDays(today, 3).toISOString(),
    anamnesis_data: { chiefComplaints: ["anamnesis.complaint.knee_pain"], onset: "anamnesis.onset.gradual" },
    diagnosis: { hypothesis: "Condromalácia patelar grau II", confidence: "moderate", icd10: "M22.4", differentials: ["Tendinopatia patelar"], reasoning: "Dor em escadas e agachamento." },
    treatment_plan: null,
  },
  {
    id: "demo-clinic-a4",
    clinic_id: DEMO_CLINIC.id,
    professional_id: null,
    patient_name: "Lucia Ferreira",
    patient_email: "lucia@exemplo.com",
    type: "professional",
    status: "in_progress",
    pain_score: 4,
    pain_regions: ["left_shoulder"],
    created_at: subDays(today, 1).toISOString(),
    anamnesis_data: {},
    diagnosis: null,
    treatment_plan: null,
  },
];
