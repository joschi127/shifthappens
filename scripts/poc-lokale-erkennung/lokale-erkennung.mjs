// PoC (Simulation): lokale Erkennung von D-, S- und B-Zeile eines Dienstplans mit tesseract.js.
// Kein Produktivcode. Ergebnisse und Einordnung: docs/adr/0001-texterkennung-lokal-vor-cloud.md (Nachträge),
// Aufruf und Parameter: scripts/poc-lokale-erkennung/README.md
import fs from 'node:fs';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { createWorker, PSM } from 'tesseract.js';

const [, , imgPath, cornersJson, outDir, rotateFlag] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const loadRoster = (file) => { const r = JSON.parse(fs.readFileSync(file, 'utf-8')); return r.basis ? { ...loadRoster(file.replace(/[^/]+\.erwartet\.json$/, `${r.basis}.erwartet.json`)), ...r } : r; };
const ROSTER = loadRoster(process.env.ERWARTET);
if (process.env.PERSON) ROSTER.zeilen = [ROSTER.zeilen[Number(process.env.PERSON)]]; // nur ein Personenblock

// ---------- Bild laden (RGBA) ----------
function load(path) {
  const buf = fs.readFileSync(path);
  if (path.endsWith('.png')) { const p = PNG.sync.read(buf); return { width: p.width, height: p.height, data: p.data }; }
  const j = jpeg.decode(buf, { useTArray: true }); return { width: j.width, height: j.height, data: j.data };
}
function save(img, path) {
  const p = new PNG({ width: img.width, height: img.height }); p.data = Buffer.from(img.data); fs.writeFileSync(path, PNG.sync.write(p));
}
function rotate90cw(img) { // entspricht PIL rotate(-90)
  const { width: w, height: h, data } = img; const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = h - 1 - y, ny = x; const s = (y * w + x) * 4, d = (ny * h + nx) * 4;
    out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = 255;
  }
  return { width: h, height: w, data: out };
}

// ---------- Homographie ----------
function solve(A, b) { // Gauss
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
function homography(src, dst) { // bildet src -> dst ab
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solve(A, b); return [...h, 1];
}
function warp(img, corners, W, H) {
  const Hm = homography([[0, 0], [W, 0], [W, H], [0, H]], corners);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Hm[6] * x + Hm[7] * y + 1;
    const sx = (Hm[0] * x + Hm[1] * y + Hm[2]) / d, sy = (Hm[3] * x + Hm[4] * y + Hm[5]) / d;
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    for (let c = 0; c < 3; c++) {
      const g = (xx, yy) => img.data[(Math.min(img.height - 1, Math.max(0, yy)) * img.width + Math.min(img.width - 1, Math.max(0, xx))) * 4 + c];
      out[(y * W + x) * 4 + c] = g(x0, y0) * (1 - fx) * (1 - fy) + g(x0 + 1, y0) * fx * (1 - fy) + g(x0, y0 + 1) * (1 - fx) * fy + g(x0 + 1, y0 + 1) * fx * fy;
    }
    out[(y * W + x) * 4 + 3] = 255;
  }
  return { width: W, height: H, data: out };
}

