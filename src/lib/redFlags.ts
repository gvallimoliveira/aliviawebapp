// Helpers to build a probatory red-flag payload (questions + answers + timestamp)
// stored on assessments.red_flags (jsonb) and rendered on the PDF.

import i18n from "@/i18n";

export const RED_FLAG_QUESTION_KEYS = [
  "redflags.trauma",
  "redflags.weight_loss",
  "redflags.fever",
  "redflags.sphincter",
  "redflags.night_pain",
  "redflags.cancer",
  "redflags.numbness_progressive",
  "redflags.recent_surgery",
] as const;

export type RedFlagAnswerEntry = {
  key: string;
  question: string;
  answer: "yes" | "no";
};

export type RedFlagPayload = {
  version: 1;
  answered_at: string;
  language: string;
  user_agent?: string;
  answers: RedFlagAnswerEntry[];
  /** Locale-independent list of question keys the user answered "yes" to. */
  detected: string[];
  any_positive: boolean;
  outcome:
    | "passed"
    | "blocked_premium_payment"
    | "continued_under_reservation"
    | "dismissed_by_professional";
};

/** Read the displayed text of a red-flag question for the given language. */
export function getRedFlagQuestionText(key: string, language: string): string {
  try {
    const text = i18n.t(key, { lng: language });
    if (text && text !== key) return text;
  } catch { /* ignore */ }
  // Fallback to current language
  return i18n.t(key) || key;
}

/** Build the structured payload to persist on assessments.red_flags. */
export function buildRedFlagPayload(
  answers: Record<string, boolean>,
  language: string,
  outcome: RedFlagPayload["outcome"],
): RedFlagPayload {
  const entries: RedFlagAnswerEntry[] = RED_FLAG_QUESTION_KEYS.map((key) => ({
    key,
    question: getRedFlagQuestionText(key, language),
    answer: answers[key] === true ? "yes" : "no",
  }));
  const detected = entries.filter((e) => e.answer === "yes").map((e) => e.key);
  return {
    version: 1,
    answered_at: new Date().toISOString(),
    language,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    answers: entries,
    detected,
    any_positive: detected.length > 0,
    outcome,
  };
}
