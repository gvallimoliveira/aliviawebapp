import { supabase } from "@/integrations/supabase/client";
import { careScope } from "@/lib/careScope";
import { clinicIdentityReady, type GettingStartedFacts, type GettingStartedScope } from "./gettingStarted";

// Counts only: no clinical texts are downloaded for the activation checklist.
async function count(query: any): Promise<number | null> {
  try {
    const result = await query;
    return result.error || typeof result.count !== "number" ? null : result.count;
  } catch { return null; }
}

const countOptions = { count: "exact" as const, head: true };
const realAssessmentFilter = 'anamnesis_data.is.null,and(anamnesis_data.not.cs.{"externalPatient":true},anamnesis_data.not.cs.{"quickEvolutionOnly":true},anamnesis_data.not.cs.{"placeholder":true})';

export async function fetchGettingStartedFacts(scope: GettingStartedScope, clinical: boolean, _hasAgent: boolean, manager = false): Promise<GettingStartedFacts> {
  const { userId, professionalId, clinicId } = scope;
  if (!userId || (!clinicId && !professionalId)) throw new Error("Care scope unavailable");
  const scoped = (query: any) => careScope(query, clinicId, professionalId);
  if (manager) {
    if (!clinicId) throw new Error("Clinic scope unavailable");
    const [identityResult, members, invitations, services, assessments, appointments] = await Promise.all([
      supabase.from("clinics").select("name, logo_url, phone, operating_hours_start, operating_hours_end").eq("id", clinicId).maybeSingle(),
      count(supabase.from("clinic_members").select("id", countOptions).eq("clinic_id", clinicId).eq("status", "active").neq("user_id", userId)),
      count(supabase.from("clinic_invitations").select("id", countOptions).eq("clinic_id", clinicId).gt("expires_at", new Date().toISOString())),
      count(supabase.from("care_services").select("id", countOptions).eq("clinic_id", clinicId).eq("active", true).neq("name", "")),
      count(scoped(supabase.from("assessments").select("id", countOptions).in("status", ["completed", "diagnosis_complete"]).or(realAssessmentFilter))),
      count(scoped(supabase.from("professional_appointments").select("id", countOptions).or("service_type.is.null,service_type.neq.compromisso").neq("status", "cancelled"))),
    ]);
    const team = (members ?? 0) > 0 || (invitations ?? 0) > 0 ? (members ?? 0) + (invitations ?? 0) : members === null || invitations === null ? null : 0;
    return { patients: 0, assessments, notes: 0, heps: 0, loads: 0, conversations: 0, appointments,
      identity: identityResult.error || !identityResult.data ? null : clinicIdentityReady(identityResult.data), team, services };
  }

  const [patients, assessments, notes, heps, loadCount, conversationCount, appointments] = await Promise.all([
    count(scoped(supabase.from("patients").select("id", countOptions).eq("is_study_case", false))),
    count(scoped(supabase.from("assessments").select("id", countOptions).in("status", ["completed", "diagnosis_complete"]).or(realAssessmentFilter))),
    clinical ? count(scoped(supabase.from("session_notes").select("id, commitments:professional_appointments!session_notes_appointment_id_fkey()", countOptions)
      .not("content", "match", "^[[:space:]]*$")
      .eq("commitments.service_type", "compromisso").is("commitments", null))) : Promise.resolve(0),
    clinical ? count(scoped(supabase.from("exercise_programs").select("id, exercise_program_items!inner(id)", countOptions))) : Promise.resolve(0),
    Promise.resolve(0),
    Promise.resolve(0),
    !clinical ? count(scoped(supabase.from("professional_appointments").select("id", countOptions)
      .or("service_type.is.null,service_type.neq.compromisso").neq("status", "cancelled"))) : Promise.resolve(0),
  ]);
  return { patients, assessments, notes, heps, loads: loadCount, conversations: conversationCount, appointments };
}

export async function fetchGettingStartedPatients(scope: GettingStartedScope, search: string) {
  if (!scope.userId || (!scope.clinicId && !scope.professionalId)) throw new Error("Care scope unavailable");
  let query = careScope(supabase.from("patients").select("id, full_name, email")
    .eq("is_study_case", false).order("created_at", { ascending: false }).limit(50), scope.clinicId, scope.professionalId);
  const term = search.trim().replace(/[%_(),\\"]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as { id: string; full_name: string; email: string | null }[];
}