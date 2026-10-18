/**
 * Erkennung der Zellen eines entzerrten Rasters (Verfahren aus scripts/poc-local-recognition, ADR 0001).
 * Grundsatz: lieber unsicher als falsch. Unsichere Zellen bekommen, wenn möglich, einen Vorschlag.
 */
import { Grid, cellRect } from './geometry';
import { CellImage, Patch, composeStrip, otsu1d, patchOf, prepareCell, similarity } from './cellImage';
import { OcrEngine } from './ocr';
import { charactersFor, isFreeCode, normalizeReading, snapToKnown } from './codeReading';

export interface GridLayout {
  persons: number;                 // Personenblöcke im Raster
  subRows: number;                 // Unterzeilen je Person (1 = nur Dienst)
  dutyRow: number;                 // Index der Dienstzeile im Block
  absenceRow?: number;             // Index der Abwesenheitszeile (z. B. "S")
  standbyRow?: number;             // Index der Bereitschaftszeile (z. B. "B")
}

export interface Vocabulary {
  duty: string[];      // bekannte Kürzel der Dienstzeile (ohne "frei")
  absence: string[];   // bekannte Kürzel der Abwesenheitszeile
}

export interface CellResult {
  value: string;        // erkanntes Kürzel, '' = frei/leer
  uncertain: boolean;   // muss bestätigt werden
  suggestion?: string;  // Vorschlag bei unsicheren Zellen
  raw: string;          // Lesung der Texterkennung (bereinigt)
}

export interface PersonResult {
  duty: CellResult[];
  absence?: CellResult[];
  standby?: { labelled: boolean; raw: string }[];
}

export interface RecognitionOptions {
  templateMin?: number;     // Mindestähnlichkeit, um per Muster zu entscheiden
  templateMargin?: number;  // Mindestabstand zum zweitbesten Muster
  /**
   * Personenblöcke, die nur als zusätzliche Beispiele dienen (z. B. Nachbarzeilen des eigenen Blocks).
   * Sie fließen nur in Schwellen und Muster ein, wenn sie wie eine Planzeile aussehen
   * (genug sicher gelesene bekannte Kürzel); sonst (z. B. Kopfzeile, Legende) werden sie ignoriert
   * und alle ihre Zellen sind unsicher.
   */
  auxiliaryPersons?: number[];
  onProgress?: (done: number, total: number) => void;
}

interface WorkCell {
  person: number; day: number;
  got: string; cellGot: string; stripGot: string; altGot: string | null;
  contrast: number; patch: Patch; snapped: string;
  value: string; uncertain: boolean; suggestion?: string; lowInk?: boolean;
}

