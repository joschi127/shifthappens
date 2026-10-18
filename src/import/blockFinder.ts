/**
 * Eigenen Personenblock im Foto finden (ADR 0001, Nachtrag 2):
 * Name per Texterkennung, Tagesspalten per Ausgleichsgerade durch die Tageszahlen, Grenzen per Gitterlinien.
 * Das Ergebnis ist ein Vorschlag; der Nutzer bestätigt oder korrigiert die Ecken.
 */
import { Quad, insideImage, quadSlice, warpQuad } from './geometry';
import { charactersFor, isFreeCode, normalizeReading } from './codeReading';
import { OcrEngine, OcrWord } from './ocr';
import { Raster, binarize, cropScaled, luminanceAt, removeGridLines, rotate180, rotate90, rowsOf } from './raster';

export interface BlockFinderOptions {
  rosterNames: string[];
  days: number;           // Anzahl Tage im Monat
  blockRatio: number;     // Blockhöhe ÷ Spaltenbreite des Planformats (Import-Vorlage)
  subRows?: number;       // Unterzeilen je Person, die erste ist die Dienstzeile (für die Nachprüfung)
  dutyCodes?: string[];   // bekannte Dienstkürzel ohne Abwesenheiten (für die Nachprüfung)
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

/** Ausgleich x = (a·t + b) / (c·t + 1) nach kleinsten Quadraten (linearisiert: a·t + b − c·t·x = x) */
function projectiveFit(points: [number, number][]): ((t: number) => number) | null {
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], r = [0, 0, 0];
  for (const [t, x] of points) {
    const row = [t, 1, -t * x];
    for (let i = 0; i < 3; i++) { r[i] += row[i] * x; for (let j = 0; j < 3; j++) A[i][j] += row[i] * row[j]; }
  }
  const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A);
  if (Math.abs(D) < 1e-9) return null;
  const [a, b, c] = [0, 1, 2].map(k => det(A.map((row, i) => row.map((v, j) => (j === k ? r[i] : v)))) / D);
  const f = (t: number) => (a * t + b) / (c * t + 1);
  // Nur übernehmen, wenn der Nenner über den Monat positiv bleibt und die Spalten monoton wachsen
  for (let t = 1; t <= 31; t++) if (c * t + 1 <= 0.2 || f(t + 1) <= f(t)) return null;
  return f;
}

// Spalten aus den erkannten Tageszahlen: robuste Ausgleichsgerade (x und y linear in der Tagesnummer)
export function fitDayColumns(words: OcrWord[]): { colX: (day: number) => number; colY: (day: number) => number; found: number } | null {
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
  // Bei schräg fotografierten Plänen werden die Spalten zum fernen Rand hin schmaler: dann perspektivisch
  // passend (x = (a·t + b) / (c·t + 1)), sofern genug Tageszahlen über den Monat verteilt erkannt wurden
  const spread = Math.max(...best.map(p => p.day)) - Math.min(...best.map(p => p.day));
  const colX = best.length >= 6 && spread >= 10 ? projectiveFit(best.map(p => [p.day, p.x])) ?? fit('x') : fit('x');
  return { colX, colY: fit('y'), found: best.length };
}

