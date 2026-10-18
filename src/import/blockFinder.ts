/**
 * Eigenen Personenblock im Foto finden (ADR 0001, Nachtrag 2):
 * Name per Texterkennung, Tagesspalten per Ausgleichsgerade durch die Tageszahlen, Grenzen per Gitterlinien.
 * Das Ergebnis ist ein Vorschlag; der Nutzer bestätigt oder korrigiert die Ecken.
 */
import { Quad } from './geometry';
import { OcrWord } from './ocr';
import { Raster, luminanceAt } from './raster';

export interface BlockFinderOptions {
  rosterNames: string[];
  days: number;           // Anzahl Tage im Monat
  blockRatio: number;     // Blockhöhe ÷ Spaltenbreite des Planformats (Import-Vorlage)
}

export interface BlockMatch {
  corners: Quad;
  partialName: boolean;   // nur ein Namensteil gefunden
}

const clean = (t: string) => t.toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
const tolerance = (n: number) => n <= 3 ? 0 : n <= 6 ? 1 : 2;

export function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

interface Box { x0: number; y0: number; x1: number; y1: number }

export function findName(words: OcrWord[], rosterNames: string[]): (Box & { partial: boolean }) | null {
  const matches = (w: OcrWord, tok: string) => levenshtein(clean(w.text), tok) <= tolerance(tok.length);
  for (const rosterName of rosterNames) {
    const tokens = rosterName.split(/[\s,]+/).map(clean).filter(Boolean);
    if (!tokens.length) continue;
    for (const first of words.filter(w => matches(w, tokens[0]))) {
      const group = [first];
      for (const tok of tokens.slice(1)) {
        const near = words.find(o => matches(o, tok) && Math.abs(o.x0 - first.x0) < 150 && Math.abs(o.y0 - first.y0) < 60);
        if (near) group.push(near);
      }
      if (group.length === tokens.length) {
        return { x0: Math.min(...group.map(g => g.x0)), y0: Math.min(...group.map(g => g.y0)),
          x1: Math.max(...group.map(g => g.x1)), y1: Math.max(...group.map(g => g.y1)), partial: false };
      }
    }
  }
  // Rückfall: ein langer Namensteil (>= 5 Zeichen), der im ganzen Bild genau einmal vorkommt
  for (const rosterName of rosterNames) {
    for (const tok of rosterName.split(/[\s,]+/).map(clean).filter(t => t.length >= 5)) {
      const hits = words.filter(w => matches(w, tok));
      if (hits.length === 1) return { ...hits[0], partial: true };
    }
  }
  return null;
}

// Spalten aus den erkannten Tageszahlen: robuste Ausgleichsgerade (x und y linear in der Tagesnummer)
export function fitDayColumns(words: OcrWord[]): { colX: (day: number) => number; colY: (day: number) => number } | null {
  const days = words.filter(w => /^(0?[1-9]|[12][0-9]|3[01])$/.test(w.text))
    .map(w => ({ day: Number(w.text), x: (w.x0 + w.x1) / 2, y: (w.y0 + w.y1) / 2 }));
  let best: typeof days = [];
  for (const a of days) for (const b of days) {
    if (b.day <= a.day) continue;
    const sx = (b.x - a.x) / (b.day - a.day), sy = (b.y - a.y) / (b.day - a.day);
    if (sx < 10) continue;
    const inliers = days.filter(d => Math.abs(a.x + sx * (d.day - a.day) - d.x) < sx * 0.25 && Math.abs(a.y + sy * (d.day - a.day) - d.y) < 12);
    if (inliers.length > best.length) best = inliers;
  }
  if (best.length < 2) return null;
  const fit = (key: 'x' | 'y') => {
    const n = best.length, mt = best.reduce((s, p) => s + p.day, 0) / n, mv = best.reduce((s, p) => s + p[key], 0) / n;
    const k = best.reduce((s, p) => s + (p.day - mt) * (p[key] - mv), 0) / best.reduce((s, p) => s + (p.day - mt) ** 2, 0);
    return (t: number) => mv + k * (t - mt);
  };
  return { colX: fit('x'), colY: fit('y') };
}

