/**
 * Cleans a signature image (handwriting and/or stamp) so only the ink remains
 * on a truly transparent background. The paper tone is estimated from the
 * image itself, so phone photos with shaded paper still separate cleanly.
 * Colored stamp inks (blue, violet, red) are kept by chroma even when light;
 * neutral ink is kept by contrast against the paper. Both stay fully legible.
 */
export function estimatePaperLuminance(data: Uint8ClampedArray): number {
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 20) continue;
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[lum]++; n++;
  }
  if (!n) return 255;
  // Paper dominates the frame: take the 75th percentile brightness.
  let acc = 0;
  for (let l = 0; l < 256; l++) { acc += hist[l]; if (acc >= n * 0.75) return l; }
  return 255;
}

export function cleanSignaturePixels(data: Uint8ClampedArray, _threshold = 170): void {
  const paper = estimatePaperLuminance(data);
  const cut = Math.max(60, Math.min(paper - 45, 185));
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 20) { data[i + 3] = 0; continue; }
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const darkAlpha = lum < cut ? Math.round(((cut - lum) / cut) * 255 * 2.2) : 0;
    if (sat >= 40 && lum < paper - 8) {
      // Colored stamp/pen ink: preserve by chroma, never fade into a watermark
      const alpha = Math.max(darkAlpha, Math.min(255, sat * 4), 150);
      data[i + 3] = Math.min(a, alpha);
    } else if (lum < cut) {
      data[i + 3] = Math.min(a, Math.min(255, Math.max(darkAlpha, 90)));
    } else {
      data[i + 3] = 0;
    }
  }
}
export async function cleanSignatureBlob(src: Blob): Promise<Blob> {
  const url = URL.createObjectURL(src);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    cleanSignaturePixels(imgData.data);
    ctx.putImageData(imgData, 0, 0);

    // Crop to ink bounds
    const { width: w, height: h } = canvas;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    const d = imgData.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 0) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    let out = canvas;
    if (maxX >= 0) {
      const pad = 8;
      minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
      maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
      out = document.createElement("canvas");
      out.width = maxX - minX + 1;
      out.height = maxY - minY + 1;
      out.getContext("2d")!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    }
    return await new Promise<Blob>((res, rej) =>
      out.toBlob((b) => (b ? res(b) : rej(new Error("png"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
