import { Activity, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RomRow = {
  joint: string;
  leftValue: string;
  rightValue: string;
};

export const EMPTY_ROM_ROW: RomRow = { joint: "", leftValue: "", rightValue: "" };

export const createInitialRomRows = (n = 2): RomRow[] =>
  Array.from({ length: n }, () => ({ ...EMPTY_ROM_ROW }));

/** Removes blank rows for persistence / display. */
export const sanitizeRomRows = (rows: RomRow[] | undefined | null): RomRow[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({
      joint: (r?.joint || "").trim(),
      leftValue: (r?.leftValue || "").trim(),
      rightValue: (r?.rightValue || "").trim(),
    }))
    .filter((r) => r.joint || r.leftValue || r.rightValue);
};

type Lang = "pt" | "en" | "es" | string;

const STR: Record<string, Record<string, string>> = {
  pt: {
    title: "Mobilidade Articular — Arco de Movimento (ADM)",
    subtitle:
      "Registre o movimento avaliado e a amplitude observada para cada lado. Adicione quantas linhas precisar.",
    colJoint: "Articulação / Movimento",
    colLeft: "Esquerda",
    colRight: "Direita",
    placeholderJoint: "Ex.: Flexão de joelho",
    placeholderValue: "Ex.: 90°",
    addRow: "Adicionar linha",
    removeRow: "Remover linha",
    empty: "Nenhum dado de mobilidade articular registrado.",
    suggestionsLabel: "Sugestões rápidas:",
    sFlexion: "Flexão",
    sExtension: "Extensão",
    sAbduction: "Abdução",
    sAdduction: "Adução",
    sIntRot: "Rotação interna",
    sExtRot: "Rotação externa",
  },
  en: {
    title: "Joint Mobility — Range of Motion (ROM)",
    subtitle:
      "Record the assessed movement and observed range for each side. Add as many rows as needed.",
    colJoint: "Joint / Movement",
    colLeft: "Left",
    colRight: "Right",
    placeholderJoint: "e.g. Knee flexion",
    placeholderValue: "e.g. 90°",
    addRow: "Add row",
    removeRow: "Remove row",
    empty: "No joint mobility data recorded.",
    suggestionsLabel: "Quick suggestions:",
    sFlexion: "Flexion",
    sExtension: "Extension",
    sAbduction: "Abduction",
    sAdduction: "Adduction",
    sIntRot: "Internal rotation",
    sExtRot: "External rotation",
  },
  es: {
    title: "Movilidad Articular — Rango de Movimiento (ADM)",
    subtitle:
      "Registre el movimiento evaluado y la amplitud observada para cada lado. Agregue tantas filas como necesite.",
    colJoint: "Articulación / Movimiento",
    colLeft: "Izquierda",
    colRight: "Derecha",
    placeholderJoint: "Ej.: Flexión de rodilla",
    placeholderValue: "Ej.: 90°",
    addRow: "Agregar fila",
    removeRow: "Eliminar fila",
    empty: "Sin datos de movilidad articular registrados.",
    suggestionsLabel: "Sugerencias rápidas:",
    sFlexion: "Flexión",
    sExtension: "Extensión",
    sAbduction: "Abducción",
    sAdduction: "Aducción",
    sIntRot: "Rotación interna",
    sExtRot: "Rotación externa",
  },
};

function s(lang: Lang, key: string): string {
  return STR[lang]?.[key] ?? STR.pt[key] ?? key;
}

interface RomTableProps {
  value: RomRow[];
  onChange?: (rows: RomRow[]) => void;
  readOnly?: boolean;
  lang?: Lang;
  /** Hide outer card chrome (used when embedded inside another section). */
  bare?: boolean;
}

