import React from "react";
import { Activity, Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
    title: "Mobilidade articular e flexibilidade",
    subtitle:
      "Registre ADM articular (graus) e testes de flexibilidade muscular (graus ou cm) para cada lado. Importe uma ficha ou digite.",
    colJoint: "Articulação / Movimento",
    colLeft: "Esquerda",
    colRight: "Direita",
    placeholderJoint: "Ex.: Flexão de joelho",
    placeholderValue: "Ex.: 90° ou 12 cm",
    importBtn: "Importar de imagem/PDF",
    importing: "Lendo arquivo…",
    importOk: "Medidas importadas — revise antes de salvar",
    importFail: "Não foi possível ler medidas do arquivo",
    fileTooLarge: "Arquivo acima de 10 MB",
    flexLabel: "Flexibilidade:",
    fSlr: "Elevação da perna estendida (isquiotibiais)",
    fPop: "Ângulo poplíteo (isquiotibiais)",
    fSit: "Sentar e alcançar (cm)",
    fThomas: "Teste de Thomas (flexores do quadril)",
    fEly: "Teste de Ely (reto femoral)",
    fLunge: "Dorsiflexão em carga – lunge (°)",
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
    title: "Joint mobility and flexibility",
    subtitle:
      "Record joint ROM (degrees) and muscle flexibility tests (degrees or cm) per side. Import a sheet or type.",
    colJoint: "Joint / Movement",
    colLeft: "Left",
    colRight: "Right",
    placeholderJoint: "e.g. Knee flexion",
    placeholderValue: "e.g. 90° or 12 cm",
    importBtn: "Import from image/PDF",
    importing: "Reading file…",
    importOk: "Measurements imported — review before saving",
    importFail: "Could not read measurements from the file",
    fileTooLarge: "File over 10 MB",
    flexLabel: "Flexibility:",
    fSlr: "Straight leg raise (hamstrings)",
    fPop: "Popliteal angle (hamstrings)",
    fSit: "Sit and reach (cm)",
    fThomas: "Thomas test (hip flexors)",
    fEly: "Ely test (rectus femoris)",
    fLunge: "Weight-bearing lunge (°)",
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
    title: "Movilidad articular y flexibilidad",
    subtitle:
      "Registre ADM articular (grados) y pruebas de flexibilidad muscular (grados o cm) por lado. Importe una ficha o escriba.",
    colJoint: "Articulación / Movimiento",
    colLeft: "Izquierda",
    colRight: "Derecha",
    placeholderJoint: "Ej.: Flexión de rodilla",
    placeholderValue: "Ej.: 90° o 12 cm",
    importBtn: "Importar desde imagen/PDF",
    importing: "Leyendo archivo…",
    importOk: "Medidas importadas — revise antes de guardar",
    importFail: "No se pudieron leer medidas del archivo",
    fileTooLarge: "Archivo de más de 10 MB",
    flexLabel: "Flexibilidad:",
    fSlr: "Elevación de pierna recta (isquiotibiales)",
    fPop: "Ángulo poplíteo (isquiotibiales)",
    fSit: "Sentarse y alcanzar (cm)",
    fThomas: "Test de Thomas (flexores de cadera)",
    fEly: "Test de Ely (recto femoral)",
    fLunge: "Dorsiflexión en carga – lunge (°)",
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
  disableImport?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function RomTable({
  value,
  onChange,
  readOnly = false,
  lang = "pt",
  bare = false,
  disableImport = false,
}: RomTableProps) {
  const rows = Array.isArray(value) ? value : [];
  const { toast } = useToast();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = React.useState(false);

  const handleFiles: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 6);
    e.target.value = "";
    if (!files.length || !onChange) return;
    if (files.some((f) => f.size > 10 * 1024 * 1024)) {
      toast({ title: s(lang, "fileTooLarge"), variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const extracted: RomRow[] = [];
      for (const file of files) {
        const { data, error } = await supabase.functions.invoke("extract-rom", {
          body: { fileBase64: await fileToBase64(file), mimeType: file.type || "application/octet-stream", fileName: file.name },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        extracted.push(...sanitizeRomRows(data?.rows));
      }
      if (!extracted.length) {
        toast({ title: s(lang, "importFail"), variant: "destructive" });
        return;
      }
      onChange([...sanitizeRomRows(rows), ...extracted]);
      toast({ title: s(lang, "importOk"), description: `${extracted.length}` });
    } catch (err: any) {
      toast({ title: s(lang, "importFail"), description: err?.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

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

  const flexSuggestions = ["fSlr", "fPop", "fSit", "fThomas", "fEly", "fLunge"].map((k) => s(lang, k));

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

      {!disableImport && (
        <div className="mb-3">
          <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFiles} />
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={importing} onClick={() => fileRef.current?.click()}>
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {importing ? s(lang, "importing") : s(lang, "importBtn")}
          </Button>
        </div>
      )}

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
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-[11px] text-muted-foreground mr-1">{s(lang, "flexLabel")}</span>
        {flexSuggestions.map((label) => (
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

      {/* Header (desktop only) */}
      <div className="hidden sm:grid grid-cols-[1fr_120px_120px_36px] gap-2 px-1 pb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
        <div>{s(lang, "colJoint")}</div>
        <div className="text-center">{s(lang, "colLeft")}</div>
        <div className="text-center">{s(lang, "colRight")}</div>
        <div />
      </div>

      <div className="space-y-2 sm:space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="group">
            {/* Mobile: stacked label on top, two values + delete on bottom */}
            <div className="sm:hidden rounded-xl border border-border bg-background/40 p-2 space-y-1.5">
              <Input
                value={row.joint}
                onChange={(e) => update(i, "joint", e.target.value)}
                placeholder={s(lang, "placeholderJoint")}
                className="h-9 text-sm"
              />
              <div className="grid grid-cols-[1fr_1fr_36px] gap-1.5 items-center">
                <Input
                  value={row.leftValue}
                  onChange={(e) => update(i, "leftValue", e.target.value)}
                  placeholder={`${s(lang, "colLeft")}`}
                  inputMode="text"
                  className="h-9 text-sm text-center font-mono"
                />
                <Input
                  value={row.rightValue}
                  onChange={(e) => update(i, "rightValue", e.target.value)}
                  placeholder={`${s(lang, "colRight")}`}
                  inputMode="text"
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
            </div>

            {/* Desktop: single row */}
            <div className="hidden sm:grid grid-cols-[1fr_120px_120px_36px] gap-2 items-center">
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
                inputMode="text"
                className="h-9 text-sm text-center font-mono"
              />
              <Input
                value={row.rightValue}
                onChange={(e) => update(i, "rightValue", e.target.value)}
                placeholder={s(lang, "placeholderValue")}
                inputMode="text"
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
