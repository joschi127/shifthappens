/// <reference types="node" />
/**
 * Regressionstest der Dienstplan-Erkennung (npm run test:recognition).
 * Läuft über alle Beispielbilder mit hinterlegten Ecken in docs/beispiele/dienstplaene/ und,
 * falls vorhanden, local/dienstplaene/ (private Pläne, nur lokal).
 *
 * Harte Regel: keine sicher falsche Zelle; handschriftlich korrigierte Zellen sind unsicher.
 * Geprüft wird die ganze Tabelle und, wie in der App, einzelne Blöcke mit ihren Nachbarn als Beispielen.
 * Weiche Regel: unsichere Zellen höchstens wie in recognition.baseline.json
 * (neu schreiben mit UPDATE_BASELINE=1 npm run test:recognition).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildGrid, Quad, quadSlice, warpQuad } from './geometry';
import { OcrEngine } from './ocr';
import { Raster, rotate90 } from './raster';
import { PersonResult, recognizeGrid } from './recognizeGrid';
import { recognizeOwnBlock } from './recognizeOwnBlock';
import { createTesseractEngine } from './tesseractEngine';
import { isFreeCode } from './codeReading';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASELINE_FILE = path.join(root, 'src/import/recognition.baseline.json');
const OUT_OF_SCOPE = new Set(['////', 'D03']); // Sonderfälle einzelner Kollegen (PRD Dienstplan-Import)

interface Example { dir: string; expectedFile: string; image: string; corners: Quad; rotate: boolean; isLocal: boolean }

function loadExpected(file: string): any {
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return data.basis ? { ...loadExpected(path.join(path.dirname(file), `${data.basis}.erwartet.json`)), ...data } : data;
}

function collectExamples(): Example[] {
  const dirs = [['docs/beispiele/dienstplaene', false], ['local/dienstplaene', true]] as const;
  const examples: Example[] = [];
  for (const [rel, isLocal] of dirs) {
    const dir = path.join(root, rel);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.erwartet.json')).sort()) {
      const data = loadExpected(path.join(dir, f));
      for (const image of data.dateien ?? []) {
        const setup = data.auswertung?.[image];
        if (setup) examples.push({ dir, expectedFile: path.join(dir, f), image, corners: setup.ecken, rotate: setup.drehung === 90, isLocal });
      }
    }
  }
  return examples;
}

function decode(file: string): Raster {
  const buf = fs.readFileSync(file);
  if (file.endsWith('.png')) { const p = PNG.sync.read(buf); return { width: p.width, height: p.height, data: p.data }; }
  const j = jpeg.decode(buf, { useTArray: true });
  return { width: j.width, height: j.height, data: j.data };
}

// Sicher falsche Zellen einer Person (Dienst- und Abwesenheitszeile)
function sureWrongOf(row: any, result: PersonResult): string[] {
  const wrong: string[] = [];
  row.codes.forEach((expected: string, d: number) => {
    if (OUT_OF_SCOPE.has(expected)) return;
    const cell = result.duty[d];
    if (!cell.uncertain && cell.value !== (isFreeCode(expected) ? '' : expected)) wrong.push(`D ${row.name ?? row.kuerzel} Tag ${d + 1}: erwartet "${expected}", erkannt "${cell.value}"`);
  });
  (row.sonder ?? []).forEach((expected: string, d: number) => {
    const cell = result.absence![d];
    if (!cell.uncertain && cell.value !== expected) wrong.push(`S ${row.name} Tag ${d + 1}: erwartet "${expected}", erkannt "${cell.value}"`);
  });
  return wrong;
}

const corrections = (data: any, image: string) =>
  (data.handschrift ?? []).filter((h: any) => h.art === 'korrektur' && (!h.dateien || h.dateien.includes(image)));

const encodePng = (img: Raster) => { const p = new PNG({ width: img.width, height: img.height }); p.data = Buffer.from(img.data); return PNG.sync.write(p); };

const examples = collectExamples();
const baseline: Record<string, { duty: number; absence: number }> = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8')) : {};
const measured: Record<string, { duty: number; absence: number }> = {};
let engine: OcrEngine;

beforeAll(async () => {
  engine = await createTesseractEngine({
    encode: encodePng,
    langPath: path.join(root, 'node_modules/@tesseract.js-data/eng/4.0.0_best_int'),
    cacheMethod: 'none'
  });
});

afterAll(async () => {
  await engine?.terminate();
  if (process.env.UPDATE_BASELINE === '1') {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(Object.fromEntries(Object.entries({ ...baseline, ...measured }).sort()), null, 2) + '\n');
  }
});

describe.each(examples.map(e => [e.isLocal ? `local/${e.image}` : e.image, e] as const))('Erkennung %s', (key, example) => {
  it('liefert keine sicher falschen Zellen und markiert Korrekturen', async () => {
    const data = loadExpected(example.expectedFile);
    const subRows = data.unterzeilen ? Object.keys(data.unterzeilen).length : 1;
    const persons = data.zeilen.length, days = data.tage;
    let img = decode(path.join(example.dir, example.image));
    if (example.rotate) img = rotate90(img, 'cw');
    const grid = buildGrid(warpQuad(img, example.corners, days * 64, persons * subRows * 34), days, persons * subRows);

    const dutyCodes = [...new Set<string>(data.zeilen.flatMap((z: any) => z.codes))].filter(c => !isFreeCode(c));
    const absenceCodes = [...new Set<string>(data.zeilen.flatMap((z: any) => z.sonder ?? []))].filter(Boolean);
    const result = await recognizeGrid(grid, subRows > 1
      ? { persons, subRows, dutyRow: 0, absenceRow: 1, standbyRow: 2 }
      : { persons, subRows: 1, dutyRow: 0 }, { duty: dutyCodes, absence: absenceCodes }, engine);

    const sureWrong: string[] = [];
    let dutyUncertain = 0, absenceUncertain = 0;
    data.zeilen.forEach((row: any, p: number) => {
      row.codes.forEach((expected: string, d: number) => {
        if (OUT_OF_SCOPE.has(expected)) return;
        const cell = result[p].duty[d];
        if (cell.uncertain) { dutyUncertain++; return; }
        if (cell.value !== (isFreeCode(expected) ? '' : expected)) sureWrong.push(`D ${row.name ?? row.kuerzel} Tag ${d + 1}: erwartet "${expected}", erkannt "${cell.value}"`);
      });
      (row.sonder ?? []).forEach((expected: string, d: number) => {
        const cell = result[p].absence![d];
        if (cell.uncertain) { absenceUncertain++; return; }
        if (cell.value !== expected) sureWrong.push(`S ${row.name} Tag ${d + 1}: erwartet "${expected}", erkannt "${cell.value}"`);
      });
    });
    measured[key] = { duty: dutyUncertain, absence: absenceUncertain };

    // Private Pläne: keine Namen in der Ausgabe
    expect(example.isLocal ? sureWrong.length : sureWrong).toEqual(example.isLocal ? 0 : []);

    for (const h of (data.handschrift ?? []).filter((h: any) => h.art === 'korrektur' && (!h.dateien || h.dateien.includes(example.image)))) {
      const p = data.zeilen.findIndex((z: any) => z.name === h.name);
      expect(result[p].duty[h.tag - 1].uncertain, `Korrektur ${example.isLocal ? '' : h.name} Tag ${h.tag}`).toBe(true);
    }

    const ref = baseline[key];
    if (ref && process.env.UPDATE_BASELINE !== '1') {
      expect(dutyUncertain, 'unsichere Zellen (Dienst) über Referenz').toBeLessThanOrEqual(ref.duty);
      expect(absenceUncertain, 'unsichere Zellen (Abwesenheit) über Referenz').toBeLessThanOrEqual(ref.absence);
    }
  });

  it('erkennt einzelne Blöcke mit Nachbarblöcken als Beispielen ohne sicher falsche Zellen', async () => {
    const data = loadExpected(example.expectedFile);
    const subRows = data.unterzeilen ? Object.keys(data.unterzeilen).length : 1;
    const persons = data.zeilen.length, days = data.tage;
    let img = decode(path.join(example.dir, example.image));
    if (example.rotate) img = rotate90(img, 'cw');
    const dutyCodes = [...new Set<string>(data.zeilen.flatMap((z: any) => z.codes))].filter(c => !isFreeCode(c));
    const absenceCodes = [...new Set<string>(data.zeilen.flatMap((z: any) => z.sonder ?? []))].filter(Boolean);
    const layout = subRows > 1 ? { subRows, dutyRow: 0, absenceRow: 1, standbyRow: 2 } : { subRows: 1, dutyRow: 0 };

    // erste Person (darüber liegt die Kopfzeile), mittlere und letzte Person
    for (const p of [...new Set([0, persons >> 1, persons - 1])]) {
      const corners = quadSlice(example.corners, p / persons, (p + 1) / persons);
      const result = await recognizeOwnBlock(img, corners, days, layout, { duty: dutyCodes, absence: absenceCodes }, engine);
      const row = data.zeilen[p];
      const wrong = sureWrongOf(row, result);
      if (process.env.COMPARE_NEIGHBORS_FILE) {
        // Vergleich mit/ohne Nachbarn: Anzahl unsicherer Zellen (nur zur Auswertung, keine Prüfung)
        const alone = await recognizeOwnBlock(img, corners, days, layout, { duty: dutyCodes, absence: absenceCodes }, engine, { neighbors: 0 });
        const count = (r: PersonResult) => r.duty.filter(c => c.uncertain).length + (r.absence ?? []).filter(c => c.uncertain).length;
        fs.appendFileSync(process.env.COMPARE_NEIGHBORS_FILE, `${key} Person ${p + 1}: mit Nachbarn ${count(result)}, allein ${count(alone)}, sicher falsch allein ${sureWrongOf(row, alone).length}\n`);
      }
      expect(example.isLocal ? wrong.length : wrong, `Person ${p + 1}`).toEqual(example.isLocal ? 0 : []);
      for (const h of corrections(data, example.image).filter((h: any) => h.name === row.name)) {
        expect(result.duty[h.tag - 1].uncertain, `Korrektur ${example.isLocal ? '' : h.name} Tag ${h.tag}`).toBe(true);
      }
    }
  });
});
