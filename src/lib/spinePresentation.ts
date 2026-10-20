import { hasSpineContent, type MaigneAxis, type SpineBiomechanicsData } from "./spineBiomechanics";

// Shared coordinates preserve the professional's drawing in the screen and PDF.
export const MAIGNE_CENTER = { x: 120, y: 125 };
export const MAIGNE_ENDS: Record<MaigneAxis, { x: number; y: number; lx: number; ly: number; main: string; sub?: string }> = {
  F: { x: 120, y: 20, lx: 132, ly: 26, main: "F" },
  E: { x: 120, y: 225, lx: 132, ly: 232, main: "E" },
  RE: { x: 25, y: 125, lx: 16, ly: 148, main: "R", sub: "E" },
  RD: { x: 215, y: 125, lx: 214, ly: 148, main: "R", sub: "D" },
  IE: { x: 55, y: 55, lx: 36, ly: 46, main: "I", sub: "E" },
  ID: { x: 185, y: 55, lx: 192, ly: 46, main: "I", sub: "D" },
};

export interface SavedSpineExam { date: string; data: SpineBiomechanicsData }

/** Explicit saved exams only: a newer assessment without an exam never erases history. */
export function savedSpineExams(entries: Array<{ date: string; spineBiomechanics?: SpineBiomechanicsData | null }>): SavedSpineExam[] {
  return entries.flatMap((entry) => entry.spineBiomechanics && hasSpineContent(entry.spineBiomechanics)
    ? [{ date: entry.date, data: entry.spineBiomechanics }] : [])
    .sort((a, b) => a.date.localeCompare(b.date));
}