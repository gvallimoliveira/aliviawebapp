import type { StudioCarousel, WorldContent } from "./content/types";
import { isOfficialPhoto } from "./officialPhotos";
import { photoAffinity } from "./photoMeaning";
import type { StudioPhoto } from "./photos";
import type { TopicId } from "./topics";

export type ImagePolicy = "semantic" | "explicit-only";

export const resolveExplicitPhotos = (
  photoIds: readonly string[] | undefined,
  photos: readonly StudioPhoto[] | undefined,
): StudioPhoto[] => {
  if (!photoIds?.length || !photos?.length) return [];
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  return photoIds.map((id) => byId.get(id)).filter((photo): photo is StudioPhoto => Boolean(photo));
};

export const pickExplicitPhoto = (
  photoIds: readonly string[] | undefined,
  photos: readonly StudioPhoto[] | undefined,
  index: number,
): StudioPhoto | undefined => {
  const exact = resolveExplicitPhotos(photoIds, photos);
  return exact.length ? exact[index % exact.length] : undefined;
};

export const carouselSlide = (carousel: StudioCarousel, slideIndex: number) =>
  slideIndex > 0 && slideIndex <= carousel.slides.length ? carousel.slides[slideIndex - 1] : undefined;

/**
 * Prints oficiais são documentação visual de uma funcionalidade, não fotos de
 * ambientação. Eles só atravessam para a arte quando o conteúdo declara seus
 * IDs exatos. Fotos comuns continuam seguindo o nexo semântico por tópico.
 */
export const curatePhotosForContent = (
  photos: readonly StudioPhoto[] | undefined,
  content: Pick<WorldContent, "officialPhotoIds">,
): StudioPhoto[] => {
  if (!photos?.length) return [];
  const allowed = new Set(content.officialPhotoIds ?? []);
  return photos.filter((photo) => !isOfficialPhoto(photo) || allowed.has(photo.id));
};

export const officialPhotoIsAllowed = (
  photo: StudioPhoto,
  content: Pick<WorldContent, "officialPhotoIds">,
): boolean => !isOfficialPhoto(photo) || (content.officialPhotoIds ?? []).includes(photo.id);

/** Ordena a troca manual pelo assunto atual sem esconder o restante do acervo. */
export const rankPhotosForSwap = (
  photos: readonly StudioPhoto[] | undefined,
  options: { officialPhotoIds?: readonly string[]; topics?: readonly (TopicId | undefined)[] },
): StudioPhoto[] => {
  const allowed = new Set(options.officialPhotoIds ?? []);
  return [...(photos ?? [])].sort((a, b) => {
    const exactA = allowed.has(a.id) ? 1 : 0;
    const exactB = allowed.has(b.id) ? 1 : 0;
    if (exactA !== exactB) return exactB - exactA;
    const affinityA = photoAffinity(a, [...(options.topics ?? [])]);
    const affinityB = photoAffinity(b, [...(options.topics ?? [])]);
    return affinityB - affinityA;
  });
};