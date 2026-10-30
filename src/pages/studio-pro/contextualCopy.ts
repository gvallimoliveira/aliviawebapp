import { frameEditorialLoss } from "./narrativeArc";

export const HEP_MEANING = "Programa de exercícios domiciliares";
const LEADS = ["title", "heading", "word", "strong", "label", "kicker", "tag"];
const SUPPORTS = ["body", "description", "caption", "rest", "line", "coverSub", "promise", "sub", "text", "moral"];
const VISIBLE = new Set([...LEADS, ...SUPPORTS, "closing"]);

/** Revisão de texto visível: nunca modifica IDs, vínculos de foto ou dados do kit. */
export const clarifyStudioCopy = <T>(value: T, key = ""): T => {
  if (typeof value === "string") {
    if (!VISIBLE.has(key)) return value;
    return value.replace(/(?:e\s+)?o custo aparece [nm]a rotina\s*:\s*([^.!?]+[.!?]?)/gi,
      (_, loss: string) => frameEditorialLoss(loss)) as T;
  }
  if (Array.isArray(value)) return value.map((child) => clarifyStudioCopy(child, key)) as T;
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const revised = Object.fromEntries(Object.entries(source).map(([childKey, child]) =>
    [childKey, clarifyStudioCopy(child, childKey)]));
  const visible = [...VISIBLE].map((field) => typeof revised[field] === "string" ? revised[field] as string : "").join(" ");
  if (/\bHEP\b/i.test(visible) && !/programa de exerc[ií]cios domiciliares/i.test(visible)) {
    const support = SUPPORTS.find((field) => typeof revised[field] === "string" && (revised[field] as string).trim());
    if (support) {
      const text = revised[support] as string;
      revised[support] = /\bHEP\b/i.test(text)
        ? text.replace(/\bHEP\b/i, `${HEP_MEANING} (HEP)`)
        : `${HEP_MEANING} (HEP): ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    }
    else {
      const lead = LEADS.find((field) => typeof revised[field] === "string" && /\bHEP\b/i.test(revised[field] as string));
      if (lead) revised[lead] = (revised[lead] as string).replace(/\bHEP\b/i, `${HEP_MEANING} (HEP)`);
    }
  }
  return revised as T;
};