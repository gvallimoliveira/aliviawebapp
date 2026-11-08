/** Photo lighting lives in the art DOM, so snapshots and PNG share the same value. */
export const normalizePhotoShade = (value = 100) => Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 100;
export const photoLightValues = (value = 100) => {
  const amount = normalizePhotoShade(value) / 100;
  return { amount, brightness: 1 - 0.18 * amount, saturation: 1 - 0.15 * amount, opacity: 1 - 0.1 * amount };
};
export const photoBackgrounds = (node: HTMLElement | null): HTMLElement[] => {
  if (!node) return [];
  return Array.from(node.querySelectorAll<HTMLElement>('[data-studio-photo-background], [data-studio-inserted-image="1"]'))
    .filter((el) => el.hasAttribute('data-studio-photo-background') || el.querySelector('img[data-studio-export-image-layer="backdrop"]'));
};
export const applyPhotoShade = (node: HTMLElement | null, value = 100) => {
  const level = normalizePhotoShade(value);
  const { amount, brightness, saturation, opacity } = photoLightValues(level);
  photoBackgrounds(node).forEach((surface) => {
    surface.dataset.studioPhotoShade = String(level);
    surface.querySelectorAll<HTMLElement>('[data-studio-overlay="1"]').forEach((overlay) => {
      overlay.style.opacity = String(amount);
    });
    surface.querySelectorAll<HTMLImageElement>('img[data-studio-photo="1"]').forEach((img) => {
      const inserted = surface.hasAttribute('data-studio-inserted-image');
      img.style.filter = `brightness(${inserted ? 1 - 0.58 * amount : brightness}) saturate(${inserted ? 1 - 0.18 * amount : saturation}) contrast(${1 + 0.02 * amount})`;
      img.style.opacity = String(inserted ? 1 : opacity);
    });
  });
};
export const readPhotoShade = (node: HTMLElement | null) => normalizePhotoShade(Number(photoBackgrounds(node)[0]?.dataset.studioPhotoShade ?? 100));