// ---------- Zelle vorverarbeiten (Variante "absdiff") ----------
// Schrift = deutliche Abweichung vom lokalen Hintergrund (Median), unabhängig von der Polarität.
// Gitterlinien = Spalten/Zeilen, die fast durchgehend als Schrift markiert sind -> entfernen.
function cellToPngAbsdiff(img, x0, y0, w, h, scale) {
  const m = Math.max(1, Math.round(Math.min(w, h) * 0.03)); // nur minimaler Rand
  const cw = w - 2 * m, ch = h - 2 * m;
  const gray = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const s = ((y0 + m + y) * img.width + (x0 + m + x)) * 4;
    gray[y * cw + x] = 0.299 * img.data[s] + 0.587 * img.data[s + 1] + 0.114 * img.data[s + 2];
  }
  const R = Math.max(4, Math.round(ch * 0.45));
  const diff = new Float32Array(cw * ch);
  const win = [];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    win.length = 0;
    for (let yy = Math.max(0, y - R); yy <= Math.min(ch - 1, y + R); yy += 2) for (let xx = Math.max(0, x - R); xx <= Math.min(cw - 1, x + R); xx += 2) win.push(gray[yy * cw + xx]);
    win.sort((a, b) => a - b);
    diff[y * cw + x] = Math.abs(gray[y * cw + x] - win[win.length >> 1]);
  }
  const T = Number(process.env.ABSDIFF_T || 45);
  const ink = new Uint8Array(cw * ch); for (let i = 0; i < ink.length; i++) ink[i] = diff[i] > T ? 1 : 0;
  // Linien entfernen
  for (let x = 0; x < cw; x++) { let c = 0; for (let y = 0; y < ch; y++) c += ink[y * cw + x]; if (c > ch * 0.8) for (let y = 0; y < ch; y++) ink[y * cw + x] = 0; }
  for (let y = 0; y < ch; y++) { let c = 0; for (let x = 0; x < cw; x++) c += ink[y * cw + x]; if (c > cw * 0.7) for (let x = 0; x < cw; x++) ink[y * cw + x] = 0; }
  let inkCount = 0; for (const v of ink) inkCount += v;
  const S = scale, pad = 20, OW = cw * S + 2 * pad, OH = ch * S + 2 * pad;
  const out = new Uint8ClampedArray(OW * OH * 4).fill(255);
  for (let y = 0; y < ch * S; y++) for (let x = 0; x < cw * S; x++) {
    const gx = Math.min(cw - 1.001, Math.max(0, (x + 0.5) / S - 0.5)), gy = Math.min(ch - 1.001, Math.max(0, (y + 0.5) / S - 0.5));
    const xi = Math.floor(gx), yi = Math.floor(gy), fx = gx - xi, fy = gy - yi;
    const at = (xx, yy) => ink[yy * cw + xx] ? Math.min(1, diff[yy * cw + xx] / 120) : 0;
    const v = at(xi, yi) * (1 - fx) * (1 - fy) + at(xi + 1, yi) * fx * (1 - fy) + at(xi, yi + 1) * (1 - fx) * fy + at(xi + 1, yi + 1) * fx * fy;
    const d = ((y + pad) * OW + (x + pad)) * 4; out[d] = out[d + 1] = out[d + 2] = Math.round(255 * (1 - v));
  }
  return { img: { width: OW, height: OH, data: out }, inkRatio: inkCount / (cw * ch), invert: false };
}

