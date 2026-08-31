import { supabase } from "@/integrations/supabase/client";

export interface AssessmentAddendum {
  id: string;
  assessment_id: string;
  content: string;
  author_type: string;
  author_name: string | null;
  status: string;
  token: string | null;
  considered_at: string | null;
  created_at: string;
  updated_at: string;
}

const randomToken = (len = 24): string => {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => (b % 36).toString(36)).join("");
};

/** All addenda of an assessment, oldest first. */
export async function fetchAssessmentAddenda(assessmentId: string): Promise<AssessmentAddendum[]> {
  const { data, error } = await supabase
    .from("assessment_addenda")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("fetchAssessmentAddenda failed", error);
    return [];
  }
  return (data || []) as AssessmentAddendum[];
}

/** Addendum written by the professional inside the app. */
export async function createProfessionalAddendum(opts: {
  assessmentId: string;
  content: string;
  authorName?: string | null;
}): Promise<AssessmentAddendum> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("assessment_addenda")
    .insert({
      assessment_id: opts.assessmentId,
      content: opts.content.trim(),
      author_type: "professional",
      author_name: opts.authorName ?? null,
      author_user_id: userData.user?.id ?? null,
      status: "submitted",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AssessmentAddendum;
}

/** Creates the pending row that backs the patient link and returns its token. */
export async function createPatientAddendumRequest(opts: {
  assessmentId: string;
  patientName?: string | null;
}): Promise<{ token: string; row: AssessmentAddendum }> {
  const { data: userData } = await supabase.auth.getUser();
  const token = randomToken(20);
  const { data, error } = await supabase
    .from("assessment_addenda")
    .insert({
      assessment_id: opts.assessmentId,
      content: "",
      author_type: "patient",
      author_name: opts.patientName ?? null,
      author_user_id: userData.user?.id ?? null,
      token,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return { token, row: data as AssessmentAddendum };
}

export async function deleteAddendum(id: string): Promise<void> {
  const { error } = await supabase.from("assessment_addenda").delete().eq("id", id);
  if (error) throw error;
}

/** Addenda already filled in (patient links still pending are not content yet). */
export const filledAddenda = (list: AssessmentAddendum[]): AssessmentAddendum[] =>
  list.filter((a) => (a.content || "").trim().length > 0);

/** Filled addenda that were not yet fed to the AI. */
export const pendingReinterpretation = (list: AssessmentAddendum[]): AssessmentAddendum[] =>
  filledAddenda(list).filter((a) => !a.considered_at);

export const formatAddendaForAi = (list: AssessmentAddendum[], locale = "pt-BR"): string =>
  filledAddenda(list)
    .map((a) => {
      const when = new Date(a.created_at).toLocaleDateString(locale);
      const who = a.author_type === "patient" ? "paciente" : "profissional";
      return `[Adendo — ${when} — ${who}] ${a.content.trim()}`;
    })
    .join("\n");

/**
 * Reinterprets an assessment with its addenda. Preserves the previous diagnosis
 * inside `diagnosis.previousVersions[]` and flags the clinical impression for
 * regeneration. Only called explicitly by the professional (consumes AI credits).
 */
export async function reinterpretAssessmentWithAddenda(opts: {
  assessmentId: string;
  addenda: AssessmentAddendum[];
  language?: string;
}): Promise<any> {
  const { data: assessment, error: fetchErr } = await supabase
    .from("assessments")
    .select("id, anamnesis_data, test_results, diagnosis, red_flags, pain_mechanism, pain_extent")
    .eq("id", opts.assessmentId)
    .single();
  if (fetchErr || !assessment) throw fetchErr || new Error("assessment_not_found");

  const anamnesis: any = assessment.anamnesis_data || {};
  const previousAdditional = typeof anamnesis.additionalInfo === "string" ? anamnesis.additionalInfo : "";
  const addendaText = formatAddendaForAi(opts.addenda);
  const additionalInfo = [previousAdditional, addendaText].filter((s) => s && s.trim()).join("\n");

  const testResults = assessment.test_results;
  const redFlags = (assessment.red_flags as any)?.detected ?? undefined;

  const { data, error } = await supabase.functions.invoke("generate-diagnosis", {
    body: {
      anamnesisData: anamnesis,
      testResults,
      questionnaireResults: Array.isArray(testResults) ? testResults : [],
      mode: "professional",
      language: opts.language === "en" ? "en" : opts.language === "es" ? "es" : "pt",
      additionalInfo,
      redFlags,
      redFlagsDismissed: (assessment.red_flags as any)?.dismissed ?? undefined,
      painMechanism: assessment.pain_mechanism ?? undefined,
      painExtent: assessment.pain_extent ?? undefined,
      forceRefresh: true,
    },
  });
  if (error) throw error;

  const newDiagnosis = data?.diagnosis;
  if (!newDiagnosis?.hypothesis) throw new Error("empty_diagnosis");

  const old: any = assessment.diagnosis || {};
  const previousVersions = Array.isArray(old.previousVersions) ? old.previousVersions : [];
  const merged = {
    ...newDiagnosis,
    // The clinical impression is regenerated separately.
    clinicalImpression: undefined,
    reinterpretedAt: new Date().toISOString(),
    reinterpretedFromAddenda: filledAddenda(opts.addenda).length,
    previousVersions: [
      ...previousVersions,
      {
        at: new Date().toISOString(),
        hypothesis: old.hypothesis ?? null,
        summary: old.summary ?? null,
        confidence: old.confidence ?? null,
      },
    ].slice(-5),
  };

  const { error: upErr } = await supabase
    .from("assessments")
    .update({ diagnosis: merged as any, needs_reimpression: true })
    .eq("id", opts.assessmentId);
  if (upErr) throw upErr;

  const ids = filledAddenda(opts.addenda).filter((a) => !a.considered_at).map((a) => a.id);
  if (ids.length > 0) {
    await supabase
      .from("assessment_addenda")
      .update({ considered_at: new Date().toISOString() })
      .in("id", ids);
  }

  return merged;
}
