/**
 * Normalizes anamnesis_data coming from a *manual* assessment (stored as raw
 * stems like "gradual", "local", free-text chiefComplaint) into the i18n-keyed
 * format the patient-facing AnamnesisForm expects ("anamnesis.onset.gradual",
 * "anamnesis.pain_type.local", "anamnesis.complaint.elbow_pain", ...).
 *
 * Link-flow assessments already use i18n keys, so values that already start
 * with "anamnesis." are returned unchanged.
 */

const ONSET_KEYS = new Set(["sudden", "gradual", "trauma", "post_surgery"]);
const PAIN_TYPE_KEYS = new Set([
  "local",
  "radiating",
  "burning",
  "tingling",
  "throbbing",
  "stabbing",
]);
const ACTIVITY_KEYS = new Set(["sedentary", "light", "regular", "athlete"]);

const toI18n = (prefix: string, value: string | undefined, allowed: Set<string>): string | undefined => {
  if (!value) return undefined;
  if (value.startsWith("anamnesis.")) return value;
  if (allowed.has(value)) return `${prefix}.${value}`;
  return undefined;
};

/**
 * Derive a chiefComplaints array (in the i18n key format used by the link
 * AnamnesisForm) from the painMap region IDs (e.g. "left_elbow" → "anamnesis.complaint.elbow_pain").
 * Returns null if no region matched a known complaint group.
 */
export const deriveComplaintsFromRegions = (regions: string[] | null | undefined): string[] | null => {
  if (!regions?.length) return null;
  const out = new Set<string>();
  for (const r of regions) {
    const id = String(r).toLowerCase();
    if (/head(_back)?$/.test(id) || id === "head" || id === "head_back") out.add("anamnesis.complaint.headache");
    else if (id.includes("cervical") || id.includes("neck")) out.add("anamnesis.complaint.neck_pain");
    else if (id.includes("shoulder")) out.add("anamnesis.complaint.shoulder_pain");
    else if (id.includes("elbow")) out.add("anamnesis.complaint.elbow_pain");
    else if (id.includes("wrist") || id.includes("hand")) out.add("anamnesis.complaint.wrist_pain");
    else if (id.includes("hip") || id.includes("gluteal")) out.add("anamnesis.complaint.hip_pain");
    else if (id.includes("knee")) out.add("anamnesis.complaint.knee_pain");
    else if (id.includes("ankle")) out.add("anamnesis.complaint.ankle_pain");
    else if (id.includes("foot")) out.add("anamnesis.complaint.foot_pain");
    else if (
      id.includes("lumbar") ||
      id.includes("lower_back") ||
      id.includes("thoracic") ||
      id.includes("back")
    ) out.add("anamnesis.complaint.back_pain");
  }
  return out.size > 0 ? Array.from(out) : null;
};

export interface NormalizedAnamnesis {
  onset?: string;
  painType?: string;
  painTypes?: string[];
  activityLevel?: string;
  chiefComplaints?: string[];
}

export const normalizeAnamnesisForReassessment = (
  anam: any,
  painRegions: string[] | null | undefined,
): NormalizedAnamnesis => {
  const out: NormalizedAnamnesis = {};

  const onset = toI18n("anamnesis.onset", anam?.onset, ONSET_KEYS);
  if (onset) out.onset = onset;

  const pt = toI18n("anamnesis.pain_type", anam?.painType, PAIN_TYPE_KEYS);
  if (pt) out.painType = pt;

  if (Array.isArray(anam?.painTypes)) {
    const mapped = anam.painTypes
      .map((v: string) => toI18n("anamnesis.pain_type", v, PAIN_TYPE_KEYS))
      .filter(Boolean) as string[];
    if (mapped.length > 0) out.painTypes = mapped;
  }

  const act = toI18n("anamnesis.activity", anam?.activityLevel, ACTIVITY_KEYS);
  if (act) out.activityLevel = act;

  // chiefComplaints: prefer existing i18n-keyed array, else derive from regions
  const raw: string[] = Array.isArray(anam?.chiefComplaints)
    ? anam.chiefComplaints
    : anam?.chiefComplaint
      ? [anam.chiefComplaint]
      : [];
  const keyed = raw.filter((c) => typeof c === "string" && c.startsWith("anamnesis.complaint."));
  if (keyed.length > 0) {
    out.chiefComplaints = keyed;
  } else {
    const derived = deriveComplaintsFromRegions(painRegions);
    if (derived) out.chiefComplaints = derived;
  }

  return out;
};
