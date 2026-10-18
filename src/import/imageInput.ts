/**
 * Datei (Kamera oder Upload) in ein Rasterbild laden. Durch das Neuzeichnen über ein Canvas
 * wird die EXIF-Drehung angewendet und alle Metadaten (z. B. GPS) verworfen. Das Bild bleibt nur im Speicher.
 */
import { Raster } from './raster';

export class ImageInputError extends Error {}

const isHeic = (file: File) => /hei[cf]$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);

export async function loadImageFile(file: File, maxSide = 2400): Promise<Raster> {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    throw new ImageInputError('PDF-Dateien werden noch nicht unterstützt. Bitte ein Foto oder einen Screenshot des Dienstplans verwenden.');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageInputError(isHeic(file)
      ? 'HEIC-Bilder kann dieser Browser nicht lesen. Bitte in der Kamera „Kompatibel“ (JPEG) einstellen oder das Bild als JPEG teilen.'
      : 'Das Bild konnte nicht gelesen werden.');
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const { data } = ctx.getImageData(0, 0, width, height);
  return { width, height, data };
}

export function rasterToCanvas(image: Raster): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
  return canvas;
}
