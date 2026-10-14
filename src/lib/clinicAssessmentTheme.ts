import type { CSSProperties } from "react";

/** Scope institutional colors to the assessment, never to the global theme. */
export function clinicAssessmentTheme(color?: string | null): CSSProperties | undefined {
  if (!color || !/^#[\da-f]{6}$/i.test(color)) return undefined;
  const channels = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  if (delta) {
    hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) * 100 : 0;
  const primary = `${hue.toFixed(1)} ${saturation.toFixed(1)}% ${(lightness * 100).toFixed(1)}%`;
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return {
    "--primary": primary,
    "--ring": primary,
    "--primary-foreground": luminance > 0.179 ? "0 0% 0%" : "0 0% 100%",
    "--clinic-ink": `${hue.toFixed(1)} ${saturation.toFixed(1)}% ${Math.min(lightness * 100, 35).toFixed(1)}%`,
  } as CSSProperties;
}