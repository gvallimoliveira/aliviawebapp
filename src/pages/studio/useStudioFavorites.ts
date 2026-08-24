import { useCallback, useEffect, useState } from "react";
import type { WorldId } from "./content";
import type { StudioFormat } from "./blocks/shared";

export type StudioFavorite = {
  id: string;
  world: WorldId;
  format: StudioFormat;
  seed: string;
  label?: string;
  createdAt: number;
};

const KEY = "studio:favorites";

const read = (): StudioFavorite[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StudioFavorite[]) : [];
  } catch {
    return [];
  }
};

/**
 * Favoritos do Studio (localStorage). Guardam mundo + seed, então a versão
 * é reconstruída exatamente igual e também serve de "linhagem" para novas
 * composições (parte aprovada + parte nova).
 */
export const useStudioFavorites = () => {
  const [favorites, setFavorites] = useState<StudioFavorite[]>(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites]);

  const idOf = (world: WorldId, seed: string) => `${world}:${seed}`;

  const isFavorite = useCallback(
    (world: WorldId, seed: string) => favorites.some((f) => f.id === idOf(world, seed)),
    [favorites],
  );

  const toggle = useCallback((world: WorldId, format: StudioFormat, seed: string, label?: string) => {
    const id = idOf(world, seed);
    setFavorites((list) =>
      list.some((f) => f.id === id)
        ? list.filter((f) => f.id !== id)
        : [{ id, world, format, seed, label, createdAt: Date.now() }, ...list],
    );
  }, []);

  const remove = useCallback((id: string) => {
    setFavorites((list) => list.filter((f) => f.id !== id));
  }, []);

  const rename = useCallback((id: string, label: string) => {
    setFavorites((list) => list.map((f) => (f.id === id ? { ...f, label } : f)));
  }, []);

  return { favorites, isFavorite, toggle, remove, rename };
};
