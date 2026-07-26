import { useRef, useState } from "react";
import { Dumbbell, Plus, Trash2, Upload, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type StrengthRow = {
  movement: string;
  leftValue: string;
  rightValue: string;
  /** Always "kgf" today. Kept on the row for future-proofing. */
  unit?: string;
  /** True when row was filled by AI extraction and still needs human review. */
  aiExtracted?: boolean;
};

export const EMPTY_STRENGTH_ROW: StrengthRow = {
  movement: "",
  leftValue: "",
  rightValue: "",
  unit: "kgf",
};

export const createInitialStrengthRows = (n = 2): StrengthRow[] =>
  Array.from({ length: n }, () => ({ ...EMPTY_STRENGTH_ROW }));

export const sanitizeStrengthRows = (
  rows: StrengthRow[] | undefined | null,
): StrengthRow[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({
      movement: (r?.movement || "").trim(),
      leftValue: (r?.leftValue || "").trim(),
      rightValue: (r?.rightValue || "").trim(),
      unit: (r?.unit || "kgf").trim() || "kgf",
    }))
    .filter((r) => r.movement || r.leftValue || r.rightValue);
};

/** Asymmetry percent between left and right values (0-100). Returns null if not computable. */
export const computeAsymmetry = (
  left: string | number,
  right: string | number,
): number | null => {
  const L = typeof left === "number" ? left : parseFloat(String(left).replace(",", "."));
  const R = typeof right === "number" ? right : parseFloat(String(right).replace(",", "."));
  if (!isFinite(L) || !isFinite(R) || L <= 0 || R <= 0) return null;
  const max = Math.max(L, R);
  return Math.round((Math.abs(L - R) / max) * 100);
};

const asymmetryBadgeClass = (pct: number): string => {
  if (pct <= 10) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (pct <= 20) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
};

type Lang = "pt" | "en" | "es" | string;

