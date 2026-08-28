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
 *
 * `brandId` isola o acervo por marca (Studio público): a marca só vê e recebe
 * as próprias fotos. Sem `brandId` (Studio interno) vale o acervo da conta.
 */
export const useStudioPhotos = (enabled: boolean, brandId?: string) => {
  const [photos, setPhotos] = useState<StudioPhoto[]>([]);
  const [loading, setLoading] = useState(enabled);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setPhotos(await listPhotos(brandId));
    } catch (error) {
      console.error("[studio] falha ao carregar fotos", error);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    if (!enabled) return;
    setPhotos([]);
    void reload();
  }, [enabled, reload]);

  const add = useCallback(
    async (file: File, meta: { label: string; usage: PhotoUsage; credit?: string; description?: string }) => {
      const photo = await uploadPhoto(file, { ...meta, brandId });
      setPhotos((prev) => [...prev, photo]);
      return photo;
    },
    [brandId],
  );

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
