/**
 * Aufbereitung einzelner Zellen für die Texterkennung und Merkmale für den Mustervergleich.
 */
import { Rect } from './geometry';
import { Raster } from './raster';

export interface CellImage {
  image: Raster;        // dunkle Schrift auf Weiß, hochskaliert, mit Rand
  contrast: number;     // Standardabweichung der Helligkeit (Leer-Erkennung pro Plan)
  partialFill: boolean; // Farbfläche nur in einem Teil der Zelle
}

export interface CellImageOptions {
  scale?: number;
  insetLeft?: number;   // Anteil der Zellbreite
  insetRight?: number;
  insetY?: number;      // Anteil der Zellhöhe
  rowBackground?: boolean; // Hintergrund je Pixelzeile (Gegencheck bei Teilfüllung)
}

const median = (values: ArrayLike<number>): number => {
  const sorted = Array.from(values).sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
};

export function prepareCell(img: Raster, [x0, y0, w, h]: Rect, options: CellImageOptions = {}): CellImage {
  const { scale = 2, insetLeft = 0.06, insetRight = 0.02, insetY = 0.1, rowBackground = false } = options;
  // Ränder getrennt: rechts reicht die Schrift im echten Plan bis an die Gitterlinie
  const il = Math.round(w * insetLeft), ir = Math.round(w * insetRight), iy = Math.round(h * insetY);
  const cw = Math.max(1, w - il - ir), ch = Math.max(1, h - 2 * iy);
  const gray = new Float32Array(cw * ch), sat = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const s = ((y0 + iy + y) * img.width + (x0 + il + x)) * 4;
    const r = img.data[s], g = img.data[s + 1], b = img.data[s + 2];
    gray[y * cw + x] = 0.299 * r + 0.587 * g + 0.114 * b;
    sat[y * cw + x] = Math.max(r, g, b) - Math.min(r, g, b);
  }

  // Senkrechte Gitterlinien am Zellrand entfernen: fast durchgehend deutlich dunkler als der Median
  const med = median(gray);
  for (const x of [0, 1, 2, 3, cw - 4, cw - 3, cw - 2, cw - 1]) {
    if (x < 0 || x >= cw) continue;
    let dark = 0;
    for (let y = 0; y < ch; y++) if (gray[y * cw + x] < med - 50) dark++;
    if (dark > ch * 0.8) for (let y = 0; y < ch; y++) gray[y * cw + x] = med;
  }

  // Otsu-Schwelle (Schrift/Hintergrund) und Polarität: ist der Hintergrund dunkel, invertieren
  const hist = new Array(256).fill(0);
  for (const g of gray) hist[Math.max(0, Math.min(255, Math.round(g)))]++;
  const total = gray.length;
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += t * hist[t];
    const v = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (v > best) { best = v; thr = t; }
  }
  const mean = gray.reduce((a, b) => a + b, 0) / total;
  const contrast = Math.sqrt(gray.reduce((a, b) => a + (b - mean) ** 2, 0) / total);
  let darkCount = 0; for (const g of gray) if (g < thr) darkCount++;
  const invert = darkCount > total / 2;
  let lo = 0, hi = 0, nlo = 0, nhi = 0;
  for (const g of gray) { if (g < thr) { lo += g; nlo++; } else { hi += g; nhi++; } }
  lo = nlo ? lo / nlo : 0; hi = nhi ? hi / nhi : 255;

  // Teilfüllung: Hintergrund und Farbsättigung ändern sich stark zwischen oberen und unteren Pixelzeilen
  const rowMed = new Float32Array(ch), rowSat = new Float32Array(ch);
  for (let y = 0; y < ch; y++) { rowMed[y] = median(gray.subarray(y * cw, (y + 1) * cw)); rowSat[y] = median(sat.subarray(y * cw, (y + 1) * cw)); }
  const sm = Array.from(rowMed).sort((a, b) => a - b), ss = Array.from(rowSat).sort((a, b) => a - b);
  const q = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
  const partialFill = q(sm, 0.9) - q(sm, 0.1) > 60 && q(ss, 0.9) - q(ss, 0.1) > 50;
  let diffScale = 25;
  if (rowBackground) {
    const diffs: number[] = [];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) diffs.push(Math.abs(gray[y * cw + x] - rowMed[y]));
    diffs.sort((a, b) => a - b);
    diffScale = Math.max(25, diffs[Math.floor(diffs.length * 0.97)] * 0.8);
  }

  // Hochskalieren (bilinear), Kontrast strecken; Tesseract binarisiert selbst
  const S = scale, pad = 20, OW = cw * S + 2 * pad, OH = ch * S + 2 * pad;
  const out = new Uint8ClampedArray(OW * OH * 4).fill(255);
  for (let y = 0; y < ch * S; y++) for (let x = 0; x < cw * S; x++) {
    const gx = Math.min(cw - 1.001, Math.max(0, (x + 0.5) / S - 0.5)), gy = Math.min(ch - 1.001, Math.max(0, (y + 0.5) / S - 0.5));
    const xi = Math.floor(gx), yi = Math.floor(gy), fx = gx - xi, fy = gy - yi;
    const at = (xx: number, yy: number) => gray[Math.min(ch - 1, yy) * cw + Math.min(cw - 1, xx)];
    const g = at(xi, yi) * (1 - fx) * (1 - fy) + at(xi + 1, yi) * fx * (1 - fy) + at(xi, yi + 1) * (1 - fx) * fy + at(xi + 1, yi + 1) * fx * fy;
    let v: number;
    if (rowBackground) {
      v = Math.round(255 * (1 - Math.min(1, Math.abs(g - rowMed[Math.min(ch - 1, Math.round(gy))]) / diffScale)));
    } else {
      let t = (g - lo) / Math.max(1, hi - lo); if (invert) t = 1 - t;
      v = Math.round(255 * Math.min(1, Math.max(0, t)));
    }
    const d = ((y + pad) * OW + (x + pad)) * 4;
    out[d] = out[d + 1] = out[d + 2] = v;
  }
  return { image: { width: OW, height: OH, data: out }, contrast, partialFill };
}

