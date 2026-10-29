/**
 * Cleans a signature image so only the ink remains on a truly transparent
 * background. Removes white/light-gray backgrounds and "fake transparency"
 * checkerboards baked into the pixels, then crops to the ink with margin.
 */
export function cleanSignaturePixels(data: Uint8ClampedArray, threshold = 170): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (a < 20 || (lum >= threshold && sat < 60)) {
      data[i + 3] = 0;
    } else {
      // Soft edge: darker pixels keep more opacity
      const alpha = Math.min(255, Math.round(((threshold - Math.min(lum, threshold)) / threshold) * 255 * 1.6));
      data[i + 3] = Math.min(a, Math.max(alpha, 40));
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