// ---------- Zelle vorverarbeiten ----------
function cellToPng(img, x0, y0, w, h, scale) {
  if (process.env.MODE === 'absdiff') return cellToPngAbsdiff(img, x0, y0, w, h, scale);
  // Rand innen abschneiden (Gitterlinien), Graustufen, ggf. invertieren, Otsu, hochskalieren, weißer Rand
  // Ränder getrennt einstellbar: rechts reicht die Schrift im echten Plan bis an die Gitterlinie
  const il = Math.round(w * Number(process.env.INSET_L ?? process.env.INSET_X ?? 0.1));
  const ir = Math.round(w * Number(process.env.INSET_R ?? process.env.INSET_X ?? 0.1));
  const iy = Math.round(h * Number(process.env.INSET_Y ?? 0.14));
  const cw = w - il - ir, ch = h - 2 * iy;
  const gray = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const s = ((y0 + iy + y) * img.width + (x0 + il + x)) * 4;
    gray[y * cw + x] = 0.299 * img.data[s] + 0.587 * img.data[s + 1] + 0.114 * img.data[s + 2];
  }
  // Senkrechte Gitterlinien an den Rändern entfernen: Spalte fast durchgehend deutlich dunkler als der Median
  if (process.env.LINEFIX === '1') {
    const med = [...gray].sort((a, b) => a - b)[gray.length >> 1];
    for (const x of [0, 1, 2, 3, cw - 4, cw - 3, cw - 2, cw - 1]) {
      if (x < 0 || x >= cw) continue;
      let dark = 0; for (let y = 0; y < ch; y++) if (gray[y * cw + x] < med - 50) dark++;
      if (dark > ch * 0.8) for (let y = 0; y < ch; y++) gray[y * cw + x] = med;
    }
  }
  // Otsu
  const hist = new Array(256).fill(0); for (const g of gray) hist[Math.round(g)]++;
  const total = gray.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break; sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; thr = t; } }
  const contrast = Math.sqrt(best / (total * total)); // grob: Abstand der Klassen
  const mean = gray.reduce((a, b) => a + b, 0) / total;
  const std = Math.sqrt(gray.reduce((a, b) => a + (b - mean) ** 2, 0) / total);
  // Hintergrund = Mehrheit; ist er dunkel, invertieren
  let darkCount = 0; for (const g of gray) if (g < thr) darkCount++;
  const invert = darkCount > total / 2;
  // Mittelwerte der beiden Klassen für die Kontraststreckung
  let lo = 0, hi = 0, nlo = 0, nhi = 0; for (const g of gray) { if (g < thr) { lo += g; nlo++; } else { hi += g; nhi++; } }
  lo = nlo ? lo / nlo : 0; hi = nhi ? hi / nhi : 255;
  let ink = 0;
  const S = scale, pad = 20, OW = cw * S + 2 * pad, OH = ch * S + 2 * pad;
  const out = new Uint8ClampedArray(OW * OH * 4).fill(255);
  for (let y = 0; y < ch * S; y++) for (let x = 0; x < cw * S; x++) {
    const gx = Math.min(cw - 1.001, Math.max(0, (x + 0.5) / S - 0.5)), gy = Math.min(ch - 1.001, Math.max(0, (y + 0.5) / S - 0.5));
    const xi = Math.floor(gx), yi = Math.floor(gy), fx = gx - xi, fy = gy - yi;
    const g = gray[yi * cw + xi] * (1 - fx) * (1 - fy) + gray[yi * cw + xi + 1] * fx * (1 - fy) + gray[(yi + 1) * cw + xi] * (1 - fx) * fy + gray[(yi + 1) * cw + xi + 1] * fx * fy;
    let black = g < thr; if (invert) black = !black;
    if (contrast < 12) black = false; // leere Zelle (nur Rauschen)
    if (black) ink++;
    const d = ((y + pad) * OW + (x + pad)) * 4;
    let v;
    if (process.env.MODE === 'gray') {
      // Kontrast strecken zwischen Schrift- und Hintergrundmittel, Tesseract binarisiert selbst
      let t = (g - lo) / Math.max(1, hi - lo); if (invert) t = 1 - t;
      v = (process.env.PLANINK === '1' ? false : contrast < 12) ? 255 : Math.round(255 * Math.min(1, Math.max(0, t)));
    } else v = black ? 0 : 255;
    out[d] = out[d + 1] = out[d + 2] = v;
  }
  return { img: { width: OW, height: OH, data: out }, inkRatio: ink / (cw * ch * S * S), invert, std };
}

// ---------- Ablauf ----------
let img = load(imgPath);
if (rotateFlag === 'rotate90') img = rotate90cw(img);
const corners = JSON.parse(cornersJson);
// Unterzeilen je Person: 5 (D/S/B/A/E) bei Plänen mit Unterzeilen, sonst 1 (nur Dienst)
const SUB = ROSTER.unterzeilen ? Object.keys(ROSTER.unterzeilen).length : 1;
const COLS = ROSTER.tage || 30, ROWS = ROSTER.zeilen.length * SUB, CW = 64, RH = 34;
const grid = warp(img, corners, COLS * CW, ROWS * RH);
save(grid, `${outDir}/grid.png`);

// Gitterlinien suchen: erwartete Grenzen auf die nächste dunkle, dünne Linie einrasten
function lineProfile(img, vertical) {
  const n = vertical ? img.width : img.height, m = vertical ? img.height : img.width;
  const dark = new Float32Array(n);
  for (let i = 0; i < n; i++) { let sum = 0; for (let j = 0; j < m; j += 2) {
    const x = vertical ? i : j, y = vertical ? j : i, s = (y * img.width + x) * 4;
    sum += 255 - (0.299 * img.data[s] + 0.587 * img.data[s + 1] + 0.114 * img.data[s + 2]); }
    dark[i] = sum / (m / 2); }
  // Hochpass: Linie = dunkler als die Umgebung (blendet breite Schattierungen wie Wochenendspalten aus)
  return dark.map((v, i) => { let s = 0, c = 0; for (let k = -6; k <= 6; k++) if (Math.abs(k) > 2 && dark[i + k] !== undefined) { s += dark[i + k]; c++; } return v - s / c; });
}
function snapBounds(profile, count, size) {
  const b = [];
  for (let i = 0; i <= count; i++) {
    const e = i * size, r = Math.round(size * 0.35); let best = e, bv = -Infinity;
    for (let x = Math.max(0, e - r); x <= Math.min(profile.length - 1, e + r); x++) if (profile[x] > bv) { bv = profile[x]; best = x; }
    b.push(i === 0 || i === count ? e : best);
  }
  return b;
}
const SNAP = process.env.SNAP === '1';
const colB = SNAP ? snapBounds(lineProfile(grid, true), COLS, CW) : [...Array(COLS + 1)].map((_, i) => i * CW);
const rowB = SNAP ? snapBounds(lineProfile(grid, false), ROWS, RH) : [...Array(ROWS + 1)].map((_, i) => i * RH);
const cellRect = (d, r) => [colB[d], rowB[r], colB[d + 1] - colB[d], rowB[r + 1] - rowB[r]];