export function findBlock(img: Raster, words: OcrWord[], options: BlockFinderOptions): BlockMatch | null {
  const name = findName(words, options.rosterNames);
  const cols = fitDayColumns(words);
  if (!name || !cols) return null;
  const { colX, colY } = cols;
  const last = options.days;
  const cw = (colX(last) - colX(1)) / (last - 1);
  const G = (x: number, y: number) => luminanceAt(img, Math.min(img.width - 1, Math.max(0, Math.round(x))), Math.min(img.height - 1, Math.max(0, Math.round(y))));
  const lineH = (x: number, y: number) => { let s = 0; for (let dx = -3; dx <= 3; dx++) s += (G(x + dx, y - 3) + G(x + dx, y + 3)) / 2 - G(x + dx, y); return s; };
  const lineV = (x: number, y: number) => { let s = 0; for (let dy = -3; dy <= 3; dy++) s += (G(x - 3, y + dy) + G(x + 3, y + dy)) / 2 - G(x, y + dy); return s; };
  const bestIn = (fn: (p: number) => number, from: number, to: number) => {
    let bv = -Infinity, bp = from; for (let p = Math.round(from); p <= Math.round(to); p++) { const v = fn(p); if (v > bv) { bv = v; bp = p; } } return bp;
  };
  const traceV = (y0: number, x: number) => {
    const pts: [number, number][] = []; let cx = x;
    for (let y = Math.round(y0); y <= img.height - 5; y += 8) { cx = bestIn(xx => lineV(xx, y), cx - 3, cx + 3); pts.push([y, cx]); }
    return (y: number) => pts.reduce((a, p) => Math.abs(p[0] - y) < Math.abs(a[0] - y) ? p : a, pts[0])[1];
  };
  const traceH = (x0: number, x1: number, y: number) => {
    const pts: [number, number][] = []; let cy = y;
    for (let x = Math.round(x0); x <= x1; x += 8) { cy = bestIn(yy => lineH(x, yy), cy - 3, cy + 3); pts.push([x, cy]); }
    return (x: number) => pts.reduce((a, p) => Math.abs(p[0] - x) < Math.abs(a[0] - x) ? p : a, pts[0])[1];
  };

  // Senkrechte Ränder: linker Rand von Tag 1, rechter Rand des letzten Tages, ab der Kopfzeile nach unten verfolgt
  const leftHead = bestIn(xx => lineV(xx, colY(1) + 10), colX(1) - cw * 0.75, colX(1) - cw * 0.25);
  const rightHead = bestIn(xx => lineV(xx, colY(last) + 10), colX(last) + cw * 0.25, colX(last) + cw * 0.75);
  const leftV = traceV(colY(1) + 10, leftHead), rightV = traceV(colY(last) + 10, rightHead);

  // Waagerechte Gitterlinien: Median über 20 Spalten (Buchstaben treffen nur einzelne Spalten), Schräglage aus der Kopfzeile
  const slope = (colY(last) - colY(1)) / (last - 1);
  const strength = (y: number) => {
    const v: number[] = []; for (let k = 0; k < 20; k++) v.push(lineH(leftV(y) + cw * (k + 0.5), y + slope * k));
    return v.sort((a, b) => a - b)[10];
  };
  const profile: { y: number; s: number }[] = [];
  for (let y = Math.round(name.y0 - 40); y <= Math.round(name.y1 + 200); y++) profile.push({ y, s: strength(y) });
  const maxS = Math.max(...profile.map(p => p.s));
  const peaks = profile.filter((p, i) => p.s > maxS * 0.08 && profile.slice(Math.max(0, i - 4), i + 5).every(q => q.s <= p.s));
  const topCandidate = peaks.filter(p => p.y <= name.y0 + 4 && p.y >= name.y0 - cw).sort((a, b) => b.s - a.s)[0] ?? peaks[0];
  if (!topCandidate) return null;
  const top = topCandidate.y;
  const expectedBottom = top + options.blockRatio * cw;
  const bottom = peaks.filter(p => Math.abs(p.y - expectedBottom) <= cw * 0.3).sort((a, b) => b.s - a.s)[0]?.y ?? Math.round(expectedBottom);
  const topH = traceH(leftV(top), rightV(top), top);

  // Unterkante rechts nahe "rechte Oberkante + Blockhöhe" suchen (Median über die letzten 10 Spalten)
  const xr = rightV(topH(rightV(top)));
  const strengthRight = (y: number) => { const v: number[] = []; for (let k = 0; k < 10; k++) v.push(lineH(xr - cw * (k + 0.5), y - slope * k)); return v.sort((a, b) => a - b)[5]; };
  const expectedBR = topH(xr) + (bottom - top);
  const bottomRight = bestIn(strengthRight, expectedBR - cw * 0.3, expectedBR + cw * 0.3);
  const yLeftTop = topH(leftV(top));
  return {
    corners: [[leftV(yLeftTop), yLeftTop], [xr, topH(xr)], [rightV(bottomRight), bottomRight], [leftV(bottom), bottom]],
    partialName: name.partial
  };
}
