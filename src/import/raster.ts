/**
 * Einfaches Rasterbild (RGBA), kompatibel zu ImageData im Browser und in Node testbar.
 */
export interface Raster {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export function createRaster(width: number, height: number, value = 255): Raster {
  const data = new Uint8ClampedArray(width * height * 4).fill(value);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { width, height, data };
}

export const luminanceAt = (img: Raster, x: number, y: number): number => {
  const i = (y * img.width + x) * 4;
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
};

// Um 90° drehen; 'cw' = im Uhrzeigersinn (Hochformat-Foto eines Querformat-Plans aufrichten)
export function rotate90(img: Raster, direction: 'cw' | 'ccw'): Raster {
  const { width: w, height: h, data } = img;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = direction === 'cw' ? h - 1 - y : y;
    const ny = direction === 'cw' ? x : w - 1 - x;
    const s = (y * w + x) * 4, d = (ny * h + nx) * 4;
    out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = 255;
  }
  return { width: h, height: w, data: out };
}

// Um 180° drehen (Blatt auf dem Kopf fotografiert)
export const rotate180 = (img: Raster): Raster => rotate90(rotate90(img, 'cw'), 'cw');

// Ausschnitt [x0, y0, Breite, Höhe] um einen ganzzahligen Faktor vergrößert (kleine Schrift für die Texterkennung)
export function cropScaled(img: Raster, x0: number, y0: number, w: number, h: number, scale: number): Raster {
  const out = createRaster(w * scale, h * scale);
  for (let y = 0; y < h * scale; y++) for (let x = 0; x < w * scale; x++) {
    const sx = Math.min(img.width - 1, x0 + Math.floor(x / scale)), sy = Math.min(img.height - 1, y0 + Math.floor(y / scale));
    const s = (sy * img.width + sx) * 4, d = (y * w * scale + x) * 4;
    out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1]; out.data[d + 2] = img.data[s + 2];
  }
  return out;
}