export async function recognizeGrid(grid: Grid, layout: GridLayout, vocabulary: Vocabulary, engine: OcrEngine,
                                    options: RecognitionOptions = {}): Promise<PersonResult[]> {
  const { templateMin = 0.85, templateMargin = 0.10, onProgress } = options;
  const known = vocabulary.duty.filter(c => !isFreeCode(c));
  const characters = charactersFor([...known, ...vocabulary.absence]);
  const maxLen = Math.max(1, ...known.map(c => c.length));
  const rowIndex = (person: number, sub: number) => person * layout.subRows + sub;
  const total = layout.persons * grid.cols * (1 + (layout.absenceRow !== undefined ? 1 : 0) + (layout.standbyRow !== undefined ? 1 : 0));
  let done = 0;
  const tick = () => onProgress?.(++done, total);

  const readCell = async (cell: CellImage) => normalizeReading((await engine.recognize(cell.image, { mode: 'line', characters })).text);

  const dutyCells: WorkCell[] = [], absenceCells: WorkCell[] = [];
  const results: PersonResult[] = [];

  for (let p = 0; p < layout.persons; p++) {
    const result: PersonResult = { duty: [] };
    // Streifen-Erkennung der Dienstzeile
    const dutyImages = Array.from({ length: grid.cols }, (_, d) => prepareCell(grid.image, cellRect(grid, d, rowIndex(p, layout.dutyRow))));
    const strip = composeStrip(dutyImages.map(c => c.image));
    const stripWords = (await engine.recognize(strip.image, { mode: 'sparse', characters })).words;
    const stripTexts = Array(grid.cols).fill('');
    for (const w of stripWords) {
      const cx = (w.x0 + w.x1) / 2;
      const idx = strip.spans.findIndex(([a, b]) => cx >= a - 30 && cx < b + 30);
      if (idx >= 0) stripTexts[idx] += w.text;
    }

    for (let d = 0; d < grid.cols; d++) {
      const rect = cellRect(grid, d, rowIndex(p, layout.dutyRow));
      const cell = dutyImages[d];
      const cellGot = await readCell(cell);
      let altGot: string | null = null;
      if (cell.partialFill) altGot = await readCell(prepareCell(grid.image, rect, { rowBackground: true }));
      const rt = normalizeReading(stripTexts[d]);
      const stripGot = rt !== '' && rt.length <= maxLen ? rt : '';
      dutyCells.push({ person: p, day: d, got: stripGot || cellGot, cellGot, stripGot, altGot, contrast: cell.contrast,
        patch: patchOf(grid.image, rect), snapped: '', value: '', uncertain: false });
      tick();

      if (layout.absenceRow !== undefined) {
        const aRect = cellRect(grid, d, rowIndex(p, layout.absenceRow));
        const aCell = prepareCell(grid.image, aRect);
        const got = await readCell(aCell);
        absenceCells.push({ person: p, day: d, got, cellGot: got, stripGot: '', altGot: null, contrast: aCell.contrast,
          patch: patchOf(grid.image, aRect), snapped: '', value: '', uncertain: false });
        tick();
      }
      if (layout.standbyRow !== undefined) {
        const bCell = prepareCell(grid.image, cellRect(grid, d, rowIndex(p, layout.standbyRow)));
        const raw = (await engine.recognize(bCell.image, { mode: 'line' })).text.replace(/\s+/g, '').toUpperCase();
        (result.standby ??= []).push({ labelled: /[A-Z0-9]{2,}/.test(raw), raw });
        tick();
      }
    }
    results.push(result);
  }

  const ignored = implausiblePersons(dutyCells, options.auxiliaryPersons ?? [], known, grid.cols);
  for (const c of [...dutyCells, ...absenceCells]) if (ignored.has(c.person)) c.uncertain = true;
  const used = (c: WorkCell) => !ignored.has(c.person);
  resolveDuty(dutyCells.filter(used), known, templateMin, templateMargin);
  if (layout.absenceRow !== undefined) resolveAbsence(absenceCells.filter(used), vocabulary.absence, templateMin, templateMargin);

  for (const c of dutyCells) results[c.person].duty[c.day] = toResult(c);
  for (const c of absenceCells) (results[c.person].absence ??= [])[c.day] = toResult(c);
  return results;
}

/**
 * Hilfsblöcke, die nicht wie eine Planzeile aussehen: weniger als ein Viertel der Tage (mindestens 3)
 * mit einem bekannten Kürzel. Tageszahlen der Kopfzeile oder Legendentext erfüllen das nicht.
 */
export function implausiblePersons(cells: { person: number; got: string }[], auxiliary: number[], known: string[], days: number): Set<number> {
  const ignored = new Set<number>();
  for (const p of auxiliary) {
    const hits = cells.filter(c => c.person === p && known.includes(snapToKnown(c.got, known))).length;
    if (hits < Math.max(3, days / 4)) ignored.add(p);
  }
  return ignored;
}

const toResult = (c: WorkCell): CellResult => ({
  value: c.uncertain ? '' : (isFreeCode(c.value) ? '' : c.value),
  uncertain: c.uncertain,
  suggestion: c.uncertain ? (c.suggestion && !isFreeCode(c.suggestion) ? c.suggestion : c.suggestion === '-' ? '' : undefined) : undefined,
  raw: c.cellGot
});

function bestTemplate(patch: Patch, examples: Map<string, Patch[]>) {
  return [...examples.entries()]
    .map(([code, patches]) => ({ code, score: Math.max(...patches.map(pt => similarity(patch, pt))) }))
    .sort((a, b) => b.score - a.score);
}