const ALLOWED = new Set(['F01', 'F02', 'F04', 'M01', 'M05', 'S04', 'N01', 'N06', 'N08', 'D03', '////', '-', 'U', 'B11']);
const normalize = (t) => {
  let s = t.replace(/\s+/g, '').toUpperCase();
  if (/^[\/|lI1]{3,}$/.test(s)) return '////';
  if (/^[-–—_~.]+$/.test(s)) return '-';
  // Position: Buchstabe + 2 Ziffern
  if (s.length === 3) s = s[0].replace('0', 'O').replace('5', 'S').replace('8', 'B') + s.slice(1).replace(/[OQD]/g, '0').replace(/[IL|]/g, '1').replace(/S/g, '5').replace(/B/g, '8');
  return s;
};

const worker = await createWorker('eng');
await worker.setParameters({
  tessedit_pageseg_mode: process.env.PSM === 'word' ? PSM.SINGLE_WORD : PSM.SINGLE_LINE,
  tessedit_char_whitelist: [...new Set([...ROSTER.zeilen.flatMap(z => [...z.codes, ...(z.sonder || [])]).join('').replace(/[–—]/g, ''), '-'])].join(''),
});

const dcells = [], scells = [];
// Normiertes Zellbild für den Mustervergleich: Abweichung vom Zellmedian (polaritätsunabhängig), 56x24, mittelwertfrei, L2-normiert
const PW = 56, PH = 24;
function patchOf(img, x0, y0, w, h) {
  const il = Math.round(w * 0.04), ir = Math.round(w * 0.0), iy = Math.round(h * 0.1);
  const cw = w - il - ir, ch = h - 2 * iy, g = new Float32Array(PW * PH);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const sx = x0 + il + Math.floor(x * cw / PW), sy = y0 + iy + Math.floor(y * ch / PH), i = (sy * img.width + sx) * 4;
    g[y * PW + x] = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
  }
  const med = [...g].sort((a, b) => a - b)[g.length >> 1];
  for (let i = 0; i < g.length; i++) g[i] = Math.abs(g[i] - med);
  return g;
}
function ncc(a, b, dx, dy) { // Korrelation von a (verschoben) mit b im Überlappungsbereich
  let sa = 0, sb = 0, n = 0;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const xa = x + dx, ya = y + dy; if (xa < 0 || ya < 0 || xa >= PW || ya >= PH) continue; sa += a[ya * PW + xa]; sb += b[y * PW + x]; n++; }
  const ma = sa / n, mb = sb / n; let num = 0, da = 0, db = 0;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const xa = x + dx, ya = y + dy; if (xa < 0 || ya < 0 || xa >= PW || ya >= PH) continue;
    const va = a[ya * PW + xa] - ma, vb = b[y * PW + x] - mb; num += va * vb; da += va * va; db += vb * vb; }
  return num / Math.sqrt(da * db || 1);
}
const bestNcc = (a, b) => { let best = -1; for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) best = Math.max(best, ncc(a, b, dx, dy)); return best; };
// Merkmalsvektor einer Zelle: 24x12 Graustufen, bei dunklem Hintergrund invertiert, normiert
function feature(img, x0, y0, w, h) {
  const FW = 24, FH = 12, ix = Math.round(w * 0.1), iy = Math.round(h * 0.14), cw = w - 2 * ix, ch = h - 2 * iy;
  const v = new Float32Array(FW * FH);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    let sum = 0, n = 0;
    for (let yy = Math.floor(y * ch / FH); yy < Math.floor((y + 1) * ch / FH); yy++) for (let xx = Math.floor(x * cw / FW); xx < Math.floor((x + 1) * cw / FW); xx++) {
      const s = ((y0 + iy + yy) * img.width + (x0 + ix + xx)) * 4; sum += 0.299 * img.data[s] + 0.587 * img.data[s + 1] + 0.114 * img.data[s + 2]; n++;
    }
    v[y * FW + x] = sum / n;
  }
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  // Hintergrund = Median; Schrift = Abweichung davon (Vorzeichen egal -> Betrag), damit dunkle/helle Zellen vergleichbar
  const sorted = [...v].sort((a, b) => a - b), bg = sorted[Math.floor(sorted.length / 2)];
  for (let i = 0; i < v.length; i++) v[i] = Math.abs(v[i] - bg);
  const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}
