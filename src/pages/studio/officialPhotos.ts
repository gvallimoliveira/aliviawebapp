import alivia1943 from "@/assets/studio-official/alivia-1943.jpeg.asset.json";
import alivia1945 from "@/assets/studio-official/alivia-1945.jpeg.asset.json";
import alivia1946 from "@/assets/studio-official/alivia-1946.jpeg.asset.json";
import alivia1947 from "@/assets/studio-official/alivia-1947.jpeg.asset.json";
import alivia1948 from "@/assets/studio-official/alivia-1948.jpeg.asset.json";
import alivia1949 from "@/assets/studio-official/alivia-1949.jpeg.asset.json";
import alivia1950 from "@/assets/studio-official/alivia-1950.jpeg.asset.json";
import alivia1951 from "@/assets/studio-official/alivia-1951.jpeg.asset.json";
import alivia1953 from "@/assets/studio-official/alivia-1953.jpeg.asset.json";
import alivia1954 from "@/assets/studio-official/alivia-1954.jpeg.asset.json";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_FRAMING,
  type PhotoFraming,
  type PhotoPatch,
  type StudioPhoto,
} from "./photos";

export const OFFICIAL_PHOTO_PREFIX = "official:alivia:";

type OfficialDefinition = Pick<StudioPhoto, "id" | "label" | "description" | "usage" | "sortOrder"> & {
  assetUrl: string;
};

const DEFINITIONS: OfficialDefinition[] = [
  {
    id: `${OFFICIAL_PHOTO_PREFIX}external-upload`,
    assetUrl: alivia1943.url,
    label: "Upload de avaliação externa",
    description: "Tela oficial do envio de PDFs e imagens para interpretação por IA e revisão do fisioterapeuta.",
    usage: "produto",
    sortOrder: -10,
  },
  {
    id: `${OFFICIAL_PHOTO_PREFIX}express-reassessment-steps`,
    assetUrl: alivia1945.url,
    label: "Reavaliação expressa — blocos da anamnese",
    description: "Tela oficial da seleção de etapas refeitas, com reaproveitamento dos dados da avaliação anterior.",
    usage: "produto",
    sortOrder: -9,
  },
  {
    id: `${OFFICIAL_PHOTO_PREFIX}express-reassessment-tools`,
    assetUrl: alivia1946.url,
    label: "Reavaliação expressa — etapas adicionais",
    description: "Tela oficial com questionários, testes funcionais, perfil psicossocial e triagem de red flags.",
    usage: "produto",
    sortOrder: -8,
  },
  {
    id: `${OFFICIAL_PHOTO_PREFIX}manual-anamnesis`,
    assetUrl: alivia1947.url,
    label: "Avaliação manual — anamnese",
    description: "Tela oficial da anamnese estruturada com queixa, histórico, fatores agravantes e aliviantes.",
    usage: "produto",
    sortOrder: -7,
  },
  {
    id: `${OFFICIAL_PHOTO_PREFIX}manual-pain-map`,
    assetUrl: alivia1948.url,
    label: "Avaliação manual — mapa de dor",
    description: "Tela oficial do mapa de dor para registrar regiões corporais acometidas.",
    usage: "produto",
    sortOrder: -6,
  },
  {
    id: `${OFFICIAL_PHOTO_PREFIX}manual-pain-mechanism`,
    assetUrl: alivia1949.url,
    label: "Avaliação manual — intensidade e mecanismo de dor",
    description: "Tela oficial com escala de dor, descritores e triagem determinística do mecanismo de dor.",
    usage: "produto",
    sortOrder: -5,
  },
  {
    id: `${OFFICIAL_PHOTO_PREFIX}manual-clinical-notes`,
    assetUrl: alivia1950.url,
    label: "Avaliação manual — observações clínicas",
    description: "Tela oficial para registrar achados que alimentam impressão clínica, diagnóstico e testes.",
    usage: "produto",
    sortOrder: -4,
  },
  {
    id: `${OFFICIAL_PHOTO_PREFIX}manual-mobility`,
    assetUrl: alivia1951.url,
    label: "Avaliação manual — mobilidade articular",
    description: "Tela oficial para documentar amplitude de movimento e comparar lados.",
    usage: "produto",
    sortOrder: -3,
  },
  {
    id: `${OFFICIAL_PHOTO_PREFIX}manual-dynamometry`,
    assetUrl: alivia1953.url,
    label: "Avaliação manual — dinamometria",
    description: "Tela oficial para importar laudo e registrar força muscular em quilograma-força por lado.",
    usage: "produto",
    sortOrder: -2,
  },
  {
    id: `${OFFICIAL_PHOTO_PREFIX}clinical-agent`,
    assetUrl: alivia1954.url,
    label: "Agente de Raciocínio Clínico",
    description: "Tela oficial do agente baseado em evidências, com decisão clínica mantida pelo fisioterapeuta.",
    usage: "produto",
    sortOrder: -1,
  },
];

