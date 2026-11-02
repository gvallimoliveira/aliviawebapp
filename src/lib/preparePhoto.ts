/** Upload-only optimization. Never used for PDFs, signatures or measurement imports. */
export function photoDimensions(width: number, height: number, maxEdge = 1600) {
  const ratio = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

export async function preparePhoto(file: File, maxEdge = 1600): Promise<File> {
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) return file;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const size = photoDimensions(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    // PNG/WebP may carry transparency: never flatten them to JPEG.
    const mime = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, 0.8));
    if (!blob || blob.size >= file.size) return file;
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type: mime, lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}