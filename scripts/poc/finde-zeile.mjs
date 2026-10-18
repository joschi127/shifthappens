// PoC: eigenen Personenblock automatisch finden (Name per OCR, Spalten per Tageszahlen, Grenzen per Gitterlinien)
// Aufruf: node finde-zeile.mjs <bild> <profil.json> [rotate90] [unterzeilen=5]
// Ausgabe: JSON mit vier Ecken (oben links, oben rechts, unten rechts, unten links) des Tagesbereichs des Blocks
import fs from 'node:fs';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { createWorker, PSM } from 'tesseract.js';

const [, , imgPath, profilePath, rotate, subRowsArg] = process.argv;
const SUBROWS = Number(subRowsArg || 5);
const log = (...a) => { if (process.env.QUIET !== '1') console.error(...a); };

let img = (() => { const b = fs.readFileSync(imgPath); return imgPath.endsWith('.png') ? PNG.sync.read(b) : jpeg.decode(b, { useTArray: true }); })();
if (rotate === 'rotate90') { const { width: w, height: h, data } = img; const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = (y * w + x) * 4, d = (x * h + (h - 1 - y)) * 4; out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = 255; }
  img = { width: h, height: w, data: out }; }
const W = img.width, H = img.height;
const gray = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) gray[i] = 0.299 * img.data[i * 4] + 0.587 * img.data[i * 4 + 1] + 0.114 * img.data[i * 4 + 2];
const G = (x, y) => gray[Math.min(H - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x)))];

// 1. Texterkennung über das ganze Bild
const png = new PNG({ width: W, height: H }); png.data = Buffer.from(img.data);
const worker = await createWorker('eng');
await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
const { data } = await worker.recognize(PNG.sync.write(png), {}, { blocks: true });
await worker.terminate();
const words = data.blocks.flatMap(b => b.paragraphs.flatMap(p => p.lines.flatMap(l => l.words))).map(w => ({ t: w.text, b: w.bbox }));

// 2. Name finden (unscharf, Toleranz nach Länge)
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
const tol = (n) => n <= 3 ? 0 : n <= 6 ? 1 : 2;
const clean = (t) => t.toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
let name = null;
for (const rosterName of profile.rosterNames) {
  const tokens = rosterName.split(/[\s,]+/).map(clean).filter(Boolean);
  const hits = tokens.map(tok => words.filter(w => lev(clean(w.t), tok) <= tol(tok.length)));
  // Alle Namensteile müssen nah beieinander liegen (gleiche Zelle, max. 2 Textzeilen)
  for (const first of hits[0] || []) {
    const group = [first];
    for (const others of hits.slice(1)) { const near = others.find(o => Math.abs(o.b.x0 - first.b.x0) < 150 && Math.abs(o.b.y0 - first.b.y0) < 60); if (near) group.push(near); }
    if (group.length === tokens.length) { name = { x0: Math.min(...group.map(g => g.b.x0)), y0: Math.min(...group.map(g => g.b.y0)), x1: Math.max(...group.map(g => g.b.x1)), y1: Math.max(...group.map(g => g.b.y1)) }; break; }
  }
  if (name) break;
}
// Rückfall: ein einzelner langer Namensteil (>= 5 Zeichen), der im ganzen Bild genau einmal vorkommt
if (!name) for (const rosterName of profile.rosterNames) {
  for (const tok of rosterName.split(/[\s,]+/).map(clean).filter(t => t.length >= 5)) {
    const h = words.filter(w => lev(clean(w.t), tok) <= tol(tok.length));
    if (h.length === 1) { name = { ...h[0].b, partial: true }; break; }
  }
  if (name) break;
}
if (!name) { console.log(JSON.stringify({ error: 'Name nicht gefunden' })); process.exit(1); }
log('Name gefunden bei', name);

// 3. Spalten aus Tageszahlen (RANSAC: x und y linear in der Tagesnummer)
const days = words.filter(w => /^(0?[1-9]|[12][0-9]|3[01])$/.test(w.t)).map(w => ({ tag: Number(w.t), x: (w.b.x0 + w.b.x1) / 2, y: (w.b.y0 + w.b.y1) / 2 }));
let best = null;
for (const a of days) for (const b of days) {
  if (b.tag <= a.tag) continue;
  const sx = (b.x - a.x) / (b.tag - a.tag), sy = (b.y - a.y) / (b.tag - a.tag);
  if (sx < 10) continue;
  const inl = days.filter(d => Math.abs(a.x + sx * (d.tag - a.tag) - d.x) < sx * 0.25 && Math.abs(a.y + sy * (d.tag - a.tag) - d.y) < 12);
  if (!best || inl.length > best.inl.length) best = { inl };
}
const fit = (pts, key) => { const n = pts.length, mt = pts.reduce((s, p) => s + p.tag, 0) / n, mv = pts.reduce((s, p) => s + p[key], 0) / n;
  const k = pts.reduce((s, p) => s + (p.tag - mt) * (p[key] - mv), 0) / pts.reduce((s, p) => s + (p.tag - mt) ** 2, 0); return (t) => mv + k * (t - mt); };
const colX = fit(best.inl, 'x'), colY = fit(best.inl, 'y');
const LAST = Number(process.env.TAGE || 30);
const cw = (colX(LAST) - colX(1)) / (LAST - 1);
log(`Tageszahlen: ${best.inl.length} passende, Spaltenbreite ${cw.toFixed(1)} px`);

