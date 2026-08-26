import { supabase } from "@/integrations/supabase/client";
import type { StudioFavorite } from "./useStudioFavorites";
import { readThumbs, replaceThumbs } from "./thumbs";

/**
 * BACKUP DO ACERVO INTERNO
 *
 * Os favoritos e as miniaturas do Studio interno vivem em localStorage — ou seja,
 * presos a um navegador. Este módulo oferece duas proteções:
 *
 * 1. Exportar/importar tudo em um único arquivo JSON (à prova de limpeza de cache).
 * 2. Sincronizar na conta (tabela `studio_internal_favorites`), para que o acervo
 *    aprovado acompanhe o usuário em qualquer dispositivo.
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

// ---------------------------------------------------------------------------
// Sincronização na conta (backend) — um registro por usuário, visível só para
// ele (RLS por auth.uid). A tabela ainda não consta nos tipos gerados, então o
// acesso é feito via cast, mantendo o payload validado aqui.
// ---------------------------------------------------------------------------

type AccountRow = {
  favorites: unknown;
  thumbs: unknown;
  updated_at: string;
};

export type AccountBackup = {
  backup: StudioBackup;
  updatedAt: string;
};

/** Grava o acervo atual (favoritos + miniaturas) na conta do usuário. */
export const saveBackupToAccount = async (favorites: StudioFavorite[]): Promise<Date> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão necessária para sincronizar.");

  const now = new Date();
  const { error } = await (supabase as any)
    .from("studio_internal_favorites")
    .upsert(
      {
        user_id: user.id,
        favorites,
        thumbs: readThumbs(),
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) throw error;
  return now;
};

/** Lê o backup salvo na conta. Retorna null quando ainda não existe nenhum. */
export const loadBackupFromAccount = async (): Promise<AccountBackup | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão necessária para sincronizar.");

  const { data, error } = await (supabase as any)
    .from("studio_internal_favorites")
    .select("favorites, thumbs, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as AccountRow;
  if (!Array.isArray(row.favorites)) throw new Error("Backup da conta em formato inválido.");
  return {
    backup: {
      version: 1,
      exportedAt: row.updated_at,
      favorites: row.favorites as StudioFavorite[],
      thumbs: (row.thumbs ?? {}) as Record<string, string>,
    },
    updatedAt: row.updated_at,
  };
};
