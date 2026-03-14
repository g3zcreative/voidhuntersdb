export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeKB?: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function coverCrop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetW: number,
  targetH: number
) {
  const scale = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight);
  const sw = targetW / scale;
  const sh = targetH / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
      type,
      quality
    );
  });
}

const supportsWebP = (() => {
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
})();

export async function compressImage(
  file: File,
  { maxWidth = 1280, maxHeight = 720, maxSizeKB = 200 }: CompressOptions = {}
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = maxWidth;
  canvas.height = maxHeight;
  const ctx = canvas.getContext("2d")!;
  coverCrop(ctx, img, maxWidth, maxHeight);
  URL.revokeObjectURL(img.src);

  const mime = supportsWebP ? "image/webp" : "image/jpeg";
  const maxBytes = maxSizeKB * 1024;

  // Try decreasing quality until under target size
  for (let q = 0.85; q >= 0.3; q -= 0.05) {
    const blob = await canvasToBlob(canvas, mime, q);
    if (blob.size <= maxBytes) return blob;
  }

  // Return lowest quality attempt
  return canvasToBlob(canvas, mime, 0.3);
}

export const compressedExtension = supportsWebP ? "webp" : "jpg";