// Unter den deutlichen Linien (mindestens halb so stark wie die stärkste) die dem erwarteten Ort nächste
const nearestStrong = (peaks: { y: number; s: number }[], expected: number): number | undefined => {
  const strongest = Math.max(0, ...peaks.map(p => p.s));
  return peaks.filter(p => p.s >= strongest * 0.5).sort((a, b) => Math.abs(a.y - expected) - Math.abs(b.y - expected))[0]?.y;
};

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
  // Örtliche Spaltenbreite an den Rändern (bei Perspektive ist der ferne Rand schmaler als der Durchschnitt)
  const cwLeft = colX(2) - colX(1), cwRight = colX(last) - colX(last - 1);
  // Senkrechte Linie über eine größere Höhe messen (einzelne Ziffern daneben stören sonst)
  const lineVTall = (x: number, y: number) => { let s = 0; for (let k = 0; k < 6; k++) s += lineV(x, y + 10 + k * 7); return s; };
  // Unter den deutlichen Linien die der erwarteten Lage (halbe Spaltenbreite neben der Tageszahl) nächste;
  // links liegt oft die schmale Spalte mit den Unterzeilen-Buchstaben, rechts die Summenspalten
  const edgeNear = (y: number, expected: number, radius: number) => {
    const profile: { y: number; s: number }[] = [];
    for (let x = Math.round(expected - radius) - 3; x <= Math.round(expected + radius) + 3; x++) profile.push({ y: x, s: lineVTall(x, y) });
    const peaksV = profile.filter((p, i) => i >= 3 && i < profile.length - 3 && profile.slice(i - 3, i + 4).every(q => q.s <= p.s));
    return nearestStrong(peaksV, expected) ?? bestIn(xx => lineVTall(xx, y), expected - radius, expected + radius);
  };
  const leftHead = edgeNear(colY(1), colX(1) - cwLeft * 0.5, cwLeft * 0.35);
  const rightHead = edgeNear(colY(last), colX(last) + cwRight * 0.5, cwRight * 0.4);
  let leftV = traceV(colY(1) + 10, leftHead), rightV = traceV(colY(last) + 10, rightHead);

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
  // Oberkante: bei Unterzeilen die stärkste Linie über dem Namen (Trennlinie zwischen Personen; nur Vorname
  // erkannt korrigiert refineBlock), bei einer Zeile je Person die nächstgelegene deutliche Linie (die stärkste
  // läge dort oft eine Zeile zu hoch)
  // (bis zu einem guten Drittel der Namenshöhe, die Schrift berührt die Linie manchmal fast). „Deutlich“ heißt
  // mindestens 60 % der stärksten Linie, sonst zählen waagerechte Buchstabenstriche der Dienstzeile mit.
  const above = peaks.filter(p => p.y <= name.y0 + Math.max(4, (name.y1 - name.y0) * 0.35) && p.y >= name.y0 - cw);
  const strongest = Math.max(0, ...above.map(p => p.s));
  const topCandidate = ((options.subRows ?? 1) > 1
    ? [...above].sort((a, b) => b.s - a.s)[0]
    : above.filter(p => p.s >= strongest * 0.6).sort((a, b) => b.y - a.y)[0]) ?? peaks[0];
  if (!topCandidate) return null;
  const top = topCandidate.y;

  // Spaltenzahl prüfen (unterhalb der Oberkante, wo kaum Schrift die Linien stört): zwischen den Rändern
  // müssen Tage + 1 senkrechte Linien liegen. Ist es eine mehr, sitzt ein Rand eine Spalte zu weit außen
  // (Summen- oder Buchstabenspalte); dann wird die Randspalte verworfen, die am wenigsten wie eine Tagesspalte aussieht.
  {
    const x0 = leftV(top), x1 = rightV(top);
    const yAt = (x: number) => top + slope * (x - x0) / cw;
    const profile: { y: number; s: number }[] = [];
    for (let x = Math.round(x0) - 3; x <= Math.round(x1) + 3; x++) profile.push({ y: x, s: lineVTall(x, yAt(x)) });
    const r = Math.max(3, Math.round(cw * 0.3));
    const maxima = profile.filter((p, i) => profile.slice(Math.max(0, i - r), i + r + 1).every(q => q.s <= p.s));
    const top12 = maxima.map(p => p.s).sort((a, b) => b - a).slice(0, last + 1);
    const level = top12.length ? top12[top12.length >> 1] * 0.4 : Infinity;
    const lines = maxima.filter(p => p.s >= level).map(p => p.y);
    if (lines.length === last + 2) {
      const firstWidth = lines[1] - lines[0], lastWidth = lines[lines.length - 1] - lines[lines.length - 2];
      const innerFirst = lines[2] - lines[1], innerLast = lines[lines.length - 2] - lines[lines.length - 3];
      if (Math.abs(lastWidth / innerLast - 1) >= Math.abs(firstWidth / innerFirst - 1)) rightV = traceV(top, lines[lines.length - 2]);
      else leftV = traceV(top, lines[1]);
    }
  }
  const expectedBottom = top + options.blockRatio * cw;
  const bottom = nearestStrong(peaks.filter(p => Math.abs(p.y - expectedBottom) <= cw * 0.3), expectedBottom) ?? Math.round(expectedBottom);
  const topH = traceH(leftV(top), rightV(top), top);

  // Unterkante rechts nahe "rechte Oberkante + Blockhöhe" suchen (Median über die letzten 10 Spalten)
  const xr = rightV(topH(rightV(top)));
  const strengthRight = (y: number) => { const v: number[] = []; for (let k = 0; k < 10; k++) v.push(lineH(xr - cw * (k + 0.5), y - slope * k)); return v.sort((a, b) => a - b)[5]; };
  // Perspektive: am schmaleren Rand ist der Block im selben Verhältnis niedriger
  const expectedBR = topH(xr) + (bottom - top) * Math.min(1.3, Math.max(0.7, cwRight / cwLeft));
  const rightProfile: { y: number; s: number }[] = [];
  for (let y = Math.round(expectedBR - cw * 0.3) - 4; y <= Math.round(expectedBR + cw * 0.3) + 4; y++) rightProfile.push({ y, s: strengthRight(y) });
  const rightPeaks = rightProfile.filter((p, i) => i >= 4 && i < rightProfile.length - 4 && rightProfile.slice(i - 4, i + 5).every(q => q.s <= p.s));
  const bottomRight = nearestStrong(rightPeaks, expectedBR) ?? bestIn(strengthRight, expectedBR - cw * 0.3, expectedBR + cw * 0.3);
  const yLeftTop = topH(leftV(top));
  return {
    corners: [[leftV(yLeftTop), yLeftTop], [xr, topH(xr)], [rightV(bottomRight), bottomRight], [leftV(bottom), bottom]],
    partialName: name.partial
  };
}

