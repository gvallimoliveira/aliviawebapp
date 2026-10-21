import { format, addDays, subDays } from "date-fns";

// Anchor demo dates to weekdays so the simulated agenda never shows Sat/Sun
const nextWeekday = (d: Date): Date => {
  const day = d.getDay();
  if (day === 0) return addDays(d, 1); // Sun -> Mon
  if (day === 6) return addDays(d, 2); // Sat -> Mon
  return d;
};
const prevWeekday = (d: Date): Date => {
  const day = d.getDay();
  if (day === 0) return subDays(d, 2); // Sun -> Fri
  if (day === 6) return subDays(d, 1); // Sat -> Fri
  return d;
};
const stepWeekday = (d: Date, days: number): Date => {
  let cur = d;
  const step = days > 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(days); i++) {
    cur = addDays(cur, step);
    cur = step > 0 ? nextWeekday(cur) : prevWeekday(cur);
  }
  return cur;
};

const today = nextWeekday(new Date());
const todayStr = format(today, "yyyy-MM-dd");
const tomorrowStr = format(stepWeekday(today, 1), "yyyy-MM-dd");
const dayAfterStr = format(stepWeekday(today, 2), "yyyy-MM-dd");
const yesterdayStr = format(stepWeekday(today, -1), "yyyy-MM-dd");

// Monday of the current week (so we can fill every weekday Mon-Fri)
const _weekMonday = addDays(today, -((today.getDay() + 6) % 7));
const weekDayStr = (i: number) => format(addDays(_weekMonday, i), "yyyy-MM-dd"); // 0=Mon .. 4=Fri

export const DEMO_CLINIC = {
  id: "demo-clinic-001",
  name: "Clínica FisioVida",
  logo_url: null as string | null,
  brand_color: "#0EA5A4",
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
  { id: "demo-admin", user_id: "demo-user-admin", full_name: "Beatriz Martins", role: "admin" as const, specialties: [], email: "beatriz@fisiovida.com" },
  { id: "demo-intern", user_id: "demo-user-intern", full_name: "Lucas Ribeiro", role: "intern" as const, specialties: ["Acadêmico · 8º período", "Instituição de exemplo"], email: "lucas@fisiovida.com" },
  { id: "demo-osteo", user_id: "demo-user-osteo", full_name: "Dra. Marina Lopes", role: "osteopath" as const, specialties: ["Osteopatia"], email: "marina@fisiovida.com" },
];

