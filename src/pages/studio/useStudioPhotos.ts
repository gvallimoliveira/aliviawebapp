import { useCallback, useEffect, useState } from "react";
import {
  deletePhoto,
  listPhotos,
  updatePhoto,
  uploadPhoto,
  type PhotoPatch,
  type PhotoUsage,
  type StudioPhoto,
} from "./photos";

/**
 * Acervo de fotos do usuário logado, carregado do backend (persiste entre
 * dispositivos). Cada foto é privada de quem enviou.
 */
export const useStudioPhotos = (enabled: boolean) => {
  const [photos, setPhotos] = useState<StudioPhoto[]>([]);
  const [loading, setLoading] = useState(enabled);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setPhotos(await listPhotos());
    } catch (error) {
      console.error("[studio] falha ao carregar fotos", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  const add = useCallback(async (file: File, meta: { label: string; usage: PhotoUsage; credit?: string }) => {
    const photo = await uploadPhoto(file, meta);
    setPhotos((prev) => [...prev, photo]);
    return photo;
  }, []);

  const edit = useCallback(
    async (id: string, patch: PhotoPatch) => {
      await updatePhoto(id, patch);
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } as StudioPhoto : p)));
    },
    [],
  );

  const remove = useCallback(async (photo: StudioPhoto) => {
    await deletePhoto(photo);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }, []);

  return { photos, loading, reload, add, edit, remove };
};