/**
 * Block mit Texterkennung suchen. Findet die Erkennung auf dem ganzen Bild den Namen nicht (kleine Schrift
 * direkt neben Gitterlinien, z. B. im Dokumentenmodus), wird die Namensspalte links der Tagesspalten
 * Feld für Feld ein zweites Mal gelesen (readNameColumn).
 */
export async function locateBlock(img: Raster, engine: OcrEngine, options: BlockFinderOptions): Promise<BlockMatch | null> {
  const { words } = await engine.recognize(img, { mode: 'sparse' });
  const match = findBlock(img, words, options) ?? await findBlockInNameColumn(img, words, engine, options);
  return match && { ...match, corners: await refineBlock(img, match.corners, engine, options) };
}

// Zweiter Durchgang: Namensspalte Feld für Feld lesen (siehe readNameColumn)
async function findBlockInNameColumn(img: Raster, words: OcrWord[], engine: OcrEngine, options: BlockFinderOptions): Promise<BlockMatch | null> {
  const cols = fitDayColumns(words);
  if (!cols) return null;
  const cw = (cols.colX(options.days) - cols.colX(1)) / (options.days - 1);
  // Namensspalte ohne die schmale Spalte mit den Unterzeilen-Buchstaben (D/S/B/A/E)
  const right = Math.round(Math.min(cols.colX(1), cols.colX(options.days)) - cw);
  const top = Math.max(0, Math.round(Math.min(cols.colY(1), cols.colY(options.days))));
  if (right < 20 || top >= img.height - 20) return null;
  const nameWords = await readNameColumn(img, engine, right, top, cw);
  return findBlock(img, [...words, ...nameWords], options);
}