const SCALE = Number(process.env.SCALE || 3);
const results = { D: { ok: 0, n: 0, errors: [] }, S: { ok: 0, n: 0, errors: [] }, B: { ok: 0, n: 0, errors: [] } };

// Streifen-Erkennung: Zellen einer Unterzeile ohne Gitterlinien nebeneinander, ein Tesseract-Aufruf, Wörter per Position zuordnen
async function rowOcr(r) {
  const S = SCALE, GAP = Number(process.env.GAP || 60), pad = 20;
  const cells = []; let W = pad;
  for (let d = 0; d < COLS; d++) {
    const [x0, y0, w, h] = cellRect(d, r);
    const { img, inkRatio } = cellToPng(grid, x0, y0, w, h, S);
    cells.push({ img, inkRatio, x: W }); W += img.width + GAP;
  }
  const H = Math.max(...cells.map(c => c.img.height));
  const out = new Uint8ClampedArray(W * H * 4).fill(255);
  for (const c of cells) for (let y = 0; y < c.img.height; y++) for (let x = 0; x < c.img.width; x++) {
    const sI = (y * c.img.width + x) * 4, dI = (y * W + c.x + x) * 4;
    out[dI] = c.img.data[sI]; out[dI + 1] = c.img.data[sI + 1]; out[dI + 2] = c.img.data[sI + 2];
  }
  const png = new PNG({ width: W, height: H }); png.data = Buffer.from(out);
  if (process.env.DEBUG_STRIP) fs.writeFileSync(`${outDir}/streifen-${r}.png`, PNG.sync.write(png));
  const { data } = await rowWorker.recognize(PNG.sync.write(png), {}, { blocks: true });
  const texts = Array(COLS).fill('');
  const words = (data.blocks || []).flatMap(b => b.paragraphs.flatMap(pp => pp.lines.flatMap(l => l.words)));
  for (const wd of words) {
    const cx = (wd.bbox.x0 + wd.bbox.x1) / 2;
    const idx = cells.findIndex(c => cx >= c.x - GAP / 2 && cx < c.x + c.img.width + GAP / 2);
    if (idx >= 0) texts[idx] += wd.text;
  }
  return { texts, ink: cells.map(c => c.inkRatio) };
}
const rowWorker = await createWorker('eng');
await rowWorker.setParameters({ tessedit_pageseg_mode: process.env.ROWPSM === 'sparse' ? PSM.SPARSE_TEXT : PSM.SINGLE_LINE, tessedit_char_whitelist: [...new Set([...ROSTER.zeilen.flatMap(z => [...z.codes, ...(z.sonder || [])]).join('').replace(/[–—]/g, ''), '-'])].join('') });
const rowTexts = {};
if (process.env.ROWOCR === '1') for (let p = 0; p < ROSTER.zeilen.length; p++) rowTexts[p] = await rowOcr(p * SUB);
for (let p = 0; p < ROSTER.zeilen.length; p++) {
  const person = ROSTER.zeilen[p];
  for (let d = 0; d < COLS; d++) {
    for (let [k, rowIdx, expected] of (SUB >= 3 ? [['D', 0, person.codes[d]], ['S', 1, person.sonder[d]], ['B', 2, person.bereitschaft[d]]] : [['D', 0, person.codes[d]]])) {
      const { img: cell, inkRatio, std } = cellToPng(grid, ...cellRect(d, p * SUB + rowIdx), SCALE);
      let got = '', rawText = '';
      if (process.env.PLANINK === '1' || inkRatio > 0.004) {
        const p2 = new PNG({ width: cell.width, height: cell.height }); p2.data = Buffer.from(cell.data);
        const { data } = await worker.recognize(PNG.sync.write(p2));
        rawText = data.text.replace(/\s+/g, '').toUpperCase();
        got = normalize(data.text);
      }
      const cellGot = got; let stripGot = '';
      if (k === 'D' && rowTexts[p]) {
        // Streifen-Ergebnis bevorzugen; nur wenn es nichts liefert, die Einzelzelle nehmen
        const rt = normalize(rowTexts[p].texts[d]);
        // Verschmolzene Lesung (länger als jedes bekannte Kürzel) verwerfen -> Einzelzelle zählt
        const maxLen = Math.max(...ROSTER.zeilen.flatMap(z => z.codes).map(c => c.length));
        if (rt !== '' && rt.length <= maxLen) { got = rt; stripGot = rt; }
      }
      if (k === 'B') { got = /[A-Z0-9]{2,}/.test(rawText) ? 'x' : ''; expected = expected ? 'x' : ''; } // B-Zeile: nur beschriftet ja/nein
      if (k === 'S') scells.push({ p, d, got: got === 'U' ? 'U' : got, expected, inkRatio, std, patch: patchOf(grid, ...cellRect(d, p * SUB + 1)) });
      if (k === 'D') dcells.push({ p, d, got, cellGot, stripGot, expected, inkRatio, std, feat: feature(grid, ...cellRect(d, p * SUB)), patch: patchOf(grid, ...cellRect(d, p * SUB)) });
      const r = results[k]; r.n++;
      const free = (v) => v === '' || v === '-' || v === '–' || v === '—';
      if (got === expected || (free(got) && free(expected))) r.ok++; else {
        r.errors.push(`${person.name}, Tag ${d + 1}: erwartet "${expected}", erkannt "${got}"`);
        const p2 = new PNG({ width: cell.width, height: cell.height }); p2.data = Buffer.from(cell.data);
        fs.writeFileSync(`${outDir}/fehler-${k}-${p}-${d + 1}.png`, PNG.sync.write(p2));
      }
    }
  }
}
await worker.terminate(); await rowWorker.terminate();