// Hilfen: dünne dunkle Linie in der Nähe suchen (Hochpass gegen Schattierungen)
const lineScoreH = (x, y) => { let s = 0; for (let dx = -3; dx <= 3; dx++) s += (G(x + dx, y - 3) + G(x + dx, y + 3)) / 2 - G(x + dx, y); return s; };
const lineScoreV = (x, y) => { let s = 0; for (let dy = -3; dy <= 3; dy++) s += (G(x - 3, y + dy) + G(x + 3, y + dy)) / 2 - G(x, y + dy); return s; };
const bestNear = (scoreFn, fixed, from, to) => { let bv = -Infinity, bp = from; for (let p = from; p <= to; p++) { const v = scoreFn(p); if (v > bv) { bv = v; bp = p; } } return bp; };
// Linie verfolgen: horizontal von x0 bis x1, Start bei y
function traceH(x0, x1, y) { const pts = []; let cy = y; const step = Math.sign(x1 - x0) * 8;
  for (let x = x0; step > 0 ? x <= x1 : x >= x1; x += step) { cy = bestNear(yy => lineScoreH(x, yy), x, Math.round(cy) - 3, Math.round(cy) + 3); pts.push([x, cy]); }
  return (x) => { let a = pts[0]; for (const p of pts) if (Math.abs(p[0] - x) < Math.abs(a[0] - x)) a = p; return a[1]; }; }
function traceV(y0, y1, x) { const pts = []; let cx = x;
  for (let y = y0; y <= y1; y += 8) { cx = bestNear(xx => lineScoreV(xx, y), y, Math.round(cx) - 3, Math.round(cx) + 3); pts.push([y, cx]); }
  return (y) => { let a = pts[0]; for (const p of pts) if (Math.abs(p[0] - y) < Math.abs(a[0] - y)) a = p; return a[1]; }; }

// 4. Senkrechte Ränder: linker Rand von Tag 1 und rechter Rand des letzten Tages, ab Kopfzeile nach unten verfolgen
const leftHead = bestNear(xx => lineScoreV(xx, colY(1) + 10), 0, Math.round(colX(1) - cw * 0.75), Math.round(colX(1) - cw * 0.25));
const rightHead = bestNear(xx => lineScoreV(xx, colY(LAST) + 10), 0, Math.round(colX(LAST) + cw * 0.25), Math.round(colX(LAST) + cw * 0.75));
const leftV = traceV(Math.round(colY(1) + 10), H - 5, leftHead), rightV = traceV(Math.round(colY(LAST) + 10), H - 5, rightHead);

// 5. Ober- und Unterkante des Blocks: echte Gitterlinien laufen durch alle Spalten -> Median über viele Spalten,
//    Schräglage aus der Kopfzeile (Änderung von y pro Spalte)
const slope = (colY(LAST) - colY(1)) / (LAST - 1);
const lineStrength = (y) => {
  const v = []; for (let k = 0; k < 20; k++) { const x = leftV(y) + cw * (k + 0.5); v.push(lineScoreH(x, y + slope * k)); }
  v.sort((a, b) => a - b); return v[10];
};
const prof = [];
for (let y = Math.round(name.y0 - 40); y <= Math.round(name.y1 + 200); y++) prof.push({ y, s: lineStrength(y) });
const maxS = Math.max(...prof.map(p => p.s));
const peaksAll = prof.filter((p, i) => p.s > maxS * 0.08 && prof.slice(Math.max(0, i - 4), i + 5).every(q => q.s <= p.s));
log('Linien (y:Stärke):', peaksAll.map(p => `${p.y}:${Math.round(p.s)}`).join(' '));
const lines = peaksAll.map(p => p.y);
// Oberkante: stärkste Linie knapp über dem Namen
const candTop = peaksAll.filter(p => p.y <= name.y0 + 4 && p.y >= name.y0 - cw);
const top = (candTop.sort((a, b) => b.s - a.s)[0] ?? peaksAll[0]).y;
// Unterkante: Blockhöhe/Spaltenbreite ist je Planformat fest (aus der Import-Vorlage, beim ersten Import gelernt)
const RATIO = Number(process.env.BLOCK_RATIO || 3.15);
const expBottom = top + RATIO * cw;
const candBot = peaksAll.filter(p => Math.abs(p.y - expBottom) <= cw * 0.3).sort((a, b) => b.s - a.s);
const bottom = candBot.length ? candBot[0].y : Math.round(expBottom);
log(`Gitterlinien um den Namen: ${lines.join(', ')}; Block oben ${top}, unten ${bottom}`);
const topH = traceH(Math.round(leftV(top)), Math.round(rightV(top)), top);
// Unterkante rechts: nahe "rechte Oberkante + Blockhöhe" suchen, Median über die letzten 10 Spalten
const xr = rightV(topH(rightV(top)));
const strengthRight = (y) => { const v = []; for (let k = 0; k < 10; k++) { const x = xr - cw * (k + 0.5); v.push(lineScoreH(x, y - slope * k)); } v.sort((a, b) => a - b); return v[5]; };
const expBR = topH(xr) + (bottom - top);
let byr = Math.round(expBR), bvr = -Infinity;
for (let y = Math.round(expBR - cw * 0.3); y <= Math.round(expBR + cw * 0.3); y++) { const v = strengthRight(y); if (v > bvr) { bvr = v; byr = y; } }
const yLeftTop = topH(leftV(top)), yRightTop = topH(xr);
const corners = [
  [leftV(yLeftTop), yLeftTop], [xr, yRightTop],
  [rightV(byr), byr], [leftV(bottom), bottom]
].map(p => p.map(v => Math.round(v * 10) / 10));
console.log(JSON.stringify(corners));
