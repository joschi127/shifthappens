/**
 * Entzerrung und Raster: Homographie, Gitterlinien finden, Zellgrenzen einrasten (ADR 0001, Nachträge 2–4).
 */
import { Raster, luminanceAt } from './raster';

export type Point = [number, number];
// Ecken in der Reihenfolge oben links, oben rechts, unten rechts, unten links
export type Quad = [Point, Point, Point, Point];

function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// Homographie, die die Punkte src auf dst abbildet (3x3 als Array mit 9 Werten)
export function homography(src: Point[], dst: Point[]): number[] {
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  return [...solve(A, b), 1];
}

export const applyHomography = (h: number[], [x, y]: Point): Point => {
  const d = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d];
};

/**
 * Teil eines Vierecks bzw. seine Verlängerung nach oben und unten, in Blockhöhen gemessen:
 * from = 0, to = 1 ist das Viereck selbst; from = -1 nimmt einen gleich hohen Block darüber dazu.
 * Rechnet über die Homographie, bleibt also auch bei schräg fotografierten Plänen perspektivisch richtig.
 */
export function quadSlice(corners: Quad, from: number, to: number): Quad {
  const h = homography([[0, 0], [1, 0], [1, 1], [0, 1]], corners);
  return [applyHomography(h, [0, from]), applyHomography(h, [1, from]), applyHomography(h, [1, to]), applyHomography(h, [0, to])];
}

const insideImage = (img: { width: number; height: number }, quad: Quad) =>
  quad.every(([x, y]) => x >= 0 && y >= 0 && x <= img.width - 1 && y <= img.height - 1);

/** Wie viele gleich hohe Blöcke über und unter dem Viereck (je höchstens max) noch im Bild liegen */
export function neighborBlocks(img: { width: number; height: number }, corners: Quad, max: number): { above: number; below: number } {
  let above = 0, below = 0;
  while (above < max && insideImage(img, quadSlice(corners, -(above + 1), 0))) above++;
  while (below < max && insideImage(img, quadSlice(corners, 1, below + 2))) below++;
  return { above, below };
}

// Bereich innerhalb des Vierecks auf ein Rechteck W x H entzerren (bilinear)
export function warpQuad(img: Raster, corners: Quad, W: number, H: number): Raster {
  const h = homography([[0, 0], [W, 0], [W, H], [0, H]], corners);
  const out = new Uint8ClampedArray(W * H * 4);
  const at = (x: number, y: number, c: number) =>
    img.data[(Math.min(img.height - 1, Math.max(0, y)) * img.width + Math.min(img.width - 1, Math.max(0, x))) * 4 + c];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [sx, sy] = applyHomography(h, [x, y]);
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    const o = (y * W + x) * 4;
    for (let c = 0; c < 3; c++) {
      out[o + c] = at(x0, y0, c) * (1 - fx) * (1 - fy) + at(x0 + 1, y0, c) * fx * (1 - fy) + at(x0, y0 + 1, c) * (1 - fx) * fy + at(x0 + 1, y0 + 1, c) * fx * fy;
    }
    out[o + 3] = 255;
  }
  return { width: W, height: H, data: out };
}

// Hochpass: Linie = dunkler als die Umgebung (blendet breite Schattierungen wie Wochenendspalten aus)
function highPass(dark: Float32Array): Float32Array {
  return dark.map((v, i) => {
    let s = 0, c = 0;
    for (let k = -6; k <= 6; k++) if (Math.abs(k) > 2 && i + k >= 0 && i + k < dark.length) { s += dark[i + k]; c++; }
    return v - s / c;
  });
}

// Dunkelheit je Spalte (vertical) bzw. je Zeile, optional nur in einem x-Bereich
export function lineProfile(img: Raster, vertical: boolean, xFrom = 0, xTo = img.width): Float32Array {
  const n = vertical ? img.width : img.height;
  const dark = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0, count = 0;
    if (vertical) for (let y = 0; y < img.height; y += 2) { sum += 255 - luminanceAt(img, i, y); count++; }
    else for (let x = Math.max(0, xFrom); x < Math.min(img.width, xTo); x += 2) { sum += 255 - luminanceAt(img, x, i); count++; }
    dark[i] = count ? sum / count : 0;
  }
  return highPass(dark);
}

const strongestNear = (profile: Float32Array, expected: number, radius: number): number => {
  let best = expected, value = -Infinity;
  for (let p = Math.max(0, expected - radius); p <= Math.min(profile.length - 1, expected + radius); p++) {
    if (profile[p] > value) { value = profile[p]; best = p; }
  }
  return best;
};

export interface Grid {
  image: Raster;      // entzerrter Bereich
  cols: number;
  rows: number;
  colBounds: number[];            // cols + 1 Grenzen
  rowBoundsByCol: number[][];     // je Spalte rows + 1 Grenzen (gewölbtes Papier)
}

export type Rect = [number, number, number, number]; // x, y, Breite, Höhe

export const cellRect = (grid: Grid, col: number, row: number): Rect => {
  const rb = grid.rowBoundsByCol[col];
  return [grid.colBounds[col], rb[row], grid.colBounds[col + 1] - grid.colBounds[col], rb[row + 1] - rb[row]];
};

/**
 * Raster auf dem entzerrten Bild aufbauen: Grenzen auf die tatsächlichen Gitterlinien einrasten,
 * Zeilengrenzen pro Spalte nachführen (Startwert = Grenze der vorherigen Spalte).
 */
export function buildGrid(image: Raster, cols: number, rows: number): Grid {
  const cw = image.width / cols, rh = image.height / rows;
  const vProfile = lineProfile(image, true);
  const colBounds = Array.from({ length: cols + 1 }, (_, i) =>
    i === 0 || i === cols ? Math.round(i * cw) : strongestNear(vProfile, Math.round(i * cw), Math.round(cw * 0.35)));
  const hProfile = lineProfile(image, false);
  const rowBounds = Array.from({ length: rows + 1 }, (_, i) =>
    i === 0 || i === rows ? Math.round(i * rh) : strongestNear(hProfile, Math.round(i * rh), Math.round(rh * 0.35)));

  const rowBoundsByCol: number[][] = [];
  let previous = rowBounds;
  const radius = Math.round(rh * 0.3);
  for (let d = 0; d < cols; d++) {
    const profile = lineProfile(image, false, colBounds[Math.max(0, d - 1)], colBounds[Math.min(cols, d + 2)]);
    const bounds = previous.map(e => strongestNear(profile, e, radius));
    for (let i = 1; i < bounds.length; i++) if (bounds[i] <= bounds[i - 1] + 4) bounds[i] = bounds[i - 1] + 4; // Reihenfolge absichern
    rowBoundsByCol.push(bounds);
    previous = bounds;
  }
  return { image, cols, rows, colBounds, rowBoundsByCol };
}