// Zellen nebeneinander zu einem Streifen zusammensetzen (Streifen-Erkennung); liefert die x-Bereiche je Zelle
export function composeStrip(cells: Raster[], gap = 60): { image: Raster; spans: [number, number][] } {
  const pad = 20, spans: [number, number][] = [];
  let W = pad;
  for (const c of cells) { spans.push([W, W + c.width]); W += c.width + gap; }
  const H = Math.max(...cells.map(c => c.height));
  const data = new Uint8ClampedArray(W * H * 4).fill(255);
  cells.forEach((c, i) => {
    const x0 = spans[i][0];
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const s = (y * c.width + x) * 4, d = (y * W + x0 + x) * 4;
      data[d] = c.data[s]; data[d + 1] = c.data[s + 1]; data[d + 2] = c.data[s + 2];
    }
  });
  return { image: { width: W, height: H, data }, spans };
}

// ---------- Mustervergleich ----------
export const PATCH_W = 56, PATCH_H = 24;
export type Patch = Float32Array;

// Normiertes Zellbild: Abweichung vom Zellmedian (polaritätsunabhängig)
export function patchOf(img: Raster, [x0, y0, w, h]: Rect): Patch {
  const il = Math.round(w * 0.04), iy = Math.round(h * 0.1);
  const cw = Math.max(1, w - il), ch = Math.max(1, h - 2 * iy), g = new Float32Array(PATCH_W * PATCH_H);
  for (let y = 0; y < PATCH_H; y++) for (let x = 0; x < PATCH_W; x++) {
    const sx = x0 + il + Math.floor(x * cw / PATCH_W), sy = y0 + iy + Math.floor(y * ch / PATCH_H), i = (sy * img.width + sx) * 4;
    g[y * PATCH_W + x] = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
  }
  const med = median(g);
  for (let i = 0; i < g.length; i++) g[i] = Math.abs(g[i] - med);
  return g;
}

function ncc(a: Patch, b: Patch, dx: number, dy: number): number {
  let sa = 0, sb = 0, n = 0;
  for (let y = 0; y < PATCH_H; y++) for (let x = 0; x < PATCH_W; x++) {
    const xa = x + dx, ya = y + dy; if (xa < 0 || ya < 0 || xa >= PATCH_W || ya >= PATCH_H) continue;
    sa += a[ya * PATCH_W + xa]; sb += b[y * PATCH_W + x]; n++;
  }
  const ma = sa / n, mb = sb / n; let num = 0, da = 0, db = 0;
  for (let y = 0; y < PATCH_H; y++) for (let x = 0; x < PATCH_W; x++) {
    const xa = x + dx, ya = y + dy; if (xa < 0 || ya < 0 || xa >= PATCH_W || ya >= PATCH_H) continue;
    const va = a[ya * PATCH_W + xa] - ma, vb = b[y * PATCH_W + x] - mb;
    num += va * vb; da += va * va; db += vb * vb;
  }
  return num / Math.sqrt(da * db || 1);
}

// Beste Korrelation mit Verschiebungstoleranz
export function similarity(a: Patch, b: Patch): number {
  let best = -1;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) best = Math.max(best, ncc(a, b, dx, dy));
  return best;
}

// Otsu-Schwelle für eine Werteliste (z. B. Zellkontraste eines Plans)
export function otsu1d(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  let best = -1, thr = v[0] ?? 0;
  for (let i = 1; i < v.length; i++) {
    const a = v.slice(0, i), b = v.slice(i);
    const ma = a.reduce((x, y) => x + y, 0) / a.length, mb = b.reduce((x, y) => x + y, 0) / b.length;
    const score = a.length * b.length * (ma - mb) ** 2;
    if (score > best) { best = score; thr = (v[i - 1] + v[i]) / 2; }
  }
  return thr;
}