// ---------- Nachbearbeitung D-Zeile ----------
const KNOWN = [...new Set(ROSTER.zeilen.flatMap(z => z.codes))].filter(c => c && !['-', '–', '—'].includes(c)); // in der App: Kürzel der Vorlagen
const free = (v) => v === '' || v === '-' || v === '–' || v === '—';
function snap(t) {
  if (free(t) || KNOWN.includes(t)) return t;
  // nur eindeutige, typische Lesefehler: fehlende Nullen, doppelte letzte Ziffer
  const firstAlt = { S: 'B5', B: 'S8', '5': 'S', '8': 'B' };
  const cands = KNOWN.filter(c => c.replace(/0/g, '') === t.replace(/0/g, '')
    || (c.length === t.length && c.slice(1) === t.slice(1) && (firstAlt[c[0]] || '').includes(t[0])));
  return cands.length === 1 ? cands[0] : '?';
}
const score = (label) => dcells.filter(c => (label(c) === c.expected) || (free(label(c)) && free(c.expected))).length;
for (const c of dcells) c.snapped = snap(c.got);
// Eigene gültige Lesung bleibt; nur Lücken werden per Mehrheitsentscheid gefüllt und als unsicher markiert
const K = Number(process.env.K || 6);
// Leer oder beschriftet: Schwelle je Plan aus der Verteilung der Zellkontraste (Otsu), statt absolut
function otsu1d(values) {
  const v = [...values].sort((a, b) => a - b); let best = -1, thr = v[0];
  for (let i = 1; i < v.length; i++) { const a = v.slice(0, i), b = v.slice(i); const ma = a.reduce((x, y) => x + y, 0) / a.length, mb = b.reduce((x, y) => x + y, 0) / b.length;
    const sc = a.length * b.length * (ma - mb) ** 2; if (sc > best) { best = sc; thr = (v[i - 1] + v[i]) / 2; } }
  return thr;
}
const PLANINK = process.env.PLANINK === '1';
const stdThr = PLANINK ? otsu1d(dcells.map(c => c.std)) : 0;
const hasInk = (c) => PLANINK ? c.std > stdThr * 0.6 : c.inkRatio > 0.02; // großzügig: lieber unsicher als fälschlich leer
const surelyEmpty = (c) => PLANINK ? c.std <= stdThr * 0.4 : !hasInk(c);
const dashStd = (() => { const v = dcells.filter(c => c.got === '-').map(c => c.std).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : Infinity; })();
const inked = dcells.filter(c => hasInk(c));
for (const c of dcells) {
  c.unsure = false;
  // "-" nur sicher, wenn die Zelle nicht deutlich mehr Tinte hat als typische Strich-Zellen
  // Widerspruch Streifen <-> Einzelzelle (z. B. Streifen ordnet Text der Nachbarzelle zu) -> unsicher
  const cellSnap = snap(c.cellGot);
  const conflict = c.stripGot && cellSnap !== snap(c.stripGot) && (cellSnap === '-' || KNOWN.includes(cellSnap) || (cellSnap === '' && PLANINK && c.std <= stdThr));
  if (!conflict) {
    if (KNOWN.includes(c.snapped)) { c.voted = c.snapped; continue; }
    if ((c.snapped === '-' && (!PLANINK || c.std <= dashStd * 1.6)) || (c.snapped === '' && surelyEmpty(c))) { c.voted = '-'; continue; }
  }
  // Schrift vorhanden, aber nicht (gültig) gelesen
  c.unsure = true;
  const near = inked.filter(o => o !== c && KNOWN.includes(o.snapped)).map(o => ({ o, dist: 1 - o.feat.reduce((a, v, i) => a + v * c.feat[i], 0) }))
    .sort((a, b) => a.dist - b.dist).slice(0, K).filter(n => n.dist < 0.15);
  const votes = new Map(); for (const { o } of near) votes.set(o.snapped, (votes.get(o.snapped) || 0) + 1);
  c.voted = votes.size ? [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0] : '?';
}
if (process.env.TEMPLATES === '1') {
  // Muster je Kürzel aus sicher gelesenen Zellen (bis zu 8 Beispiele je Kürzel, Vergleich gegen jedes einzeln)
  const examples = new Map();
  for (const c of dcells) if (!c.unsure && (KNOWN.includes(c.voted) || (c.voted === '-' && c.got === '-'))) { const l = examples.get(c.voted) || []; if (l.length < 8) l.push(c.patch); examples.set(c.voted, l); }
  const MIN = Number(process.env.T_MIN || 0.75), MARGIN = Number(process.env.T_MARGIN || 0.08);
  for (const c of dcells) {
    if (!c.unsure) continue;
    const scores = [...examples.entries()].map(([code, pats]) => ({ code, score: Math.max(...pats.map(pt => bestNcc(c.patch, pt))) })).sort((a, b) => b.score - a.score);
    if (!scores.length) continue;
    const [b1, b2] = scores;
    c.tpl = `${b1.code}:${b1.score.toFixed(2)}/${b2 ? b2.code + ':' + b2.score.toFixed(2) : '-'}`;
    if (b1.score >= MIN && (!b2 || b1.score - b2.score >= MARGIN)) { c.voted = b1.code; c.unsure = false; c.byTemplate = true; }
    else c.voted = b1.code; // bleibt unsicher, aber mit Vorschlag
  }
}
const correct = (c) => c.voted === c.expected || (free(c.voted) && free(c.expected));
const IGNORE = new Set((process.env.IGNORE || '').split(',').filter(Boolean));
for (let i = dcells.length - 1; i >= 0; i--) if (IGNORE.has(dcells[i].expected)) dcells.splice(i, 1);
const sureOk = dcells.filter(c => !c.unsure && correct(c)).length;
const sureWrong = dcells.filter(c => !c.unsure && !correct(c));
const unsureOk = dcells.filter(c => c.unsure && correct(c)).length;
const unsureAll = dcells.filter(c => c.unsure).length;
console.log(`D-Zeile: sicher richtig ${sureOk}, SICHER FALSCH ${sureWrong.length}, unsicher markiert ${unsureAll} (davon Vorschlag richtig ${unsureOk}) – von ${dcells.length}`);
for (const c of sureWrong) console.log(`   sicher falsch: ${ROSTER.zeilen[c.p].name}, Tag ${c.d + 1}: erwartet ${c.expected}, roh "${c.got}", Ergebnis ${c.voted}${c.byTemplate ? ' (Muster ' + c.tpl + ')' : ''}`);
if (process.env.SHOW_UNSURE) { const by = {}; for (const c of dcells.filter(c => c.unsure)) { const k = `${c.expected} (roh "${c.got}", Vorschlag ${c.voted})`; by[k] = (by[k] || 0) + 1; } console.log(by); }
console.log(`  davon per Muster entschieden: ${dcells.filter(c => c.byTemplate).length}`);
for (const [k, r] of Object.entries(results)) {
  console.log(`${k}-Zeile (roh): ${r.ok}/${r.n} richtig (${(100 * r.ok / r.n).toFixed(1)} %)`);
  if (process.env.VERBOSE) for (const e of r.errors.slice(0, 60)) console.log('   ' + e);
}

