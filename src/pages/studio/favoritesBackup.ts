import type { StudioFavorite } from "./useStudioFavorites";
import { readThumbs, replaceThumbs } from "./thumbs";

/**
 * BACKUP DO ACERVO INTERNO
 *
 * Os favoritos e as miniaturas do Studio interno vivem em localStorage — ou seja,
 * presos a um navegador. Este módulo exporta/importa tudo em um único arquivo
 * JSON para que o acervo aprovado nunca se perca (limpeza de cache, troca de
 * dispositivo, evolução do produto público).
 */

const FAVORITES_KEY = "studio:favorites";

export type StudioBackup = {
  version: 1;
  exportedAt: string;
  favorites: StudioFavorite[];
  thumbs: Record<string, string>;
};

export const buildBackup = (favorites: StudioFavorite[]): StudioBackup => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  favorites,
  thumbs: readThumbs(),
});

export const backupFileName = () =>
  `alivia-studio-favoritos-${new Date().toISOString().slice(0, 10)}.json`;

/** Lê um arquivo de backup e valida o formato mínimo. */
export const parseBackup = async (file: File): Promise<StudioBackup> => {
  const raw = await file.text();
  const parsed = JSON.parse(raw) as StudioBackup;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.favorites)) {
    throw new Error("Arquivo de backup inválido");
  }
  return parsed;
};

/**
 * Restaura o backup somando ao acervo atual (nunca apaga favoritos existentes).
 * Retorna quantos favoritos novos entraram.
 */
export const restoreBackup = (backup: StudioBackup): number => {
  let current: StudioFavorite[] = [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    current = raw ? (JSON.parse(raw) as StudioFavorite[]) : [];
    if (!Array.isArray(current)) current = [];
  } catch {
    current = [];
  }

  const known = new Set(current.map((f) => f.id));
  const incoming = backup.favorites.filter((f) => f?.id && !known.has(f.id));
  const merged = [...incoming, ...current];

  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(merged));
  } catch {
    throw new Error("Não foi possível gravar os favoritos (armazenamento cheio)");
  }

  if (backup.thumbs && typeof backup.thumbs === "object") {
    replaceThumbs({ ...readThumbs(), ...backup.thumbs });
  }

  return incoming.length;
};
