import { useRef, useState } from "react";
import { Dumbbell, Plus, Trash2, Upload, Sparkles, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { anchorScroll } from "@/hooks/useScrollAnchor";


/** One individual measurement (trial) of a movement on one side. */
export type StrengthTrial = {
  /** Peak force in kgf. */
  value: string;
  /** Optional time to peak force, in seconds. */
  timeToPeak?: string;
};

export type StrengthRow = {
  movement: string;
  /** Representative (best) value for the left side. */
  leftValue: string;
  /** Representative (best) value for the right side. */
  rightValue: string;
  /** All individual measurements for the left side (2-3 trials are common). */
  leftTrials?: StrengthTrial[];
  /** All individual measurements for the right side. */
  rightTrials?: StrengthTrial[];
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

export const createInitialStrengthRows = (n = 1): StrengthRow[] =>
  Array.from({ length: n }, () => ({ ...EMPTY_STRENGTH_ROW }));

export const parseNum = (v: string | number | undefined | null): number | null => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : null;
};

const sanitizeTrials = (trials: unknown): StrengthTrial[] => {
  if (!Array.isArray(trials)) return [];
  return trials
    .map((t: any) => ({
      value: String(t?.value ?? t ?? "").trim(),
      timeToPeak:
        t?.timeToPeak == null || String(t.timeToPeak).trim() === ""
          ? undefined
          : String(t.timeToPeak).trim(),
    }))
    .filter((t) => parseNum(t.value) != null)
    .slice(0, 10);
};

/** Aggregated stats for one side, derived from its trials (or single value). */
export type SideStats = {
  count: number;
  best: number | null;
  mean: number | null;
  /** Coefficient of variation (%) across trials — reliability indicator. */
  cv: number | null;
  meanTimeToPeak: number | null;
};

export const computeSideStats = (
  value: string | number | undefined,
  trials: StrengthTrial[] | undefined,
): SideStats => {
  const nums = (trials || [])
    .map((t) => parseNum(t.value))
    .filter((n): n is number => n != null && n > 0);
  if (nums.length === 0) {
    const single = parseNum(value as string);
    return {
      count: single != null && single > 0 ? 1 : 0,
      best: single != null && single > 0 ? single : null,
      mean: single != null && single > 0 ? single : null,
      cv: null,
      meanTimeToPeak: null,
    };
  }
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const best = Math.max(...nums);
  let cv: number | null = null;
  if (nums.length > 1 && mean > 0) {
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
    cv = Math.round((Math.sqrt(variance) / mean) * 1000) / 10;
  }
  const times = (trials || [])
    .map((t) => parseNum(t.timeToPeak))
    .filter((n): n is number => n != null && n > 0);
  return {
    count: nums.length,
    best: Math.round(best * 10) / 10,
    mean: Math.round(mean * 10) / 10,
    cv,
    meanTimeToPeak:
      times.length > 0
        ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100
        : null,
  };
};

export const sanitizeStrengthRows = (
  rows: StrengthRow[] | undefined | null,
): StrengthRow[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => {
      const leftTrials = sanitizeTrials(r?.leftTrials);
      const rightTrials = sanitizeTrials(r?.rightTrials);
      const leftStats = computeSideStats(r?.leftValue, leftTrials);
      const rightStats = computeSideStats(r?.rightValue, rightTrials);
      const left = (r?.leftValue || "").trim();
      const right = (r?.rightValue || "").trim();
      return {
        movement: (r?.movement || "").trim(),
        leftValue: left || (leftStats.best != null ? String(leftStats.best) : ""),
        rightValue: right || (rightStats.best != null ? String(rightStats.best) : ""),
        ...(leftTrials.length > 0 ? { leftTrials } : {}),
        ...(rightTrials.length > 0 ? { rightTrials } : {}),
        unit: (r?.unit || "kgf").trim() || "kgf",
      } as StrengthRow;
    })
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

/** Asymmetry using the MEAN of trials when available (more reliable than a single best). */
export const computeRowAsymmetry = (row: StrengthRow): number | null => {
  const L = computeSideStats(row.leftValue, row.leftTrials);
  const R = computeSideStats(row.rightValue, row.rightTrials);
  if (L.mean == null || R.mean == null) return null;
  return computeAsymmetry(L.mean, R.mean);
};


/**
 * Agonist/antagonist pairs evaluated within the SAME side.
 * Matching is keyword based so it works for pt/en/es movement labels.
 */
type PairDef = {
  key: string;
  region: RegExp;
  a: { label: Record<string, string>; re: RegExp };
  b: { label: Record<string, string>; re: RegExp };
  title: Record<string, string>;
};

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const PAIRS: PairDef[] = [
  {
    key: "shoulderRotation",
    region: /(ombro|shoulder|hombro)/,
    a: {
      label: { pt: "Rot. interna", en: "Int. rotation", es: "Rot. interna" },
      re: /(rotac|rotat).*(intern|medial)|(intern|medial).*(rotac|rotat)/,
    },
    b: {
      label: { pt: "Rot. externa", en: "Ext. rotation", es: "Rot. externa" },
      re: /(rotac|rotat).*(extern|lateral)|(extern|lateral).*(rotac|rotat)/,
    },
    title: {
      pt: "Ombro — rotação interna vs externa",
      en: "Shoulder — internal vs external rotation",
      es: "Hombro — rotación interna vs externa",
    },
  },
  {
    key: "knee",
    region: /(joelho|knee|rodilla)/,
    a: {
      label: { pt: "Extensão", en: "Extension", es: "Extensión" },
      re: /(exten)/,
    },
    b: { label: { pt: "Flexão", en: "Flexion", es: "Flexión" }, re: /(flex)/ },
    title: {
      pt: "Joelho — extensão vs flexão",
      en: "Knee — extension vs flexion",
      es: "Rodilla — extensión vs flexión",
    },
  },
  {
    key: "hipSagittal",
    region: /(quadril|hip|cadera)/,
    a: {
      label: { pt: "Extensão", en: "Extension", es: "Extensión" },
      re: /(exten)/,
    },
    b: { label: { pt: "Flexão", en: "Flexion", es: "Flexión" }, re: /(flex)/ },
    title: {
      pt: "Quadril — extensão vs flexão",
      en: "Hip — extension vs flexion",
      es: "Cadera — extensión vs flexión",
    },
  },
  {
    key: "hipFrontal",
    region: /(quadril|hip|cadera)/,
    a: {
      label: { pt: "Adução", en: "Adduction", es: "Aducción" },
      re: /(aducao|aducc|adduc|aduc)/,
    },
    b: {
      label: { pt: "Abdução", en: "Abduction", es: "Abducción" },
      re: /(abduc)/,
    },
    title: {
      pt: "Quadril — adução vs abdução",
      en: "Hip — adduction vs abduction",
      es: "Cadera — aducción vs abducción",
    },
  },
];

export type AgonistAntagonistResult = {
  key: string;
  title: Record<string, string>;
  aLabel: Record<string, string>;
  bLabel: Record<string, string>;
  /** Per side: mean of agonist, mean of antagonist and asymmetry % */
  left: { a: number | null; b: number | null; asym: number | null };
  right: { a: number | null; b: number | null; asym: number | null };
};

/** Computes intra-side agonist/antagonist asymmetries for the known pairs. */
export const computeAgonistAntagonist = (
  rows: StrengthRow[] | undefined | null,
): AgonistAntagonistResult[] => {
  const clean = sanitizeStrengthRows(rows);
  if (clean.length === 0) return [];
  const out: AgonistAntagonistResult[] = [];

  for (const pair of PAIRS) {
    const findRow = (re: RegExp) =>
      clean.find((r) => {
        const m = norm(r.movement);
        // Abduction must not be captured by the adduction regex and vice-versa.
        if (pair.key === "hipFrontal" && re === pair.a.re && /abduc/.test(m)) return false;
        return pair.region.test(m) && re.test(m);
      });
    const rowA = findRow(pair.a.re);
    const rowB = findRow(pair.b.re);
    if (!rowA || !rowB) continue;

    const side = (which: "left" | "right") => {
      const sa = computeSideStats(
        which === "left" ? rowA.leftValue : rowA.rightValue,
        which === "left" ? rowA.leftTrials : rowA.rightTrials,
      );
      const sb = computeSideStats(
        which === "left" ? rowB.leftValue : rowB.rightValue,
        which === "left" ? rowB.leftTrials : rowB.rightTrials,
      );
      return {
        a: sa.mean,
        b: sb.mean,
        asym:
          sa.mean != null && sb.mean != null ? computeAsymmetry(sa.mean, sb.mean) : null,
      };
    };

    out.push({
      key: pair.key,
      title: pair.title,
      aLabel: pair.a.label,
      bLabel: pair.b.label,
      left: side("left"),
      right: side("right"),
    });
  }
  return out;
};

/** ≤10% is acceptable (green); above 10% is highlighted in red. */
const asymmetryBadgeClass = (pct: number): string =>
  pct <= 10
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-rose-100 text-rose-700 border-rose-200";


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
    trialsLabel: "Medidas",
    trialsHint: "2 a 3 medidas por lado deixam o resultado mais fidedigno.",
    addTrial: "Adicionar medida",
    removeTrial: "Remover medida",
    trialN: "Medida",
    meanLabel: "Média",
    bestLabel: "Melhor",
    trialsCount: "medidas",
    cvLabel: "Variação",
    peakTimeLabel: "Tempo até o pico (s)",
    meanPeakTime: "Tempo médio até o pico",
    peakTimeOptionalLabel: "Tempo até o pico (opcional)",
    showPeakTime: "Registrar tempo até o pico (opcional)",
    hidePeakTime: "Ocultar tempo até o pico",
    agonistTitle: "Assimetria agonista/antagonista (mesmo lado)",
    agonistHint: "Acima de 10% merece atenção.",
    untitledMovement: "Sem nome",
    peakTrialN: "Tempo de pico",






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
    trialsLabel: "Trials",
    trialsHint: "2 to 3 trials per side make the result more reliable.",
    addTrial: "Add trial",
    removeTrial: "Remove trial",
    trialN: "Trial",
    meanLabel: "Mean",
    bestLabel: "Best",
    trialsCount: "trials",
    cvLabel: "Variation",
    peakTimeLabel: "Time to peak (s)",
    meanPeakTime: "Mean time to peak",
    peakTimeOptionalLabel: "Time to peak (optional)",
    showPeakTime: "Record time to peak (optional)",
    hidePeakTime: "Hide time to peak",
    agonistTitle: "Agonist/antagonist asymmetry (same side)",
    agonistHint: "Above 10% deserves attention.",
    untitledMovement: "Unnamed",
    peakTrialN: "Time to peak",






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
    trialsLabel: "Medidas",
    trialsHint: "2 a 3 medidas por lado hacen el resultado más fiable.",
    addTrial: "Agregar medida",
    removeTrial: "Eliminar medida",
    trialN: "Medida",
    meanLabel: "Media",
    bestLabel: "Mejor",
    trialsCount: "medidas",
    cvLabel: "Variación",
    peakTimeLabel: "Tiempo al pico (s)",
    meanPeakTime: "Tiempo medio al pico",
    peakTimeOptionalLabel: "Tiempo al pico (opcional)",
    showPeakTime: "Registrar tiempo al pico (opcional)",
    hidePeakTime: "Ocultar tiempo al pico",
    agonistTitle: "Asimetría agonista/antagonista (mismo lado)",
    agonistHint: "Por encima del 10% merece atención.",
    untitledMovement: "Sin nombre — toque para completar",
    peakTrialN: "Tiempo al pico",




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

const pick = (map: Record<string, string>, lang: Lang) => map[lang as string] ?? map.pt;

/** Intra-side agonist/antagonist asymmetry summary (shoulder rotation, knee, hip). */
export function AgonistAntagonistPanel({
  rows,
  lang = "pt",
}: {
  rows: StrengthRow[];
  lang?: Lang;
}) {
  const pairs = computeAgonistAntagonist(rows);
  if (pairs.length === 0) return null;

  const cell = (v: number | null) =>
    v == null ? (
      <span className="text-muted-foreground text-xs">—</span>
    ) : (
      <Badge variant="outline" className={cn("font-mono text-[11px]", asymmetryBadgeClass(v))}>
        {v}%
      </Badge>
    );

  const sideResult = (sideLabel: string, a: number | null, b: number | null, asym: number | null) => (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-bold text-muted-foreground">{sideLabel}</span>
      <Badge variant="secondary" className="font-mono text-[10px] px-1.5">
        {a ?? "—"}/{b ?? "—"}
      </Badge>
      {cell(asym)}
    </div>
  );

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
          {s(lang, "agonistTitle")}
        </span>
        <span className="text-[10px] text-muted-foreground">{s(lang, "agonistHint")}</span>
      </div>
      <div className="mt-2 space-y-1.5">
        {pairs.map((p) => (
          <div
            key={p.key}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-border bg-background/60 px-2 py-1.5"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground leading-tight">
                {pick(p.title, lang)}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {pick(p.aLabel, lang)} · {pick(p.bLabel, lang)}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {sideResult(s(lang, "initialLeft"), p.left.a, p.left.b, p.left.asym)}
              {sideResult(s(lang, "initialRight"), p.right.a, p.right.b, p.right.asym)}
            </div>

            <span />
          </div>
        ))}
      </div>
    </div>
  );

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
  const rootRef = useRef<HTMLDivElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsgIdx, setImportMsgIdx] = useState(0);

  /**
   * Keeps the dynamometry section visually anchored while the surrounding page
   * re-renders (import/save can remount parents and collapse the document,
   * which makes the browser clamp scrollY to the top).
   */
  const preserveScroll = () =>
    anchorScroll(() => document.getElementById("dinamometria") || rootRef.current);


  // Time to peak is always available but strictly optional: left empty it never
  // reaches the report; filled (manually or by the AI import) it shows up.
  const peakVisible = true;

  // Each movement is a collapsible card. Collapsed by default so a long test
  // stays scannable; empty rows open automatically so they can be filled.
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({});
  const toggleRow = (i: number, open: boolean) =>
    setOpenRows((prev) => ({ ...prev, [i]: open }));


  const update = (i: number, field: keyof StrengthRow, val: string) => {
    if (!onChange) return;
    const next = rows.map((r, idx) =>
      idx === i ? { ...r, [field]: val, aiExtracted: false } : r,
    );
    onChange(next);
  };

  const trialsKey = (side: "left" | "right"): "leftTrials" | "rightTrials" =>
    side === "left" ? "leftTrials" : "rightTrials";
  const valueKey = (side: "left" | "right"): "leftValue" | "rightValue" =>
    side === "left" ? "leftValue" : "rightValue";

  /** Keeps the representative value in sync with the best trial. */
  const withSyncedValue = (row: StrengthRow, side: "left" | "right"): StrengthRow => {
    const st = computeSideStats("", row[trialsKey(side)]);
    if (st.best == null) return row;
    return { ...row, [valueKey(side)]: String(st.best) };
  };

  const updateTrial = (
    i: number,
    side: "left" | "right",
    tIdx: number,
    field: keyof StrengthTrial,
    val: string,
  ) => {
    if (!onChange) return;
    onChange(
      rows.map((r, idx) => {
        if (idx !== i) return r;
        const list = [...(r[trialsKey(side)] || [])];
        list[tIdx] = { ...(list[tIdx] || { value: "" }), [field]: val };
        return withSyncedValue({ ...r, [trialsKey(side)]: list, aiExtracted: false }, side);
      }),
    );
  };

  const addTrial = (i: number, side: "left" | "right") => {
    if (!onChange) return;
    onChange(
      rows.map((r, idx) => {
        if (idx !== i) return r;
        const existing = r[trialsKey(side)] || [];
        // Seed the first trial with the value already typed in the main field.
        const seed = existing.length === 0 && r[valueKey(side)]
          ? [{ value: r[valueKey(side)] }]
          : existing;
        return { ...r, [trialsKey(side)]: [...seed, { value: "" }], aiExtracted: false };
      }),
    );
  };

  const removeTrial = (i: number, side: "left" | "right", tIdx: number) => {
    if (!onChange) return;
    onChange(
      rows.map((r, idx) => {
        if (idx !== i) return r;
        const list = (r[trialsKey(side)] || []).filter((_, k) => k !== tIdx);
        return withSyncedValue({ ...r, [trialsKey(side)]: list, aiExtracted: false }, side);
      }),
    );
  };


  const addRow = () => {
    toggleRow(rows.length, true);
    onChange?.([...rows, { ...EMPTY_STRENGTH_ROW }]);
  };

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
      const normTrials = (raw: any): StrengthTrial[] | undefined => {
        if (!Array.isArray(raw) || raw.length === 0) return undefined;
        const list = raw
          .map((t: any) => {
            const v = String(t?.value ?? t ?? "").trim();
            const ttp = t?.timeToPeak ?? t?.time_to_peak ?? t?.peakTime;
            return {
              value: v,
              ...(ttp == null || String(ttp).trim() === ""
                ? {}
                : { timeToPeak: String(ttp).trim() }),
            } as StrengthTrial;
          })
          .filter((t) => t.value !== "");
        return list.length ? list : undefined;
      };
      const extracted: StrengthRow[] = Array.isArray(data?.rows)
        ? data.rows
            .map((r: any) => ({
              movement: String(r?.movement ?? "").trim(),
              leftValue: r?.leftValue == null ? "" : String(r.leftValue).trim(),
              rightValue: r?.rightValue == null ? "" : String(r.rightValue).trim(),
              leftTrials: normTrials(r?.leftTrials),
              rightTrials: normTrials(r?.rightTrials),
              unit: "kgf",
              aiExtracted: true,
            }))
            .map((r: StrengthRow) => sanitizeStrengthRows([r])[0] ? { ...sanitizeStrengthRows([r])[0], aiExtracted: true } : r)
            .filter((r: StrengthRow) => r.movement || r.leftValue || r.rightValue)
        : [];
      if (extracted.length === 0) {
        toast({ title: s(lang, "extractFail"), variant: "destructive" });
        return;
      }
      // Merge: keep existing non-empty rows, then append extracted ones.
      const existingFilled = sanitizeStrengthRows(rows);
      const restoreScroll = preserveScroll();
      onChange([...existingFilled, ...extracted]);
      restoreScroll();
      const trialCount = extracted.reduce(
        (acc, r) => acc + (r.leftTrials?.length || 0) + (r.rightTrials?.length || 0),
        0,
      );
      toast({
        title: s(lang, "extractOk"),
        description: `${extracted.length} ${s(lang, "colMovement").toLowerCase()} • ${trialCount} ${s(lang, "trialsCount")}`,
      });

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
                const L = computeSideStats(r.leftValue, r.leftTrials);
                const R = computeSideStats(r.rightValue, r.rightTrials);
                const asym = computeRowAsymmetry(r);
                const renderSide = (st: SideStats, initialKey: string) =>
                  st.mean == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <Badge variant="secondary" className="font-mono">
                        <span className="mr-1 opacity-70">{s(lang, initialKey)}</span>
                        {st.count > 1 ? st.mean : st.best}
                      </Badge>
                      {st.count > 1 && (
                        <span className="text-[10px] leading-tight text-muted-foreground">
                          {s(lang, "meanLabel")} · {s(lang, "bestLabel")} {st.best} · n={st.count}
                          {st.cv != null ? ` · CV ${st.cv}%` : ""}
                        </span>
                      )}
                      {st.meanTimeToPeak != null && (
                        <span className="text-[10px] leading-tight text-muted-foreground">
                          {s(lang, "meanPeakTime")}: {st.meanTimeToPeak}s
                        </span>
                      )}
                    </div>
                  );
                return (
                  <tr
                    key={i}
                    className={cn("border-t border-border", i % 2 === 1 && "bg-muted/20")}
                  >
                    <td className="px-3 py-2 text-foreground">{r.movement || "—"}</td>
                    <td className="px-3 py-2 text-center">{renderSide(L, "initialLeft")}</td>
                    <td className="px-3 py-2 text-center">{renderSide(R, "initialRight")}</td>
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
        <AgonistAntagonistPanel rows={cleaned} lang={lang} />
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
    <div ref={rootRef} className={cn(!bare && "rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm")}>

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

      <div className="space-y-2">
        {rows.map((row, i) => {
          const asym = computeRowAsymmetry(row);
          const leftStats = computeSideStats(row.leftValue, row.leftTrials);
          const rightStats = computeSideStats(row.rightValue, row.rightTrials);
          const isEmptyRow =
            !row.movement.trim() && !row.leftValue.trim() && !row.rightValue.trim();
          const open = openRows[i] ?? isEmptyRow;

          return (
            <div
              key={i}
              className="rounded-xl border border-border bg-background/50 overflow-hidden"
            >
              {/* Collapsed header — movement name + quick summary centered */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleRow(i, !open)}
                  aria-expanded={open}
                  className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2.5 py-2.5 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        open && "rotate-180",
                      )}
                    />
                    <span
                      className={cn(
                        "flex-1 min-w-0 truncate text-sm font-medium",
                        row.movement.trim() ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {row.movement.trim() || s(lang, "untitledMovement")}
                    </span>
                  </span>

                  {!open && (
                    <span className="flex items-center justify-center gap-1">
                      {leftStats.best != null && (
                        <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px]">
                          {s(lang, "initialLeft")} {leftStats.best}
                        </Badge>
                      )}
                      {rightStats.best != null && (
                        <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px]">
                          {s(lang, "initialRight")} {rightStats.best}
                        </Badge>
                      )}
                      {asym != null && (
                        <Badge
                          variant="outline"
                          className={cn("h-5 px-1.5 font-mono text-[10px]", asymmetryBadgeClass(asym))}
                        >
                          {asym}%
                        </Badge>
                      )}
                    </span>
                  )}

                  <span />
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(i)}
                  aria-label={s(lang, "removeRow")}
                  className="mr-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {open && (
                <div className="border-t border-border px-2.5 py-2.5 space-y-3">
                  {/* Movement name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {s(lang, "colMovement")}
                    </label>
                    <Input
                      value={row.movement}
                      onChange={(e) => update(i, "movement", e.target.value)}
                      placeholder={s(lang, "placeholderMovement")}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Measurements per side */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(["left", "right"] as const).map((side) => {
                      const trials = row[side === "left" ? "leftTrials" : "rightTrials"] || [];
                      const st = side === "left" ? leftStats : rightStats;
                      return (
                        <div key={side} className="rounded-lg border border-border bg-muted/20 p-2">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                              {s(lang, side === "left" ? "initialLeft" : "initialRight")}
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                              {s(lang, side === "left" ? "shortLeft" : "shortRight")}
                            </span>
                          </div>

                          <div className="mt-2 space-y-2">
                            {trials.length === 0 && (
                              <div className="space-y-1">
                                <label className="text-[10px] font-medium text-muted-foreground">
                                  {s(lang, "trialN")} 1 (kgf)
                                </label>
                                <Input
                                  value={side === "left" ? row.leftValue : row.rightValue}
                                  onChange={(e) =>
                                    update(i, side === "left" ? "leftValue" : "rightValue", e.target.value)
                                  }
                                  placeholder="kgf"
                                  inputMode="decimal"
                                  className="h-9 text-sm text-center font-mono"
                                />
                              </div>
                            )}

                            {trials.map((t, tIdx) => (
                              <div key={tIdx} className="flex items-end gap-1.5">
                                <div className="flex-1 space-y-1">
                                  <label className="text-[10px] font-medium text-muted-foreground">
                                    {s(lang, "trialN")} {tIdx + 1} (kgf)
                                  </label>
                                  <Input
                                    value={t.value}
                                    onChange={(e) => updateTrial(i, side, tIdx, "value", e.target.value)}
                                    placeholder="kgf"
                                    inputMode="decimal"
                                    aria-label={`${s(lang, "trialN")} ${tIdx + 1} (kgf)`}
                                    className="h-9 text-sm text-center font-mono"
                                  />
                                </div>
                                {peakVisible && (
                                  <div className="flex-1 space-y-1">
                                    <label className="text-[10px] font-medium text-muted-foreground">
                                      {s(lang, "peakTrialN")} {tIdx + 1} (s)
                                    </label>
                                    <Input
                                      value={t.timeToPeak || ""}
                                      onChange={(e) =>
                                        updateTrial(i, side, tIdx, "timeToPeak", e.target.value)
                                      }
                                      placeholder="s"
                                      inputMode="decimal"
                                      aria-label={`${s(lang, "peakTrialN")} ${tIdx + 1} (s)`}
                                      className="h-9 text-sm text-center font-mono"
                                    />
                                  </div>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTrial(i, side, tIdx)}
                                  aria-label={s(lang, "removeTrial")}
                                  className="h-9 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addTrial(i, side)}
                              className="h-7 gap-1 px-2 text-[11px] text-primary hover:bg-primary/5"
                            >
                              <Plus className="h-3 w-3" />
                              {s(lang, "addTrial")}
                            </Button>

                            {st.count > 1 && (
                              <p className="text-[10px] font-mono text-muted-foreground">
                                {s(lang, "meanLabel")} {st.mean} · {s(lang, "bestLabel")} {st.best} · n=
                                {st.count}
                                {st.cv != null ? ` · CV ${st.cv}%` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">{s(lang, "trialsHint")}</span>
                    {asym != null && (
                      <span className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {s(lang, "asymTitle")}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("h-5 px-1.5 font-mono text-[10px]", asymmetryBadgeClass(asym))}
                        >
                          {asym}%
                        </Badge>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

      </div>


      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
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

      <AgonistAntagonistPanel rows={rows} lang={lang} />


    </div>
  );
}