export default function RomTable({
  value,
  onChange,
  readOnly = false,
  lang = "pt",
  bare = false,
}: RomTableProps) {
  const rows = Array.isArray(value) ? value : [];

  const update = (i: number, field: keyof RomRow, val: string) => {
    if (!onChange) return;
    const next = rows.map((r, idx) =>
      idx === i ? { ...r, [field]: val } : r,
    );
    onChange(next);
  };

  const addRow = () => onChange?.([...rows, { ...EMPTY_ROM_ROW }]);

  const removeRow = (i: number) => {
    if (!onChange) return;
    const next = rows.filter((_, idx) => idx !== i);
    // Always keep at least one empty row to avoid an empty editor.
    onChange(next.length === 0 ? [{ ...EMPTY_ROM_ROW }] : next);
  };

  const applySuggestion = (label: string) => {
    if (!onChange) return;
    const idx = rows.findIndex((r) => !r.joint.trim());
    if (idx === -1) {
      onChange([...rows, { joint: label, leftValue: "", rightValue: "" }]);
    } else {
      update(idx, "joint", label);
    }
  };

  // ── Read-only display ──
  if (readOnly) {
    const cleaned = sanitizeRomRows(rows);
    if (cleaned.length === 0) return null;

    return (
      <div className={cn(!bare && "rounded-2xl border border-border bg-card p-4 sm:p-5")}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
            <Activity className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {s(lang, "title")}
            </h3>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">{s(lang, "colJoint")}</th>
                <th className="px-3 py-2 font-semibold text-center w-[22%]">{s(lang, "colLeft")}</th>
                <th className="px-3 py-2 font-semibold text-center w-[22%]">{s(lang, "colRight")}</th>
              </tr>
            </thead>
            <tbody>
              {cleaned.map((r, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-t border-border",
                    i % 2 === 1 && "bg-muted/20",
                  )}
                >
                  <td className="px-3 py-2 text-foreground">{r.joint || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    {r.leftValue ? (
                      <Badge variant="secondary" className="font-mono">
                        {r.leftValue}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.rightValue ? (
                      <Badge variant="secondary" className="font-mono">
                        {r.rightValue}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Editable display ──
  const suggestions = [
    s(lang, "sFlexion"),
    s(lang, "sExtension"),
    s(lang, "sAbduction"),
    s(lang, "sAdduction"),
    s(lang, "sIntRot"),
    s(lang, "sExtRot"),
  ];

  return (
    <div className={cn(!bare && "rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm")}>
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
          <Activity className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-tight">
            {s(lang, "title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {s(lang, "subtitle")}
          </p>
        </div>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-[11px] text-muted-foreground mr-1">
          {s(lang, "suggestionsLabel")}
        </span>
        {suggestions.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => applySuggestion(label)}
            className="px-2 py-0.5 rounded-full text-[11px] border border-border bg-background hover:border-primary/50 hover:bg-primary/5 text-foreground transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="hidden sm:grid grid-cols-[1fr_120px_120px_36px] gap-2 px-1 pb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
        <div>{s(lang, "colJoint")}</div>
        <div className="text-center">{s(lang, "colLeft")}</div>
        <div className="text-center">{s(lang, "colRight")}</div>
        <div />
      </div>

      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_88px_88px_32px] sm:grid-cols-[1fr_120px_120px_36px] gap-1.5 sm:gap-2 items-center group"
          >
            <Input
              value={row.joint}
              onChange={(e) => update(i, "joint", e.target.value)}
              placeholder={s(lang, "placeholderJoint")}
              className="h-9 text-sm"
            />
            <Input
              value={row.leftValue}
              onChange={(e) => update(i, "leftValue", e.target.value)}
              placeholder={s(lang, "placeholderValue")}
              className="h-9 text-sm text-center font-mono"
            />
            <Input
              value={row.rightValue}
              onChange={(e) => update(i, "rightValue", e.target.value)}
              placeholder={s(lang, "placeholderValue")}
              className="h-9 text-sm text-center font-mono"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(i)}
              aria-label={s(lang, "removeRow")}
              title={s(lang, "removeRow")}
              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {s(lang, "addRow")}
        </Button>
      </div>
    </div>
  );
}