const srcCache = new Map<string, string>();

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const loadAsset = async (url: string) => {
  const cached = srcCache.get(url);
  if (cached) return cached;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Imagem oficial indisponível (${response.status})`);
  const src = await toDataUrl(await response.blob());
  srcCache.set(url, src);
  return src;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const safeFraming = (value?: Partial<PhotoFraming>): PhotoFraming => ({
  focusX: clamp(Number(value?.focusX ?? DEFAULT_FRAMING.focusX), 0, 100),
  focusY: clamp(Number(value?.focusY ?? DEFAULT_FRAMING.focusY), 0, 100),
  zoom: clamp(Number(value?.zoom ?? DEFAULT_FRAMING.zoom), 1, 3),
  rotation: clamp(Math.round(Number(value?.rotation ?? DEFAULT_FRAMING.rotation)), -180, 180),
  safeArea: ["none", "top", "bottom"].includes(value?.safeArea ?? "")
    ? (value?.safeArea as PhotoFraming["safeArea"])
    : DEFAULT_FRAMING.safeArea,
});

const storageKey = (userId: string) => `studio:official-photo-framing:${userId}`;

const readFraming = (userId: string): Record<string, PhotoFraming> => {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "{}") as Record<string, Partial<PhotoFraming>>;
    return Object.fromEntries(Object.entries(parsed).map(([id, framing]) => [id, safeFraming(framing)]));
  } catch {
    return {};
  }
};

const currentUserId = async () => (await supabase.auth.getUser()).data.user?.id ?? "anonymous";

export const isOfficialPhoto = (photo: Pick<StudioPhoto, "id">) => photo.id.startsWith(OFFICIAL_PHOTO_PREFIX);

export const officialPhotoDefinitions = () => DEFINITIONS.map((item) => ({ ...item }));

export const listOfficialAliviaPhotos = async (): Promise<StudioPhoto[]> => {
  const userId = await currentUserId();
  const framings = readFraming(userId);
  const photos = await Promise.all(DEFINITIONS.map(async (item) => ({
    id: item.id,
    storagePath: item.assetUrl,
    label: item.label,
    description: item.description,
    usage: item.usage,
    credit: "Oficial Aliv.iA",
    sortOrder: item.sortOrder,
    ...safeFraming(framings[item.id]),
    src: await loadAsset(item.assetUrl),
  } satisfies StudioPhoto)));
  return photos;
};

export const updateOfficialPhoto = async (id: string, patch: PhotoPatch) => {
  if (!id.startsWith(OFFICIAL_PHOTO_PREFIX)) throw new Error("Imagem oficial inválida.");
  const framingPatch: Partial<PhotoFraming> = {
    focusX: patch.focusX,
    focusY: patch.focusY,
    zoom: patch.zoom,
    rotation: patch.rotation,
    safeArea: patch.safeArea,
  };
  const userId = await currentUserId();
  const current = readFraming(userId);
  current[id] = safeFraming({ ...current[id], ...framingPatch });
  localStorage.setItem(storageKey(userId), JSON.stringify(current));
};

export const officialAliviaPhotoCount = DEFINITIONS.length;