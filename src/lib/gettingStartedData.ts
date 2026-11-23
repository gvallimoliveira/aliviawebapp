import { supabase } from "@/integrations/supabase/client";
import { careScope } from "@/lib/careScope";
import type { GettingStartedFacts, GettingStartedScope } from "./gettingStarted";

// Counts only: no clinical texts are downloaded for the activation checklist.
async function count(query: any): Promise<number | null> {
  try {
    const result = await query;
    return result.error || typeof result.count !== "number" ? null : result.count;
  } catch { return null; }
}

const countOptions = { count: "exact" as const, head: true };
const realAssessmentFilter = 'anamnesis_data.is.null,and(anamnesis_data.not.cs.{"externalPatient":true},anamnesis_data.not.cs.{"quickEvolutionOnly":true},anamnesis_data.not.cs.{"placeholder":true})';

export async function fetchGettingStartedFacts(scope: GettingStartedScope, clinical: boolean, hasAgent: boolean): Promise<GettingStartedFacts> {
  const { userId, professionalId, clinicId } = scope;
  if (!userId || (!clinicId && !professionalId)) throw new Error("Care scope unavailable");
  const scoped = (query: any) => careScope(query, clinicId, professionalId);
  let loads = supabase.from("srpe_entries").select("id, patients!inner(id)", countOptions);
  loads = clinicId ? loads.eq("patients.clinic_id", clinicId) : loads.is("patients.clinic_id", null).eq("patients.professional_id", professionalId ?? "");
  let conversations = supabase.from("agent_messages").select("id, agent_threads!inner(id)", countOptions)
    .eq("role", "assistant").neq("parts", "[]").eq("agent_threads.user_id", userId);
  conversations = clinicId ? conversations.eq("agent_threads.clinic_id", clinicId) : conversations.is("agent_threads.clinic_id", null);

  const [patients, assessments, notes, heps, loadCount, conversationCount, appointments] = await Promise.all([
    count(scoped(supabase.from("patients").select("id", countOptions).eq("is_study_case", false))),
    count(scoped(supabase.from("assessments").select("id", countOptions).in("status", ["completed", "diagnosis_complete"]).or(realAssessmentFilter))),
    clinical ? count(scoped(supabase.from("session_notes").select("id, commitments:professional_appointments!session_notes_appointment_id_fkey()", countOptions)
      .not("content", "match", "^[[:space:]]*$")
      .eq("commitments.service_type", "compromisso").is("commitments", null))) : Promise.resolve(0),
    clinical ? count(scoped(supabase.from("exercise_programs").select("id, exercise_program_items!inner(id)", countOptions))) : Promise.resolve(0),
    clinical ? count(loads) : Promise.resolve(0),
    clinical && hasAgent ? count(conversations) : Promise.resolve(0),
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