function resolveDuty(cells: WorkCell[], known: string[], minScore: number, margin: number) {
  for (const c of cells) c.snapped = snapToKnown(c.got, known);
  // Leer oder beschriftet: Schwelle je Plan aus der Verteilung der Zellkontraste
  const thr = otsu1d(cells.map(c => c.contrast));
  const surelyEmpty = (c: WorkCell) => c.contrast <= thr * 0.4;
  const dashContrast = (() => { const v = cells.filter(c => c.got === '-').map(c => c.contrast).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : Infinity; })();

  for (const c of cells) {
    const cellSnap = snapToKnown(c.cellGot, known);
    // Widerspruch Streifen <-> Einzelzelle, oder bei Teilfüllung Lesung mit zeilenweisem Hintergrund abweichend
    const conflict = (c.stripGot !== '' && cellSnap !== snapToKnown(c.stripGot, known)
        && (cellSnap === '-' || known.includes(cellSnap) || (cellSnap === '' && c.contrast <= thr)))
      || (c.altGot !== null && snapToKnown(c.altGot, known) !== c.snapped);
    if (!conflict) {
      if (known.includes(c.snapped)) { c.value = c.snapped; continue; }
      if ((c.snapped === '-' && c.contrast <= dashContrast * 1.6) || (c.snapped === '' && surelyEmpty(c))) { c.value = '-'; continue; }
    }
    c.uncertain = true;
  }

  // Auffällig kurze Kürzel (z. B. "S", wenn der Plan sonst dreistellige Kürzel hat) entstehen leicht aus Rauschen
  downgradeShortCodes(cells);

  // Muster pro Plan aus sicher gelesenen Zellen (inkl. "-"), Vergleich mit Verschiebungstoleranz
  const examples = new Map<string, Patch[]>();
  for (const c of cells) {
    if (c.uncertain || !(known.includes(c.value) || (c.value === '-' && c.got === '-'))) continue;
    const list = examples.get(c.value) ?? [];
    if (list.length < 8) list.push(c.patch);
    examples.set(c.value, list);
  }
  for (const c of cells) {
    if (!c.uncertain) continue;
    const [b1, b2] = bestTemplate(c.patch, examples);
    if (!b1) continue;
    c.suggestion = b1.code;
    if (b1.score >= minScore && (!b2 || b1.score - b2.score >= margin)) { c.value = b1.code; c.uncertain = false; }
  }
}

/**
 * Ein gültiges, aber deutlich kürzeres Kürzel als die übrigen sicher gelesenen Kürzel des Plans
 * wird unsicher (mit dem Kürzel als Vorschlag). Pläne mit durchweg kurzen Kürzeln sind nicht betroffen.
 */
export function downgradeShortCodes(cells: { value: string; uncertain: boolean; suggestion?: string }[]): void {
  const lengths = new Map<number, number>();
  for (const c of cells) if (!c.uncertain && !isFreeCode(c.value)) lengths.set(c.value.length, (lengths.get(c.value.length) ?? 0) + 1);
  if (!lengths.size) return;
  const typical = [...lengths.entries()].sort((a, b) => b[1] - a[1])[0][0];
  for (const c of cells) {
    if (!c.uncertain && !isFreeCode(c.value) && c.value.length < typical) {
      c.uncertain = true;
      c.suggestion = c.value;
    }
  }
}

function resolveAbsence(cells: WorkCell[], known: string[], minScore: number, margin: number) {
  const thr = otsu1d(cells.map(c => c.contrast));
  for (const c of cells) {
    if (known.includes(c.got)) { c.value = c.got; continue; }
    if (c.got === '' && c.contrast <= thr * 0.6) { c.value = ''; c.lowInk = true; continue; }
    c.uncertain = true;
  }
  const examples = new Map<string, Patch[]>();
  for (const c of cells) {
    if (c.uncertain) continue;
    const list = examples.get(c.value) ?? [];
    if (list.length < 8) list.push(c.patch);
    examples.set(c.value, list);
  }
  // "sicher leer" nur, wenn die Zelle keinem sicher gelesenen Abwesenheitskürzel ähnelt
  for (const c of cells) {
    if (!c.lowInk) continue;
    for (const [code, patches] of examples) {
      if (code && Math.max(...patches.map(pt => similarity(c.patch, pt))) >= 0.6) { c.uncertain = true; break; }
    }
  }
  for (const c of cells) {
    if (!c.uncertain) continue;
    const [b1, b2] = bestTemplate(c.patch, examples);
    if (!b1) continue;
    c.suggestion = b1.code;
    if (b1.score >= minScore && (!b2 || b1.score - b2.score >= margin)) { c.value = b1.code; c.uncertain = false; }
  }
}