// ---------- Nachbearbeitung S-Zeile (Abwesenheiten) ----------
if (SUB >= 3) {
  const KNOWN_S = [...new Set(ROSTER.zeilen.flatMap(z => z.sonder || []))].filter(Boolean);
  const sThr = process.env.PLANINK === '1' ? otsu1d(scells.map(c => c.std)) : 0;
  for (const c of scells) {
    c.unsure = false;
    if (KNOWN_S.includes(c.got)) { c.voted = c.got; continue; }
    if (c.got === '' && (process.env.PLANINK === '1' ? c.std <= sThr * 0.6 : c.inkRatio <= 0.02)) { c.voted = ''; continue; }
    c.unsure = true; c.voted = '';
  }
  // Muster: sicher gelesene Abwesenheiten und sicher leere Zellen
  const ex = new Map();
  for (const c of scells) if (!c.unsure) { const l = ex.get(c.voted) || []; if (l.length < 8) l.push(c.patch); ex.set(c.voted, l); }
  const MIN = Number(process.env.T_MIN || 0.75), MARGIN = Number(process.env.T_MARGIN || 0.08);
  for (const c of scells) {
    if (!c.unsure) continue;
    const sc = [...ex.entries()].map(([code, pats]) => ({ code, score: Math.max(...pats.map(pt => bestNcc(c.patch, pt))) })).sort((a, b) => b.score - a.score);
    if (!sc.length) continue;
    c.voted = sc[0].code;
    if (sc[0].score >= MIN && (!sc[1] || sc[0].score - sc[1].score >= MARGIN)) c.unsure = false;
  }
  const ok = (c) => c.voted === c.expected;
  const sureOk = scells.filter(c => !c.unsure && ok(c)).length, sureWrong = scells.filter(c => !c.unsure && !ok(c)), unsure = scells.filter(c => c.unsure);
  console.log(`S-Zeile: sicher richtig ${sureOk}, SICHER FALSCH ${sureWrong.length}, unsicher markiert ${unsure.length} (davon Vorschlag richtig ${unsure.filter(ok).length}) – von ${scells.length}`);
  for (const c of sureWrong) console.log(`   S sicher falsch: ${ROSTER.zeilen[c.p].name}, Tag ${c.d + 1}: erwartet "${c.expected}", roh "${c.got}", Ergebnis "${c.voted}"`);
}

// ---------- Ergebnis je Zelle für die Gesamtauswertung (scripts/poc-lokale-erkennung/auswertung.mjs) ----------
fs.writeFileSync(`${outDir}/ergebnis.json`, JSON.stringify({
  D: dcells.map(c => ({ person: ROSTER.zeilen[c.p].name ?? ROSTER.zeilen[c.p].kuerzel, tag: c.d + 1, erwartet: c.expected, roh: c.got, ergebnis: c.voted, unsicher: c.unsure })),
  S: scells.map(c => ({ person: ROSTER.zeilen[c.p].name, tag: c.d + 1, erwartet: c.expected, roh: c.got, ergebnis: c.voted, unsicher: c.unsure }))
}));
