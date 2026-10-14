import type jsPDF from "jspdf";

export type PdfRGB = [number, number, number];
const PRIMARY: PdfRGB = [39, 124, 103];
const LIGHT: PdfRGB = [230, 245, 241];
const SOFT: PdfRGB = [150, 200, 186];

export function pdfBrandPalette(color?: string | null) {
  const valid = !!color && /^#[\da-f]{6}$/i.test(color);
  const primary: PdfRGB = valid && color ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)) as PdfRGB : PRIMARY;
  const mix = (weight: number): PdfRGB => primary.map((v) => Math.round(v * weight + 255 * (1 - weight))) as PdfRGB;
  const linear = primary.map((v) => v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return { primary, light: valid ? mix(0.08) : LIGHT, soft: valid ? mix(0.4) : SOFT,
    ink: valid ? primary.map((v) => Math.round(v * 0.65)) as PdfRGB : PRIMARY,
    foreground: luminance > 0.179 ? [0, 0, 0] as PdfRGB : [255, 255, 255] as PdfRGB };
}

/** Rebind only brand-role colors on this document; alert colors are untouched.
 * Existing clinical renderers keep their pagination and semantic palette.
 * No mutable global palette: simultaneous reports cannot leak clinic colors.
 */
export function applyPdfBranding(doc: jsPDF, color?: string | null) {
  const palette = pdfBrandPalette(color);
  if (!color || !/^#[\da-f]{6}$/i.test(color)) return palette;
  for (const method of ["setTextColor", "setFillColor", "setDrawColor"] as const) {
    const original = doc[method].bind(doc) as (...args: (string | number)[]) => jsPDF;
    const rebound = (...args: (string | number)[]) => {
      const matches = (rgb: PdfRGB) => args.length === 3 && rgb.every((v, i) => args[i] === v);
      if (matches(PRIMARY)) return original(...(method === "setTextColor" ? palette.ink : palette.primary));
      if (matches(LIGHT)) return original(...palette.light);
      if (matches(SOFT)) return original(...palette.soft);
      return original(...args);
    };
    Object.defineProperty(doc, method, { value: rebound, writable: true, configurable: true });
  }
  return palette;
}