const STR: Record<string, Record<string, string>> = {
  pt: {
    title: "Dinamometria — Força Muscular (kgf)",
    subtitle:
      "Registre cada movimento testado com os valores em quilograma-força (kgf). Ou anexe o laudo/imagem da dinamometria e a IA preenche para você revisar.",
    colMovement: "Movimento testado",
    colLeft: "Esquerda (kgf)",
    colRight: "Direita (kgf)",
    shortLeft: "Esquerda",
    shortRight: "Direita",
    initialLeft: "E",
    initialRight: "D",
    placeholderMovement: "Ex.: Preensão manual",
    placeholderValue: "Ex.: 32.5",
    addRow: "Adicionar linha",
    removeRow: "Remover linha",
    suggestionsLabel: "Sugestões rápidas:",
    sGrip: "Preensão manual",
    sElbowFlex: "Flexão de cotovelo",
    sShoulderAbd: "Abdução de ombro",
    sKneeExt: "Extensão de joelho",
    sKneeFlex: "Flexão de joelho",
    sHipAbd: "Abdução de quadril",
    importBtn: "Importar de imagem/PDF",
    importing: "Lendo arquivo…",
    importTip: "JPG, PNG, HEIC ou PDF — até 10MB",
    aiBadge: "Preenchido pela IA — revise antes de salvar",
    asymTitle: "Assimetria",
    fileTooLarge: "Arquivo maior que 10MB.",
    extractFail: "Não foi possível interpretar o arquivo.",
    extractOk: "Dinamometria extraída! Revise os valores abaixo.",
    extractMsg1: "Lendo o arquivo…",
    extractMsg2: "Identificando movimentos avaliados…",
    extractMsg3: "Tabelando valores de força…",
    extractMsg4: "Quase lá — organizando os resultados…",
    empty: "Nenhum dado de dinamometria registrado.",
  },
  en: {
    title: "Dynamometry — Muscle Strength (kgf)",
    subtitle:
      "Record each tested movement in kilogram-force (kgf). Or attach the dynamometry report/image and AI will fill it in for you to review.",
    colMovement: "Tested movement",
    colLeft: "Left (kgf)",
    colRight: "Right (kgf)",
    shortLeft: "Left",
    shortRight: "Right",
    initialLeft: "L",
    initialRight: "R",
    placeholderMovement: "e.g. Handgrip",
    placeholderValue: "e.g. 32.5",
    addRow: "Add row",
    removeRow: "Remove row",
    suggestionsLabel: "Quick suggestions:",
    sGrip: "Handgrip",
    sElbowFlex: "Elbow flexion",
    sShoulderAbd: "Shoulder abduction",
    sKneeExt: "Knee extension",
    sKneeFlex: "Knee flexion",
    sHipAbd: "Hip abduction",
    importBtn: "Import from image/PDF",
    importing: "Reading file…",
    importTip: "JPG, PNG, HEIC or PDF — up to 10MB",
    aiBadge: "Filled by AI — review before saving",
    asymTitle: "Asymmetry",
    fileTooLarge: "File larger than 10MB.",
    extractFail: "Could not interpret the file.",
    extractOk: "Dynamometry extracted! Review the values below.",
    extractMsg1: "Reading the file…",
    extractMsg2: "Identifying tested movements…",
    extractMsg3: "Tabulating strength values…",
    extractMsg4: "Almost there — organizing results…",
    empty: "No dynamometry data recorded.",
  },
  es: {
    title: "Dinamometría — Fuerza Muscular (kgf)",
    subtitle:
      "Registre cada movimiento evaluado en kilogramo-fuerza (kgf). O adjunte el informe/imagen y la IA lo completará para que usted revise.",
    colMovement: "Movimiento evaluado",
    colLeft: "Izquierda (kgf)",
    colRight: "Derecha (kgf)",
    shortLeft: "Izquierda",
    shortRight: "Derecha",
    initialLeft: "I",
    initialRight: "D",
    placeholderMovement: "Ej.: Prensión manual",
    placeholderValue: "Ej.: 32.5",
    addRow: "Agregar fila",
    removeRow: "Eliminar fila",
    suggestionsLabel: "Sugerencias rápidas:",
    sGrip: "Prensión manual",
    sElbowFlex: "Flexión de codo",
    sShoulderAbd: "Abducción de hombro",
    sKneeExt: "Extensión de rodilla",
    sKneeFlex: "Flexión de rodilla",
    sHipAbd: "Abducción de cadera",
    importBtn: "Importar desde imagen/PDF",
    importing: "Leyendo archivo…",
    importTip: "JPG, PNG, HEIC o PDF — hasta 10MB",
    aiBadge: "Completado por IA — revise antes de guardar",
    asymTitle: "Asimetría",
    fileTooLarge: "Archivo mayor a 10MB.",
    extractFail: "No se pudo interpretar el archivo.",
    extractOk: "¡Dinamometría extraída! Revise los valores.",
    extractMsg1: "Leyendo el archivo…",
    extractMsg2: "Identificando movimientos evaluados…",
    extractMsg3: "Tabulando valores de fuerza…",
    extractMsg4: "Casi listo — organizando resultados…",
    empty: "Sin datos de dinamometría registrados.",
  },
};

function s(lang: Lang, key: string): string {
  return STR[lang]?.[key] ?? STR.pt[key] ?? key;
}