/**
 * Namensspalte (links von x = right, ab y = top) Feld für Feld lesen: dreifach vergrößert, Schwarz-Weiß,
 * an den waagerechten Trennlinien in Felder zerlegt und ohne Gitterlinien. Kleine, saubere Ausschnitte
 * liest die Texterkennung deutlich besser als die ganze Spalte mit allen Linien.
 */
async function readNameColumn(img: Raster, engine: OcrEngine, right: number, top: number, cw: number): Promise<OcrWord[]> {
  const scale = 3;
  const column = binarize(cropScaled(img, 0, top, right, img.height - top, scale));
  const dark = (x: number, y: number) => column.data[(y * column.width + x) * 4] === 0;
  // Trennlinien: Zeilen, die in der rechten Spaltenhälfte überwiegend dunkel sind (links liegt oft Papierrand)
  const separators: number[] = [];
  for (let y = 0; y < column.height; y++) {
    let count = 0;
    for (let x = Math.floor(column.width * 0.4); x < column.width; x++) if (dark(x, y)) count++;
    if (count > column.width * 0.6 * 0.5 && (!separators.length || y - separators[separators.length - 1] > 6)) separators.push(y);
  }
  const words: OcrWord[] = [];
  for (let i = 0; i + 1 < separators.length; i++) {
    const y0 = separators[i] + 4, y1 = separators[i + 1] - 2;
    if (y1 - y0 < 8 * scale) continue;
    const field = removeGridLines(rowsOf(column, y0, y1), Math.max(24, Math.round(cw * scale * 0.8)));
    for (const w of (await engine.recognize(field, { mode: 'sparse' })).words) {
      words.push({ text: w.text, x0: w.x0 / scale, x1: w.x1 / scale, y0: (w.y0 + y0) / scale + top, y1: (w.y1 + y0) / scale + top });
    }
  }
  return words;
}

