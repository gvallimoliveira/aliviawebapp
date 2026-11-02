import { supabase } from "@/integrations/supabase/client";
import { preparePhoto } from "@/lib/preparePhoto";

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

/** Onde o texto da arte costuma cair — o recorte preserva essa faixa. */
export type SafeArea = "none" | "top" | "bottom";

/**
 * Enquadramento escolhido no editor de fotos. É guardado na conta e aplicado
 * automaticamente por todos os blocos fotográficos (`PhotoFrame`).
 */
export type PhotoFraming = {
  /** Ponto focal em % da imagem (o que nunca deve ser cortado). */
  focusX: number;
  focusY: number;
  /** Aproximação (1 = imagem inteira). */
  zoom: number;
  /** Rotação em graus (-180..180), para endireitar a foto. */
  rotation: number;
  safeArea: SafeArea;
};

export const DEFAULT_FRAMING: PhotoFraming = {
  focusX: 50,
  focusY: 50,
  zoom: 1,
  rotation: 0,
  safeArea: "none",
};

export type StudioPhoto = PhotoFraming & {
  id: string;
  storagePath: string;
  label: string;
  /**
   * Descrição breve escrita pelo usuário: o que a imagem mostra e/ou onde ela
   * deve ser usada. É o insumo mais forte do nexo foto × assunto — nunca vira
   * título/headline da arte.
   */
  description: string;
  usage: PhotoUsage;
  credit: string | null;
  sortOrder: number;
  /** Data URL da imagem, pronta para render e exportação. */
  src: string;
};

const asUsage = (value: string): PhotoUsage =>
  (PHOTO_USAGES.some((u) => u.id === value) ? value : "livre") as PhotoUsage;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Normaliza o enquadramento vindo do banco (linha antiga = valores padrão). */
const asFraming = (row: {
  focus_x?: number | null;
  focus_y?: number | null;
  zoom?: number | null;
  rotation?: number | null;
  safe_area?: string | null;
}): PhotoFraming => ({
  focusX: clamp(Number(row.focus_x ?? 50), 0, 100),
  focusY: clamp(Number(row.focus_y ?? 50), 0, 100),
  zoom: clamp(Number(row.zoom ?? 1), 1, 3),
  rotation: clamp(Math.round(Number(row.rotation ?? 0)), -180, 180),
  safeArea: (["none", "top", "bottom"].includes(row.safe_area ?? "") ? row.safe_area : "none") as SafeArea,
});

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

/**
 * Lê as fotos do usuário logado e resolve o conteúdo binário de cada uma.
 *
 * Cada marca tem acervo próprio: com `brandId`, só as fotos daquela marca
 * entram. Sem `brandId` (Studio interno) o acervo inteiro da conta é lido.
 */
export const listPhotos = async (brandId?: string): Promise<StudioPhoto[]> => {
  let query = supabase
    .from("studio_photos")
    .select("id, storage_path, label, description, usage, credit, sort_order, focus_x, focus_y, zoom, rotation, safe_area");
  if (brandId) query = query.eq("brand_id", brandId);
  const { data, error } = await query
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
          description: row.description ?? "",
          usage: asUsage(row.usage ?? "livre"),
          credit: row.credit ?? null,
          sortOrder: row.sort_order ?? 0,
          ...asFraming(row),
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

/** Teto por arquivo: cabe um JPG de câmera ou um PNG pesado de tela. */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

/** Quantas fotos o usuário já tem no acervo (para o contador do plano). */
export const countPhotos = async (): Promise<number> => {
  const { count, error } = await supabase
    .from("studio_photos")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
};

/** Envia uma foto para a pasta do usuário e registra os metadados. */
export const uploadPhoto = async (
  file: File,
  meta: { label: string; usage: PhotoUsage; credit?: string; description?: string; brandId?: string },
): Promise<StudioPhoto> => {
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Esta foto passa de 15 MB. Exporte em qualidade um pouco menor e envie de novo.");
  }

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sessão expirada — entre novamente.");

  // 2400px retains detail for HD artwork; clinical photos use 1600px.
  const payload = await preparePhoto(file, 2400);
  const ext = (payload.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const storagePath = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;

  const { error: upErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, payload, {
      contentType: payload.type || "image/jpeg",
      upsert: false,
    });
  if (upErr) throw upErr;


  const { data, error } = await supabase
    .from("studio_photos")
    .insert({
      owner_id: uid,
      // Acervo é por marca no Studio público; no interno fica sem marca.
      brand_id: meta.brandId ?? null,
      storage_path: storagePath,
      label: meta.label.trim(),
      description: meta.description?.trim() || null,
      usage: meta.usage,
      credit: meta.credit?.trim() || null,
    })
    .select("id, storage_path, label, description, usage, credit, sort_order, focus_x, focus_y, zoom, rotation, safe_area")
    .single();
  if (error) {
    // Limite do plano (ou qualquer recusa do banco): não deixa arquivo órfão.
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    throw error;
  }

  const src = await toDataUrl(payload);
  srcCache.set(storagePath, src);

  return {
    id: data.id,
    storagePath,
    label: data.label ?? "",
    description: data.description ?? "",
    usage: asUsage(data.usage ?? "livre"),
    credit: data.credit ?? null,
    sortOrder: data.sort_order ?? 0,
    ...asFraming(data),
    src,
  };
};

export type PhotoPatch = {
  label?: string;
  description?: string;
  usage?: PhotoUsage;
  credit?: string | null;
} & Partial<PhotoFraming>;

export const updatePhoto = async (id: string, patch: PhotoPatch) => {
  const row: Record<string, unknown> = {};
  if (patch.label !== undefined) row.label = patch.label;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.usage !== undefined) row.usage = patch.usage;
  if (patch.credit !== undefined) row.credit = patch.credit;
  if (patch.focusX !== undefined) row.focus_x = clamp(patch.focusX, 0, 100);
  if (patch.focusY !== undefined) row.focus_y = clamp(patch.focusY, 0, 100);
  if (patch.zoom !== undefined) row.zoom = clamp(patch.zoom, 1, 3);
  if (patch.rotation !== undefined) row.rotation = clamp(Math.round(patch.rotation), -180, 180);
  if (patch.safeArea !== undefined) row.safe_area = patch.safeArea;

  const { error } = await supabase.from("studio_photos").update(row).eq("id", id);
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