export const DEMO_APPOINTMENTS = [
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
  { id: "demo-apt-6", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Pedro Santos", patient_email: "pedro@exemplo.com", appointment_date: tomorrowStr, appointment_time: "08:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-6b", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Maria Silva", patient_email: "maria@exemplo.com", appointment_date: tomorrowStr, appointment_time: "10:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: "Retorno lombar", created_at: today.toISOString() },
  { id: "demo-apt-6c", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "João Pereira", patient_email: "joao@exemplo.com", appointment_date: tomorrowStr, appointment_time: "14:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-7", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Fernanda Lima", patient_email: "fernanda@exemplo.com", appointment_date: tomorrowStr, appointment_time: "08:00", duration_minutes: 50, type: "external", status: "scheduled", notes: "Domiciliar", created_at: today.toISOString() },
  { id: "demo-apt-7b", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "André Martins", patient_email: "andre@exemplo.com", appointment_date: tomorrowStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-7c", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Tatiane Lopes", patient_email: "tatiane@exemplo.com", appointment_date: tomorrowStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-7d", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Ana Costa", patient_email: "ana.costa@exemplo.com", appointment_date: tomorrowStr, appointment_time: "11:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-7e", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Carlos Mendes", patient_email: "carlos@exemplo.com", appointment_date: tomorrowStr, appointment_time: "16:00", duration_minutes: 50, type: "video_call", status: "scheduled", notes: "Reavaliação", created_at: today.toISOString() },
  { id: "demo-apt-8", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Roberto Alves", patient_email: "roberto@exemplo.com", appointment_date: dayAfterStr, appointment_time: "11:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-8b", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Helena Rocha", patient_email: "helena@exemplo.com", appointment_date: dayAfterStr, appointment_time: "08:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-8c", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Renata Gomes", patient_email: "renata@exemplo.com", appointment_date: dayAfterStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: "Reavaliação", created_at: today.toISOString() },
  { id: "demo-apt-8d", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Gabriel Reis", patient_email: "gabriel@exemplo.com", appointment_date: dayAfterStr, appointment_time: "10:00", duration_minutes: 50, type: "in_person", status: "scheduled", notes: null, created_at: today.toISOString() },
  { id: "demo-apt-8e", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Patrícia Souza", patient_email: "patricia@exemplo.com", appointment_date: dayAfterStr, appointment_time: "14:00", duration_minutes: 50, type: "external", status: "scheduled", notes: "Domiciliar", created_at: today.toISOString() },
  { id: "demo-apt-9", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Maria Silva", patient_email: "maria@exemplo.com", appointment_date: yesterdayStr, appointment_time: "08:00", duration_minutes: 50, type: "in_person", status: "completed", notes: "Sessão realizada", created_at: subDays(today, 5).toISOString() },
  { id: "demo-apt-9b", professional_id: "demo-pro-owner", clinic_id: DEMO_CLINIC.id, patient_name: "Marcos Vieira", patient_email: "marcos@exemplo.com", appointment_date: yesterdayStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "completed", notes: "Alta parcial", created_at: subDays(today, 5).toISOString() },
  { id: "demo-apt-9c", professional_id: "demo-pro-t1", clinic_id: DEMO_CLINIC.id, patient_name: "Bruno Nascimento", patient_email: "bruno@exemplo.com", appointment_date: yesterdayStr, appointment_time: "10:00", duration_minutes: 50, type: "in_person", status: "completed", notes: null, created_at: subDays(today, 4).toISOString() },
  { id: "demo-apt-9d", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Lucia Ferreira", patient_email: "lucia@exemplo.com", appointment_date: yesterdayStr, appointment_time: "09:00", duration_minutes: 50, type: "in_person", status: "completed", notes: "Boa evolução", created_at: subDays(today, 4).toISOString() },
  { id: "demo-apt-9e", professional_id: "demo-pro-t2", clinic_id: DEMO_CLINIC.id, patient_name: "Juliana Prado", patient_email: "juliana@exemplo.com", appointment_date: yesterdayStr, appointment_time: "14:00", duration_minutes: 50, type: "video_call", status: "completed", notes: "Teleconsulta concluída", created_at: subDays(today, 4).toISOString() },
];

// Auto-fill every weekday of the current week (Mon-Fri) with a rich schedule across the team.
// We skip days already covered by todayStr/tomorrowStr/dayAfterStr/yesterdayStr to avoid duplicates.
const _filledDates = new Set([todayStr, tomorrowStr, dayAfterStr, yesterdayStr]);
const _weekdayTemplate: Array<{ pro: string; time: string; name: string; email: string; type: string; notes: string | null }> = [
  { pro: "demo-pro-owner", time: "08:00", name: "Mariana Castro",   email: "mariana@exemplo.com",  type: "in_person",  notes: "Reabilitação coluna" },
  { pro: "demo-pro-owner", time: "09:00", name: "Eduardo Pinto",    email: "eduardo@exemplo.com",  type: "in_person",  notes: null },
  { pro: "demo-pro-owner", time: "10:00", name: "Sofia Andrade",    email: "sofia@exemplo.com",    type: "in_person",  notes: "Pilates terapêutico" },
  { pro: "demo-pro-owner", time: "14:00", name: "Rafael Moreira",   email: "rafael@exemplo.com",   type: "video_call", notes: "Teleconsulta retorno" },
  { pro: "demo-pro-owner", time: "16:00", name: "Beatriz Nunes",    email: "beatriz@exemplo.com",  type: "in_person",  notes: null },
  { pro: "demo-pro-t1",    time: "08:00", name: "Thiago Barros",    email: "thiago@exemplo.com",   type: "in_person",  notes: "Ombro pós-cirúrgico" },
  { pro: "demo-pro-t1",    time: "09:00", name: "Larissa Cunha",    email: "larissa@exemplo.com",  type: "in_person",  notes: null },
  { pro: "demo-pro-t1",    time: "11:00", name: "Diego Ramos",      email: "diego@exemplo.com",    type: "in_person",  notes: "Joelho — RPG" },
  { pro: "demo-pro-t1",    time: "15:00", name: "Camila Freitas",   email: "camilaf@exemplo.com",  type: "in_person",  notes: null },
  { pro: "demo-pro-t2",    time: "09:00", name: "Vinícius Lopes",   email: "vinicius@exemplo.com", type: "in_person",  notes: "Tornozelo — reabilitação esportiva" },
  { pro: "demo-pro-t2",    time: "10:00", name: "Aline Tavares",    email: "aline@exemplo.com",    type: "external",   notes: "Domiciliar" },
  { pro: "demo-pro-t2",    time: "14:00", name: "Henrique Dias",    email: "henrique@exemplo.com", type: "in_person",  notes: null },
  { pro: "demo-pro-t2",    time: "16:00", name: "Paula Coelho",     email: "paula@exemplo.com",    type: "video_call", notes: "Orientação domiciliar" },
];

for (let i = 0; i < 5; i++) {
  const dateStr = weekDayStr(i);
  if (_filledDates.has(dateStr)) continue;
  const isPast = dateStr < todayStr;
  _weekdayTemplate.forEach((slot, idx) => {
    DEMO_APPOINTMENTS.push({
      id: `demo-apt-wk-${i}-${idx}`,
      professional_id: slot.pro,
      clinic_id: DEMO_CLINIC.id,
      patient_name: slot.name,
      patient_email: slot.email,
      appointment_date: dateStr,
      appointment_time: slot.time,
      duration_minutes: 50,
      type: slot.type,
      status: isPast ? "completed" : "scheduled",
      notes: slot.notes,
      created_at: subDays(today, 5).toISOString(),
    });
  });
}

export const DEMO_CLINIC_ASSESSMENTS = [
  {
    id: "demo-clinic-a1", clinic_id: DEMO_CLINIC.id, professional_id: "demo-pro-owner",
    patient_name: "Maria Silva", patient_email: "maria@exemplo.com",
    type: "professional", status: "completed", pain_score: 7, pain_regions: ["lower_back", "right_hip"],
    created_at: subDays(today, 10).toISOString(),
    anamnesis_data: { chiefComplaints: ["anamnesis.complaint.back_pain"], onset: "anamnesis.onset.gradual", painDuration: "anamnesis.duration.three_six_months" },
    diagnosis: { hypothesis: "Lombalgia mecânica com componente radicular L4-L5", confidence: "high", icd10: "M54.5", differentials: ["Hérnia discal L4-L5", "Estenose foraminal"], reasoning: "Padrão de dor radicular associado a déficit de flexibilidade." },
    treatment_plan: { goals: ["Reduzir dor para NRS ≤ 3", "Restaurar ADM lombar"], phases: [{ name: "Fase aguda", duration: "2 semanas", exercises: ["Mobilização neural", "Estabilização segmentar"] }] },
  },
  {
    id: "demo-clinic-a2", clinic_id: DEMO_CLINIC.id, professional_id: "demo-pro-t1",
    patient_name: "Ana Costa", patient_email: "ana.costa@exemplo.com",
    type: "professional", status: "completed", pain_score: 5, pain_regions: ["neck", "right_shoulder"],
    created_at: subDays(today, 7).toISOString(),
    anamnesis_data: { chiefComplaints: ["anamnesis.complaint.neck_pain"], onset: "anamnesis.onset.sudden" },
    diagnosis: { hypothesis: "Cervicalgia tensional com síndrome miofascial", confidence: "high", icd10: "M54.2", differentials: ["Cervicobraquialgia"], reasoning: "Pontos-gatilho em trapézio e ECM." },
    treatment_plan: null,
  },
  {
    id: "demo-clinic-a3", clinic_id: DEMO_CLINIC.id, professional_id: null,
    patient_name: "Carlos Mendes", patient_email: "carlos@exemplo.com",
    type: "professional", status: "completed", pain_score: 6, pain_regions: ["right_knee"],
    created_at: subDays(today, 3).toISOString(),
    anamnesis_data: { chiefComplaints: ["anamnesis.complaint.knee_pain"], onset: "anamnesis.onset.gradual" },
    diagnosis: { hypothesis: "Condromalácia patelar grau II", confidence: "moderate", icd10: "M22.4", differentials: ["Tendinopatia patelar"], reasoning: "Dor em escadas e agachamento." },
    treatment_plan: null,
  },
  {
    id: "demo-clinic-a4", clinic_id: DEMO_CLINIC.id, professional_id: null,
    patient_name: "Lucia Ferreira", patient_email: "lucia@exemplo.com",
    type: "professional", status: "in_progress", pain_score: 4, pain_regions: ["left_shoulder"],
    created_at: subDays(today, 1).toISOString(),
    anamnesis_data: {}, diagnosis: null, treatment_plan: null,
  },
];

// ─── Insights (AI) ───
export const DEMO_INSIGHTS = {
  churn_risk: [
    { patient_name: "Marcos Vieira", risk_score: 82, reason: "3 faltas nos últimos 14 dias + dor estável", last_visit_days: 9 },
    { patient_name: "Helena Rocha", risk_score: 71, reason: "Aderência ao HEP caiu para 38%", last_visit_days: 7 },
    { patient_name: "Pedro Santos", risk_score: 63, reason: "Pulou 1 sessão sem reagendar", last_visit_days: 5 },
  ],
  discharge_ready: [
    { patient_name: "Bruno Nascimento", confidence: 91, reason: "Oswestry caiu de 56% → 18% em 8 sessões", sessions: 8 },
    { patient_name: "Lucia Ferreira", confidence: 84, reason: "NRS estável em 1–2 há 3 sessões consecutivas", sessions: 12 },
  ],
  occupancy: {
    week_occupancy_pct: 78,
    no_show_pct: 6.2,
    cancellation_pct: 4.8,
    trend_pct: +3.4,
  },
  adherence: {
    hep_adherence_pct: 67,
    diary_streak_avg_days: 9.4,
    top_patients: [
      { name: "Maria Silva", pct: 94 },
      { name: "Ana Costa", pct: 88 },
      { name: "Bruno Nascimento", pct: 86 },
    ],
  },
  benchmark: {
    your_avg_sessions_per_discharge: 11.2,
    market_avg: 14.6,
    delta_pct: -23,
    your_nps: 72,
    market_nps: 58,
  },
  revenue_goal: {
    goal: 22000,
    current: 17850,
    progress_pct: 81,
    days_left: 9,
    forecast: 24300,
  },
};

// ─── Mensagens ───
export const DEMO_CONVERSATIONS = [
  {
    id: "demo-conv-1",
    patient_name: "Maria Silva",
    patient_avatar: null as string | null,
    last_message: "Doutor, posso aumentar a carga do agachamento?",
    last_at: subDays(today, 0).toISOString(),
    unread: 2,
    professional_id: "demo-pro-owner",
    messages: [
      { id: "m1", from: "patient", text: "Bom dia! Como devo fazer o exercício de ponte?", at: "08:14" },
      { id: "m2", from: "pro", text: "Bom dia, Maria! 3 séries de 12 repetições, contraindo o glúteo no topo por 2s.", at: "08:22" },
      { id: "m3", from: "patient", text: "Perfeito 🙏 Doutor, posso aumentar a carga do agachamento?", at: "09:01" },
    ],
  },
  {
    id: "demo-conv-2",
    patient_name: "Carlos Mendes",
    patient_avatar: null as string | null,
    last_message: "Confirmado teleconsulta às 10h ✅",
    last_at: subDays(today, 0).toISOString(),
    unread: 0,
    professional_id: "demo-pro-t1",
    messages: [
      { id: "m1", from: "pro", text: "Carlos, sua teleconsulta é hoje às 10h. Tudo certo?", at: "07:30" },
      { id: "m2", from: "patient", text: "Confirmado teleconsulta às 10h ✅", at: "07:42" },
    ],
  },
  {
    id: "demo-conv-3",
    patient_name: "Bruno Nascimento",
    patient_avatar: null as string | null,
    last_message: "Dor zerou essa semana 🎉",
    last_at: subDays(today, 1).toISOString(),
    unread: 0,
    professional_id: "demo-pro-t1",
    messages: [
      { id: "m1", from: "patient", text: "Dor zerou essa semana 🎉", at: "Ontem" },
      { id: "m2", from: "pro", text: "Excelente, Bruno! Vamos avaliar alta na próxima sessão.", at: "Ontem" },
    ],
  },
  {
    id: "demo-conv-4",
    patient_name: "Tatiane Lopes",
    patient_avatar: null as string | null,
    last_message: "Posso remarcar para quinta?",
    last_at: subDays(today, 2).toISOString(),
    unread: 1,
    professional_id: "demo-pro-t1",
    messages: [
      { id: "m1", from: "patient", text: "Posso remarcar para quinta?", at: "2 dias atrás" },
    ],
  },
];

// ─── Feedback / NPS ───
export const DEMO_FEEDBACK = {
  nps: 72,
  total_responses: 48,
  promoters: 36,
  passives: 8,
  detractors: 4,
  recent: [
    { id: "f1", patient_name: "Maria Silva", score: 10, comment: "Atendimento humanizado, resultado incrível em 6 sessões.", at: subDays(today, 2).toISOString() },
    { id: "f2", patient_name: "André Martins", score: 9, comment: "Dra. Camila explicou tudo com muita paciência.", at: subDays(today, 3).toISOString() },
    { id: "f3", patient_name: "Bruno Nascimento", score: 10, comment: "Voltei a correr depois de 2 anos parado.", at: subDays(today, 5).toISOString() },
    { id: "f4", patient_name: "Patrícia Souza", score: 7, comment: "Bom atendimento, agenda poderia ter mais horários à noite.", at: subDays(today, 6).toISOString() },
  ],
};

// ─── Gestão & KPIs ───
export const DEMO_MANAGEMENT = {
  monthly_revenue: 17850,
  monthly_revenue_prev: 15420,
  active_patients: 84,
  active_patients_prev: 71,
  sessions_month: 312,
  sessions_month_prev: 268,
  conversion_rate_pct: 64,
  conversion_rate_pct_prev: 58,
  avg_ticket: 215,
  avg_ticket_prev: 198,
  occupancy_pct: 78,
  // Last 6 months revenue
  revenue_series: [
    { month: "Jul", value: 12400 },
    { month: "Ago", value: 13900 },
    { month: "Set", value: 14200 },
    { month: "Out", value: 15420 },
    { month: "Nov", value: 16780 },
    { month: "Dez", value: 17850 },
  ],
  // Specialty distribution
  specialty_distribution: [
    { name: "Ortopedia", value: 42 },
    { name: "RPG / Postural", value: 22 },
    { name: "Neurologia", value: 14 },
    { name: "Esportiva", value: 12 },
    { name: "Respiratória", value: 6 },
    { name: "Outros", value: 4 },
  ],
  // Sessions per therapist (this month)
  sessions_per_therapist: [
    { name: "Dr. Ricardo", sessions: 124 },
    { name: "Dra. Camila", sessions: 108 },
    { name: "Dr. Felipe", sessions: 80 },
  ],
};
