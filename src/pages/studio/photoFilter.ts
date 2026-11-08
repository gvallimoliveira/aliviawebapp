/** WebKit has no CanvasRenderingContext2D.filter. Apply photo filters to pixels
 * in the same order as CSS, rather than silently exporting the untreated photo. */
export const applyPhotoFilterPixels = (pixels: Uint8ClampedArray, filter: string) => {
  const operations = Array.from(filter.matchAll(/(brightness|saturate|contrast|grayscale|invert)\(([-\d.]+)(%?)\)/g));
  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    for (const [, name, number, percent] of operations) {
      const amount = Number(number) / (percent ? 100 : 1);
      if (name === 'brightness') { r *= amount; g *= amount; b *= amount; }
      if (name === 'contrast') {
        r = (r - 127.5) * amount + 127.5;
        g = (g - 127.5) * amount + 127.5;
        b = (b - 127.5) * amount + 127.5;
      }
      if (name === 'saturate' || name === 'grayscale') {
        const saturation = name === 'grayscale' ? 1 - amount : amount;
        const luminance = 0.213 * r + 0.715 * g + 0.072 * b;
        r = luminance + (r - luminance) * saturation;
        g = luminance + (g - luminance) * saturation;
        b = luminance + (b - luminance) * saturation;
      }
      if (name === 'invert') {
        r = r * (1 - amount) + (255 - r) * amount;
        g = g * (1 - amount) + (255 - g) * amount;
        b = b * (1 - amount) + (255 - b) * amount;
      }
      r = Math.min(255, Math.max(0, r));
      g = Math.min(255, Math.max(0, g));
      b = Math.min(255, Math.max(0, b));
    }
    pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b;
  }
};

export const filteredPhotoSource = (image: HTMLImageElement, filter: string, width: number, height: number): CanvasImageSource => {
  const canvas = document.createElement('canvas');
  // Only rasterize to the required export resolution, not the original camera size.
  const ratio = Math.min(1, Math.max(width / image.naturalWidth, height / image.naturalHeight));
  canvas.width = Math.max(1, Math.ceil(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.ceil(image.naturalHeight * ratio));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('photo-filter-context');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  applyPhotoFilterPixels(data.data, filter);
  context.putImageData(data, 0, 0);
  return canvas;
};