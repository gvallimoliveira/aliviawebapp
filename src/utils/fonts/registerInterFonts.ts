// Registers the embedded Inter font family on a jsPDF instance.
// This avoids the "Standard 14" Helvetica substitution problem where some PDF
// readers (Chrome on Linux/Android, poppler, several mobile viewers) ship a
// substitute font with mismatched widths, producing visible character gaps in
// bold text. Embedding Inter (subsetted to Latin + Latin Extended) guarantees
// pixel-identical rendering across every viewer.
import type { jsPDF } from "jspdf";
import {
  InterRegularBase64,
  InterBoldBase64,
  InterItalicBase64,
  InterBoldItalicBase64,
} from "./interFonts";

let registeredOnPrototype = false;

const FONT_FAMILY = "Inter";

interface FontVariant {
  file: string;
  style: "normal" | "bold" | "italic" | "bolditalic";
  data: string;
}

const VARIANTS: FontVariant[] = [
  { file: "Inter-Regular.ttf", style: "normal", data: InterRegularBase64 },
  { file: "Inter-Bold.ttf", style: "bold", data: InterBoldBase64 },
  { file: "Inter-Italic.ttf", style: "italic", data: InterItalicBase64 },
  { file: "Inter-BoldItalic.ttf", style: "bolditalic", data: InterBoldItalicBase64 },
];

/**
 * Registers the Inter font family on the given jsPDF document.
 * Safe to call multiple times — jsPDF deduplicates VFS entries.
 */
export function registerInterFonts(doc: jsPDF): void {
  for (const v of VARIANTS) {
    try {
      doc.addFileToVFS(v.file, v.data);
      doc.addFont(v.file, FONT_FAMILY, v.style);
    } catch {
      // ignore — font may already be registered on this instance
    }
  }
  registeredOnPrototype = true;
}

export const PDF_FONT_FAMILY = FONT_FAMILY;
export const _registeredOnPrototype = () => registeredOnPrototype;
