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

// Ausschnitt [x0, y0, Breite, Höhe] vergrößert, in Graustufen und geglättet (kleine Schrift für die Texterkennung)
export function cropScaled(img: Raster, x0: number, y0: number, w: number, h: number, scale: number): Raster {
  const out = createRaster(Math.round(w * scale), Math.round(h * scale));
  const L = (x: number, y: number) => luminanceAt(img, Math.min(img.width - 1, Math.max(0, x)), Math.min(img.height - 1, Math.max(0, y)));
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const sx = x0 + x / scale, sy = y0 + y / scale, ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
    const v = L(ix, iy) * (1 - fx) * (1 - fy) + L(ix + 1, iy) * fx * (1 - fy) + L(ix, iy + 1) * (1 - fx) * fy + L(ix + 1, iy + 1) * fx * fy;
    const o = (y * out.width + x) * 4;
    out.data[o] = v; out.data[o + 1] = v; out.data[o + 2] = v;
  }
  return out;
}

/** Waagerechter Streifen [y0, y1) eines Bildes als eigenes Bild */
export function rowsOf(img: Raster, y0: number, y1: number): Raster {
  return { width: img.width, height: y1 - y0, data: img.data.slice(y0 * img.width * 4, y1 * img.width * 4) };
}

/**
 * Lange waagerechte und senkrechte dunkle Linien (Tabellengitter) weiß übermalen, damit die Texterkennung
 * Schrift neben Gitterlinien liest. Kürzere dunkle Läufe (Buchstabenstriche) bleiben erhalten.
 */
export function removeGridLines(img: Raster, minRun: number): Raster {
  const { width: w, height: h } = img;
  const lum = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) { lum[i] = luminanceAt(img, i % w, Math.floor(i / w)); sum += lum[i]; }
  const dark = (i: number) => lum[i] < (sum / (w * h)) * 0.7;
  const erase = new Uint8Array(w * h);
  const mark = (indices: number[]) => { if (indices.length >= minRun) for (const i of indices) erase[i] = 1; };
  for (let y = 0; y < h; y++) {
    let run: number[] = [];
    for (let x = 0; x <= w; x++) { const i = y * w + x; if (x < w && dark(i)) run.push(i); else { mark(run); run = []; } }
  }
  for (let x = 0; x < w; x++) {
    let run: number[] = [];
    for (let y = 0; y <= h; y++) { const i = y * w + x; if (y < h && dark(i)) run.push(i); else { mark(run); run = []; } }
  }
  const out = { width: w, height: h, data: new Uint8ClampedArray(img.data) };
  for (let i = 0; i < w * h; i++) if (erase[i]) { out.data[i * 4] = 255; out.data[i * 4 + 1] = 255; out.data[i * 4 + 2] = 255; }
  return out;
}

/** In reines Schwarz-Weiß umwandeln, Schwelle nach Otsu (blasse Schrift auf grauem Papier, Dokumentenmodus) */
export function binarize(img: Raster): Raster {
  const n = img.width * img.height;
  const lum = new Uint8Array(n), hist = new Array(256).fill(0);
  for (let i = 0; i < n; i++) { lum[i] = Math.round(luminanceAt(img, i % img.width, Math.floor(i / img.width))); hist[lum[i]]++; }
  let total = 0; for (let v = 0; v < 256; v++) total += v * hist[v];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let v = 0; v < 256; v++) {
    wB += hist[v]; if (!wB) continue;
    const wF = n - wB; if (!wF) break;
    sumB += v * hist[v];
    const between = wB * wF * (sumB / wB - (total - sumB) / wF) ** 2;
    if (between > best) { best = between; threshold = v; }
  }
  const out = createRaster(img.width, img.height);
  for (let i = 0; i < n; i++) { const v = lum[i] <= threshold ? 0 : 255; out.data[i * 4] = v; out.data[i * 4 + 1] = v; out.data[i * 4 + 2] = v; }
  return out;
}
