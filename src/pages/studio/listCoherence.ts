import { meaningWords, textSimilarity } from "@/pages/studio-pro/narrativeArc";

const normalizeItem = (text: string) => text.toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Same argument, not merely the same subject. Shared prefixes alone are insufficient. */
export const repeatsListIdea = (a: string, b: string): boolean => {
  if (normalizeItem(a) === normalizeItem(b)) return true;
  const left = new Set(meaningWords(a));
  const right = new Set(meaningWords(b));
  if (Math.min(left.size, right.size) < 3) return false;
  const shared = [...left].filter((word) => right.has(word)).length;
  const coverage = shared / Math.max(left.size, right.size);
  return coverage >= 0.8 && textSimilarity(a, b) >= 0.78;
};

/** Keep only original, complementary arguments; never pad with invented claims. */
export const distinctListItems = (items: readonly string[]): string[] => {
  const kept: string[] = [];
  for (const item of items) {
    const clean = item.trim();
    if (clean && !kept.some((previous) => repeatsListIdea(previous, clean))) kept.push(clean);
  }
  return kept;
};

/** Narrow traversal: copy lists only, never IDs, photo metadata or ordered clinical steps. */
export const finalizeListCoherence = <T>(value: T, key = ""): T => {
  if (Array.isArray(value)) {
    if (["items", "before", "after", "marquee"].includes(key) && value.every((item) => typeof item === "string")) {
      return distinctListItems(value as string[]) as T;
    }
    return value.map((child) => finalizeListCoherence(child, key)) as T;
  }
  if (!value || typeof value !== "object") return value;
  const revised = Object.fromEntries(Object.entries(value).map(([field, child]) =>
    [field, finalizeListCoherence(child, field)]));
  const lead = ["headline", "title", "heading"].map((field) => revised[field]).find((text): text is string => typeof text === "string" && text.trim().length > 0);
  if (lead && Array.isArray(revised.items) && revised.items.every((item) => typeof item === "string")) {
    // A list develops its title; an item restating it is repetition, not an argument.
    const developing = (revised.items as string[]).filter((item) => !repeatsListIdea(lead, item));
    if (developing.length) revised.items = developing;
  }
  if (Array.isArray(revised.items) && revised.items.every((item) => typeof item === "string") && typeof revised.heading === "string") {
    revised.heading = revised.heading.replace(/^\d+(?=\s)/, String(revised.items.length));
  }
  return revised as T;
};