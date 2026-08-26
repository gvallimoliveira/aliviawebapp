import { supabase } from "@/integrations/supabase/client";

/**
 * BIBLIOTECA DE FOTOS DO STUDIO
 *
 * Fotos reais (institucionais, atendimento, produto) que o motor criativo pode
 * usar dentro das artes. Ficam na conta (bucket privado `studio-photos`, uma
 * pasta por usuário) — não no navegador — então sobrevivem a troca de
 * dispositivo e já servem o Studio público depois. Cada foto pertence apenas a
 * quem a enviou: RLS por `auth.uid()` no banco e no storage.
 *
 * Para exportar PNG com fidelidade, a foto é carregada como **data URL**
 * (html-to-image não consegue clonar imagem remota sem CORS).
 */

export const PHOTO_BUCKET = "studio-photos";

export type PhotoUsage = "institucional" | "atendimento" | "produto" | "livre";

export const PHOTO_USAGES: { id: PhotoUsage; label: string; hint: string }[] = [
  { id: "institucional", label: "Institucional", hint: "Fundador, equipe, marca" },
  { id: "atendimento", label: "Atendimento", hint: "Registro real de sessão" },
  { id: "produto", label: "Produto", hint: "Tela, material, bastidor" },
  { id: "livre", label: "Livre", hint: "Uso geral nas artes" },
];

export type StudioPhoto = {
  id: string;
  storagePath: string;
  label: string;
  usage: PhotoUsage;
  credit: string | null;
  sortOrder: number;
  /** Data URL da imagem, pronta para render e exportação. */
  src: string;
};

const asUsage = (value: string): PhotoUsage =>
  (PHOTO_USAGES.some((u) => u.id === value) ? value : "livre") as PhotoUsage;

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Cache em memória: a mesma foto não é baixada duas vezes por sessão. */
const srcCache = new Map<string, string>();

const loadSrc = async (storagePath: string): Promise<string> => {
  const cached = srcCache.get(storagePath);
  if (cached) return cached;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(storagePath);
  if (error || !data) throw error ?? new Error("download falhou");
  const src = await toDataUrl(data);
  srcCache.set(storagePath, src);
  return src;
};

/** Lê as fotos do usuário logado e resolve o conteúdo binário de cada uma. */
export const listPhotos = async (): Promise<StudioPhoto[]> => {
  const { data, error } = await supabase
    .from("studio_photos")
    .select("id, storage_path, label, usage, credit, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const resolved = await Promise.all(
    rows.map(async (row) => {
      try {
        const src = await loadSrc(row.storage_path);
        return {
          id: row.id,
          storagePath: row.storage_path,
          label: row.label ?? "",
          usage: asUsage(row.usage ?? "livre"),
          credit: row.credit ?? null,
          sortOrder: row.sort_order ?? 0,
          src,
        } satisfies StudioPhoto;
      } catch (err) {
        console.error("[studio] foto indisponível", row.storage_path, err);
        return null;
      }
    }),
  );
  return resolved.filter((p): p is StudioPhoto => p !== null);
};

/** Envia uma foto para a pasta do usuário e registra os metadados. */
export const uploadPhoto = async (
  file: File,
  meta: { label: string; usage: PhotoUsage; credit?: string },
): Promise<StudioPhoto> => {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sessão expirada — entre novamente.");

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const storagePath = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;

  const { error: upErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, file, { contentType: file.type || "image/jpeg", upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("studio_photos")
    .insert({
      owner_id: uid,
      storage_path: storagePath,
      label: meta.label.trim(),
      usage: meta.usage,
      credit: meta.credit?.trim() || null,
    })
    .select("id, storage_path, label, usage, credit, sort_order")
    .single();
  if (error) throw error;

  const src = await toDataUrl(file);
  srcCache.set(storagePath, src);
  return {
    id: data.id,
    storagePath,
    label: data.label ?? "",
    usage: asUsage(data.usage ?? "livre"),
    credit: data.credit ?? null,
    sortOrder: data.sort_order ?? 0,
    src,
  };
};

export const updatePhoto = async (
  id: string,
  patch: { label?: string; usage?: PhotoUsage; credit?: string | null },
) => {
  const { error } = await supabase.from("studio_photos").update(patch).eq("id", id);
  if (error) throw error;
};

export const deletePhoto = async (photo: StudioPhoto) => {
  const { error } = await supabase.from("studio_photos").delete().eq("id", photo.id);
  if (error) throw error;
  srcCache.delete(photo.storagePath);
  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storagePath]);
};

/**
 * Escolhe uma foto de forma determinística (mesma seed → mesma foto), com
 * preferência por um tipo de uso. Sem foto do tipo pedido, cai para o acervo
 * inteiro; sem acervo, devolve `undefined` e o bloco não entra na composição.
 */
export const pickPhoto = (
  photos: StudioPhoto[] | undefined,
  index: number,
  prefer?: PhotoUsage[],
): StudioPhoto | undefined => {
  if (!photos || photos.length === 0) return undefined;
  const pool = prefer ? photos.filter((p) => prefer.includes(p.usage)) : [];
  const from = pool.length > 0 ? pool : photos;
  return from[Math.abs(index) % from.length];
};
