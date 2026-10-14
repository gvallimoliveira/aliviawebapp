/** Itens do check-in diário (escala 1-10, todos opcionais). */
export const CHECKIN_ITEMS: Array<{
  key: "readiness" | "sleep" | "soreness" | "stress" | "fatigue" | "pain";
  label: string;
  low: string;
  high: string;
  /** true quando nota alta é ruim (dor, fadiga, estresse). */
  inverse: boolean;
}> = [
  { key: "readiness", label: "Percepção de recuperação (PSR)", low: "Nada recuperado", high: "Totalmente recuperado", inverse: false },
  { key: "sleep", label: "Qualidade do sono", low: "Muito ruim", high: "Excelente", inverse: false },
  { key: "soreness", label: "Dor muscular tardia", low: "Nenhuma", high: "Muita", inverse: true },
  { key: "fatigue", label: "Fadiga geral", low: "Descansado", high: "Exausto", inverse: true },
  { key: "stress", label: "Estresse", low: "Tranquilo", high: "Muito estressado", inverse: true },
  { key: "pain", label: "Dor na região tratada", low: "Sem dor", high: "Pior dor", inverse: true },
];

export const TRACK_LABEL: Record<string, string> = {
  physio: "Fisioterapia",
  gym: "Academia / força",
  sport: "Outro esporte",
  cardio: "Cardio / corrida",
};

export const PLANNED_LOAD_LABEL: Record<string, string> = {
  rest: "Descanso",
  low: "Leve",
  moderate: "Moderada",
  high: "Alta",
};

export const PLANNED_LOAD_CLASS: Record<string, string> = {
  rest: "bg-muted text-muted-foreground",
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  moderate: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  high: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export const ZONE_LABEL: Record<string, string> = {
  undertraining: "Abaixo da carga habitual",
  optimal: "Faixa ideal",
  caution: "Atenção",
  danger: "Risco elevado",
};

export const LEVEL_CLASS: Record<string, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  caution: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

/** Leitura da dose planejada x carga percebida. */
export const DOSE_LABEL: Record<string, string> = {
  under: "Subdosado",
  on_target: "Dose certa",
  over: "Superdosado",
};

export const DOSE_CLASS: Record<string, string> = {
  under: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  on_target: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  over: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};
