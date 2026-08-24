import type { CSSProperties } from "react";
import type { Rng } from "../rng";
import type { WorldContent } from "../content";
import type { StudioPicker } from "../picker";

export type StudioFormat = "9x16" | "1x1" | "free";

export type BlockProps = {
  content: WorldContent;
  rng: Rng;
  /** Visual treatment index for this block instance */
  treatment: number;
  format: StudioFormat;
  /**
   * Seletor com consciência de cobertura. Blocos que escolhem copy de
   * funcionalidade DEVEM usá-lo — sortear direto do array ignora o estudo
   * editorial e desequilibra a divulgação.
   */
  picker: StudioPicker;
};


/** Surface treatments — all inside the brand palette. */
export const SURFACES = [
  "bg-background",
  "bg-secondary/40",
  "bg-primary/5",
  "bg-accent/40",
] as const;

export const surfaceFor = (index: number) => SURFACES[index % SURFACES.length];

export const ALIGNMENTS = ["center", "left", "asym"] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

export const alignClasses = (align: Alignment) => {
  if (align === "center") return { wrapper: "mx-auto max-w-3xl text-center items-center", text: "text-center" };
  if (align === "left") return { wrapper: "max-w-3xl text-left items-start", text: "text-left" };
  return { wrapper: "ml-0 mr-auto max-w-2xl text-left items-start md:ml-[8%]", text: "text-left" };
};

/** Subtle technical mesh, used sparingly as a background layer. */
export const MESH_STYLE: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, hsl(var(--foreground) / 0.05) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.05) 1px, transparent 1px)",
  backgroundSize: "38px 38px",
};

/** Section height contract: blocks must fill the recording frame. */
export const sectionHeight = (format: StudioFormat) =>
  format === "free" ? "min-h-[80svh]" : "min-h-[100svh]";