/** Anzahl bekannter Kürzel in einem Zeilenstreifen (auch zusammengeklebt gelesene wie "F01F01") */
async function codesInRow(img: Raster, row: Quad, days: number, engine: OcrEngine, codes: string[]): Promise<number> {
  const strip = warpQuad(img, row, days * 48, 40);
  // Dunkel hinterlegte Tage (helle Schrift auf farbigem Grund) umkehren, damit die Schrift dunkel auf hell steht
  for (let d = 0; d < days; d++) {
    let sum = 0;
    for (let y = 0; y < 40; y++) for (let x = d * 48; x < (d + 1) * 48; x++) sum += luminanceAt(strip, x, y);
    if (sum / (48 * 40) >= 110) continue;
    for (let y = 0; y < 40; y++) for (let x = d * 48; x < (d + 1) * 48; x++) {
      const o = (y * strip.width + x) * 4;
      for (let c = 0; c < 3; c++) strip.data[o + c] = 255 - strip.data[o + c];
    }
  }
  const text = (await engine.recognize(strip, { mode: 'sparse', characters: charactersFor(codes) })).words.map(w => normalizeReading(w.text)).join(' ');
  const pattern = new RegExp([...codes].sort((a, b) => b.length - a.length).map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  return (text.match(pattern) ?? []).length;
}

/**
 * Inhaltliche Nachprüfung des gefundenen Blocks (nur bei mehreren Unterzeilen und bekannten Dienstkürzeln):
 * - Lage: Die Dienstzeile muss Kürzel enthalten. Eine Unterzeile höher oder tiefer wird probiert und genommen,
 *   wenn dort mehr bekannte Kürzel stehen (z. B. nur der Vorname in der zweiten Namenszeile erkannt).
 * - Höhe: Die Dienstzeile des Blocks darunter muss ebenfalls Kürzel enthalten. Probiert wird die Höhe aus dem
 *   Seitenverhältnis ±25 % (der Standardwert passt nicht zu jedem Plan, gelernt wird er erst beim Import).
 * Abwesenheitskürzel zählen nicht mit, damit die Urlaubszeile nicht für die Dienstzeile gehalten wird.
 */
export async function refineBlock(img: Raster, corners: Quad, engine: OcrEngine, options: BlockFinderOptions): Promise<Quad> {
  const subRows = options.subRows ?? 1;
  // Einbuchstabige Kürzel (z. B. „S“) kommen auch in anderem Text vor („So“, „Sa“) und zählen daher nicht
  const codes = (options.dutyCodes ?? []).filter(c => !isFreeCode(c) && c.length >= 2);
  if (subRows < 2 || !codes.length) return corners;
  const count = (row: Quad) => insideImage(img, row) ? codesInRow(img, row, options.days, engine, codes) : Promise.resolve(-1);
  const dutyRowOf = (block: Quad) => quadSlice(block, 0, 1 / subRows);

  // Geändert wird nur bei deutlichem Befund: genug Kürzel (Fußzeilen oder Kopfzeilen liefern sonst Zufallstreffer)
  const evidence = Math.max(3, Math.round(options.days * 0.15));
  let block = corners, best = await count(dutyRowOf(corners));
  for (const k of [-1, 1]) {
    const shifted = quadSlice(corners, k / subRows, 1 + k / subRows);
    const n = await count(dutyRowOf(shifted));
    if (n >= evidence && n > best + 1) { block = shifted; best = n; }
  }
  if (best < evidence) return block;

  let height = 1, bestBelow = await count(quadSlice(block, 1, 1 + 1 / subRows));
  // Höhe in Schritten von 5 % zwischen −25 % und +25 % (die übliche Höhe zuerst, sie gewinnt bei Gleichstand)
  for (const h of [0.95, 1.05, 0.9, 1.1, 0.85, 1.15, 0.8, 1.2, 0.75, 1.25]) {
    const n = await count(quadSlice(block, h, h + h / subRows));
    if (n >= evidence && n > bestBelow + 1) { height = h; bestBelow = n; }
  }
  return height === 1 ? block : quadSlice(block, 0, height);
}

/**
 * Eigenen Block suchen, bei Bedarf im gedrehten Bild: wie fotografiert, um 90° in beide Richtungen (Querformat-Pläne
 * werden oft im Hochformat fotografiert) und auf dem Kopf. Zuerst schnell in allen Drehungen, den langsameren
 * zweiten Durchgang (Namensspalte Feld für Feld) nur in den Drehungen, in denen die meisten Tageszahlen lesbar sind.
 * Liefert das (ggf. gedrehte) Bild mit dem Treffer.
 */
export async function locateOwnBlock(img: Raster, engine: OcrEngine, options: BlockFinderOptions,
                                     onRotate?: () => void): Promise<{ image: Raster; match: BlockMatch } | null> {
  const candidates: (() => Raster)[] = [() => img, () => rotate90(img, 'cw'), () => rotate90(img, 'ccw'), () => rotate180(img)];
  const refined = async (image: Raster, match: BlockMatch) =>
    ({ image, match: { ...match, corners: await refineBlock(image, match.corners, engine, options) } });
  const tried: { image: Raster; words: OcrWord[]; days: number }[] = [];
  for (const [index, candidate] of candidates.entries()) {
    if (index > 0) onRotate?.();
    const image = candidate();
    const { words } = await engine.recognize(image, { mode: 'sparse' });
    const match = findBlock(image, words, options);
    if (match) return refined(image, match);
    tried.push({ image, words, days: fitDayColumns(words)?.found ?? 0 });
  }
  for (const { image, words } of tried.filter(t => t.days >= 3).sort((a, b) => b.days - a.days).slice(0, 2)) {
    const match = await findBlockInNameColumn(image, words, engine, options);
    if (match) return refined(image, match);
  }
  return null;
}