interface StrengthTableProps {
  value: StrengthRow[];
  onChange?: (rows: StrengthRow[]) => void;
  readOnly?: boolean;
  lang?: Lang;
  /** Hide outer card chrome (used when embedded inside another section). */
  bare?: boolean;
  /** Disable the AI import button (e.g. on demo mode). */
  disableImport?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export default function StrengthTable({
  value,
  onChange,
  readOnly = false,
  lang = "pt",
  bare = false,
  disableImport = false,
}: StrengthTableProps) {
  const { toast } = useToast();
  const rows = Array.isArray(value) ? value : [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsgIdx, setImportMsgIdx] = useState(0);

  const update = (i: number, field: keyof StrengthRow, val: string) => {
    if (!onChange) return;
    const next = rows.map((r, idx) =>
      idx === i ? { ...r, [field]: val, aiExtracted: false } : r,
    );
    onChange(next);
  };

  const addRow = () => onChange?.([...rows, { ...EMPTY_STRENGTH_ROW }]);

  const removeRow = (i: number) => {
    if (!onChange) return;
    const next = rows.filter((_, idx) => idx !== i);
    onChange(next.length === 0 ? [{ ...EMPTY_STRENGTH_ROW }] : next);
  };

  const applySuggestion = (label: string) => {
    if (!onChange) return;
    const idx = rows.findIndex((r) => !r.movement.trim());
    if (idx === -1) {
      onChange([...rows, { ...EMPTY_STRENGTH_ROW, movement: label }]);
    } else {
      update(idx, "movement", label);
    }
  };

  const handleFilePicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onChange) return;
    // Reset so picking the same file twice still triggers the change event.
    e.target.value = "";

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: s(lang, "fileTooLarge"), variant: "destructive" });
      return;
    }

    setImporting(true);
    setImportMsgIdx(0);
    const interval = window.setInterval(
      () => setImportMsgIdx((i) => (i + 1) % 4),
      1800,
    );

    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-dynamometry", {
        body: {
          fileBase64: base64,
          mimeType: file.type || "application/octet-stream",
          fileName: file.name,
          language: lang,
        },
      });
      if (error) throw error;
      const extracted: StrengthRow[] = Array.isArray(data?.rows)
        ? data.rows
            .map((r: any) => ({
              movement: String(r?.movement ?? "").trim(),
              leftValue: r?.leftValue == null ? "" : String(r.leftValue).trim(),
              rightValue: r?.rightValue == null ? "" : String(r.rightValue).trim(),
              unit: "kgf",
              aiExtracted: true,
            }))
            .filter((r: StrengthRow) => r.movement || r.leftValue || r.rightValue)
        : [];
      if (extracted.length === 0) {
        toast({ title: s(lang, "extractFail"), variant: "destructive" });
        return;
      }
      // Merge: keep existing non-empty rows, then append extracted ones.
      const existingFilled = sanitizeStrengthRows(rows);
      onChange([...existingFilled, ...extracted]);
      toast({ title: s(lang, "extractOk") });
    } catch (err: any) {
      console.error("Dynamometry extract error:", err);
      toast({
        title: s(lang, "extractFail"),
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      window.clearInterval(interval);
      setImporting(false);
    }
  };

  // ── Read-only display ──
  if (readOnly) {
    const cleaned = sanitizeStrengthRows(rows);
    if (cleaned.length === 0) return null;

    return (
      <div className={cn(!bare && "rounded-2xl border border-border bg-card p-4 sm:p-5")}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
            <Dumbbell className="h-4 w-4" />
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
                <th className="px-3 py-2 font-semibold">{s(lang, "colMovement")}</th>
                <th className="px-3 py-2 font-semibold text-center w-[18%]">{s(lang, "colLeft")}</th>
                <th className="px-3 py-2 font-semibold text-center w-[18%]">{s(lang, "colRight")}</th>
                <th className="px-3 py-2 font-semibold text-center w-[18%]">{s(lang, "asymTitle")}</th>
              </tr>
            </thead>
            <tbody>
              {cleaned.map((r, i) => {
                const asym = computeAsymmetry(r.leftValue, r.rightValue);
                return (
                  <tr
                    key={i}
                    className={cn("border-t border-border", i % 2 === 1 && "bg-muted/20")}
                  >
                    <td className="px-3 py-2 text-foreground">{r.movement || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      {r.leftValue ? (
                        <Badge variant="secondary" className="font-mono">
                          <span className="mr-1 opacity-70">{s(lang, "initialLeft")}</span>
                          {r.leftValue}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.rightValue ? (
                        <Badge variant="secondary" className="font-mono">
                          <span className="mr-1 opacity-70">{s(lang, "initialRight")}</span>
                          {r.rightValue}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {asym == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant="outline" className={cn("font-mono", asymmetryBadgeClass(asym))}>
                          {asym}%
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Editable display ──
  const suggestions = [
    s(lang, "sGrip"),
    s(lang, "sElbowFlex"),
    s(lang, "sShoulderAbd"),
    s(lang, "sKneeExt"),
    s(lang, "sKneeFlex"),
    s(lang, "sHipAbd"),
  ];

  const importMsgKey = ["extractMsg1", "extractMsg2", "extractMsg3", "extractMsg4"][importMsgIdx];
  const hasAiExtracted = rows.some((r) => r.aiExtracted);

  return (
    <div className={cn(!bare && "rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm")}>
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
          <Dumbbell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-tight">
            {s(lang, "title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{s(lang, "subtitle")}</p>
        </div>
      </div>

      {/* Import button row */}
      {!disableImport && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFilePicked}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {importing ? s(lang, "importing") : s(lang, "importBtn")}
          </Button>
          <span className="text-[11px] text-muted-foreground">{s(lang, "importTip")}</span>
        </div>
      )}

      {importing && (
        <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span key={importMsgKey} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
              {s(lang, importMsgKey)}
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 rounded-full bg-primary animate-[clinical-progress_1.6s_ease-in-out_infinite]" />
          </div>
          <style>{`@keyframes clinical-progress { 0% { transform: translateX(-100%); } 50% { transform: translateX(120%); } 100% { transform: translateX(320%); } }`}</style>
        </div>
      )}

      {hasAiExtracted && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{s(lang, "aiBadge")}</span>
        </div>
      )}

      {/* Suggestion chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-[11px] text-muted-foreground mr-1">{s(lang, "suggestionsLabel")}</span>
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

      {/* Header (desktop only) */}
      <div className="hidden sm:grid grid-cols-[1fr_120px_120px_64px_36px] gap-2 px-1 pb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
        <div>{s(lang, "colMovement")}</div>
        <div className="text-center">{s(lang, "colLeft")}</div>
        <div className="text-center">{s(lang, "colRight")}</div>
        <div className="text-center">{s(lang, "asymTitle")}</div>
        <div />
      </div>

      <div className="space-y-2 sm:space-y-1.5">
        {rows.map((row, i) => {
          const asym = computeAsymmetry(row.leftValue, row.rightValue);
          return (
            <div key={i} className="group">
              {/* Mobile */}
              <div className="sm:hidden rounded-xl border border-border bg-background/40 p-2 space-y-1.5">
                <Input
                  value={row.movement}
                  onChange={(e) => update(i, "movement", e.target.value)}
                  placeholder={s(lang, "placeholderMovement")}
                  className="h-9 text-sm"
                />
                <div className="grid grid-cols-[1fr_1fr_36px] gap-1.5 items-end">
                  <div className="space-y-1">
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                        {s(lang, "initialLeft")}
                      </span>
                      {s(lang, "shortLeft")}
                    </span>
                    <Input
                      value={row.leftValue}
                      onChange={(e) => update(i, "leftValue", e.target.value)}
                      placeholder="kgf"
                      inputMode="decimal"
                      aria-label={s(lang, "colLeft")}
                      className="h-9 text-sm text-center font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                        {s(lang, "initialRight")}
                      </span>
                      {s(lang, "shortRight")}
                    </span>
                    <Input
                      value={row.rightValue}
                      onChange={(e) => update(i, "rightValue", e.target.value)}
                      placeholder="kgf"
                      inputMode="decimal"
                      aria-label={s(lang, "colRight")}
                      className="h-9 text-sm text-center font-mono"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(i)}
                    aria-label={s(lang, "removeRow")}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {asym != null && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {s(lang, "asymTitle")}
                    </span>
                    <Badge variant="outline" className={cn("font-mono text-[10px] h-5 px-1.5", asymmetryBadgeClass(asym))}>
                      {asym}%
                    </Badge>
                  </div>
                )}
              </div>

              {/* Desktop */}
              <div className="hidden sm:grid grid-cols-[1fr_120px_120px_64px_36px] gap-2 items-center">
                <Input
                  value={row.movement}
                  onChange={(e) => update(i, "movement", e.target.value)}
                  placeholder={s(lang, "placeholderMovement")}
                  className="h-9 text-sm"
                />
                <Input
                  value={row.leftValue}
                  onChange={(e) => update(i, "leftValue", e.target.value)}
                  placeholder={s(lang, "placeholderValue")}
                  inputMode="decimal"
                  className="h-9 text-sm text-center font-mono"
                />
                <Input
                  value={row.rightValue}
                  onChange={(e) => update(i, "rightValue", e.target.value)}
                  placeholder={s(lang, "placeholderValue")}
                  inputMode="decimal"
                  className="h-9 text-sm text-center font-mono"
                />
                <div className="text-center">
                  {asym == null ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : (
                    <Badge variant="outline" className={cn("font-mono text-[11px]", asymmetryBadgeClass(asym))}>
                      {asym}%
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(i)}
                  aria-label={s(lang, "removeRow")}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
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
