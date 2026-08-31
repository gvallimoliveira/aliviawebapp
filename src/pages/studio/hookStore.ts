/**
 * PREFERÊNCIAS DA BIBLIOTECA DE GANCHOS (por marca, editáveis pelo dono)
 *
 * O acervo curado (`hookLibrary.ts`) e o mecanismo (`hooks.ts`) continuam sendo
 * a fonte dos ganchos. Esta camada só guarda a CURADORIA do usuário — ordem e
 * ativação — para que ele revise a biblioteca sem mexer no código.
 *
 * - Persistência local (localStorage), por marca, por voz (pro/paciente).
 * - Chave do gancho = texto forte normalizado: gancho que muda de texto vira
 *   item novo (ativo por padrão), nunca desaparece silenciosamente.
 * - Gancho sem preferência salva permanece ATIVO — o padrão é o acervo inteiro.
 */

import { tightenHook, type StudioHook } from "./hooks";

const STORAGE_KEY = "studio.hooks.prefs.v1";
const CUSTOM_KEY = "studio.hooks.custom.v1";


export type HookPrefs = {
  /** Ganchos desativados (chaves). */
  off: string[];
  /** Ordem preferida (chaves); ganchos fora da lista vão para o fim. */
  order: string[];
};

const EMPTY: HookPrefs = { off: [], order: [] };

/** Chave estável de um gancho (texto forte normalizado). */
export const hookKey = (hook: StudioHook): string =>
  (hook.strong ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

/** Chave da marca (+ voz), estável mesmo com variação de caixa/espaços. */
export const hookBrandKey = (brandName: string, opts: { patientVoice?: boolean } = {}): string => {
  const base = (brandName ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return opts.patientVoice ? `${base}:paciente` : base;
};

type Store = Record<string, HookPrefs>;

const readStore = (): Store => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
};

const writeStore = (store: Store) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* cota cheia / modo privado: a curadoria simplesmente não persiste */
  }
};

/** Preferências salvas da marca (vazio = acervo original, tudo ativo). */
export const readHookPrefs = (
  brandName: string,
  opts: { patientVoice?: boolean } = {},
): HookPrefs => {
  const saved = readStore()[hookBrandKey(brandName, opts)];
  if (!saved) return EMPTY;
  return {
    off: Array.isArray(saved.off) ? saved.off : [],
    order: Array.isArray(saved.order) ? saved.order : [],
  };
};

/** Salva a curadoria da marca. */
export const saveHookPrefs = (
  brandName: string,
  prefs: HookPrefs,
  opts: { patientVoice?: boolean } = {},
) => {
  const store = readStore();
  store[hookBrandKey(brandName, opts)] = { off: [...prefs.off], order: [...prefs.order] };
  writeStore(store);
};

/** Volta ao acervo original (apaga a curadoria da marca). */
export const clearHookPrefs = (brandName: string, opts: { patientVoice?: boolean } = {}) => {
  const store = readStore();
  delete store[hookBrandKey(brandName, opts)];
  writeStore(store);
};

/**
 * GANCHOS MANUAIS (escritos pelo dono da marca)
 *
 * Guardados por marca/voz e somados ao acervo antes da curadoria: entram no
 * topo da biblioteca e valem para as próximas gerações, sem crédito de IA.
 */
type CustomStore = Record<string, StudioHook[]>;

const readCustomStore = (): CustomStore => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as CustomStore) : {};
  } catch {
    return {};
  }
};

const writeCustomStore = (store: CustomStore) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(store));
  } catch {
    /* cota cheia / modo privado: o gancho manual simplesmente não persiste */
  }
};

/** Ganchos manuais da marca (mais recente primeiro). */
export const readCustomHooks = (
  brandName: string,
  opts: { patientVoice?: boolean } = {},
): StudioHook[] => {
  const list = readCustomStore()[hookBrandKey(brandName, opts)];
  return Array.isArray(list) ? list.filter((h) => !!h?.strong) : [];
};

/** Adiciona um gancho manual (ignora repetição de manchete). */
export const addCustomHook = (
  brandName: string,
  hook: StudioHook,
  opts: { patientVoice?: boolean } = {},
): StudioHook[] => {
  const store = readCustomStore();
  const key = hookBrandKey(brandName, opts);
  const current = Array.isArray(store[key]) ? store[key] : [];
  const clean: StudioHook = {
    hook: (hook.hook || "Gancho da marca").trim(),
    strong: (hook.strong || "").trim(),
    rest: (hook.rest || "").trim(),
    sub: hook.sub?.trim() || undefined,
    cta: hook.cta?.trim() || undefined,
  };
  if (clean.strong.length < 12) return current;
  const next = [clean, ...current.filter((h) => hookKey(h) !== hookKey(clean))];
  store[key] = next;
  writeCustomStore(store);
  return next;
};

/** Remove um gancho manual pela chave. */
export const removeCustomHook = (
  brandName: string,
  key: string,
  opts: { patientVoice?: boolean } = {},
): StudioHook[] => {
  const store = readCustomStore();
  const brand = hookBrandKey(brandName, opts);
  const next = (Array.isArray(store[brand]) ? store[brand] : []).filter((h) => hookKey(h) !== key);
  store[brand] = next;
  writeCustomStore(store);
  return next;
};

/**
 * Aplica a curadoria a uma lista de ganchos: soma os ganchos manuais da marca,
 * remove desativados, reordena conforme a ordem salva e aplica o limite de
 * manchete (gancho é frase de impacto, nunca redação).
 */
export const applyHookPrefs = (
  brandName: string,
  hooks: StudioHook[] | undefined,
  opts: { patientVoice?: boolean } = {},
): StudioHook[] => {
  const custom = readCustomHooks(brandName, opts);
  const base = hooks ?? [];
  const list = custom.length
    ? [...custom, ...base.filter((h) => !custom.some((c) => hookKey(c) === hookKey(h)))]
    : base;
  if (list.length === 0) return list;
  const prefs = readHookPrefs(brandName, opts);
  if (prefs.off.length === 0 && prefs.order.length === 0) return list.map(tightenHook);

  const off = new Set(prefs.off);
  const kept = list.filter((hook) => !off.has(hookKey(hook)));
  if (prefs.order.length === 0) return kept.map(tightenHook);

  const rank = new Map(prefs.order.map((key, i) => [key, i] as const));
  return kept
    .map((hook, i) => ({ hook, i, rank: rank.get(hookKey(hook)) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((entry) => tightenHook(entry.hook));
};

