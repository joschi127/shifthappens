/**
 * Regressionstest der automatischen Blocksuche (npm run test:recognition): Für die erste, eine mittlere und
 * die letzte Person jedes Beispielbilds wird der eigene Block wie in der App gesucht, also mit dem Bild wie
 * fotografiert und bei Bedarf gedreht. Treffer = richtige Drehung und Ecken höchstens 0,4 Spaltenbreiten
 * von den hinterlegten entfernt (bei stark gewölbten Blättern genügt die richtige Drehung).
 *
 * Die Suche ist ein Vorschlag, den der Nutzer bestätigt, und noch nicht in allen Bildern genau (PRD).
 * Daher gilt wie bei der Erkennung eine Referenz: Treffer je Bild mindestens wie in blockFinder.baseline.json
 * (neu schreiben mit UPDATE_BASELINE=1 npm run test:recognition).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { quadSlice } from './geometry';
import { OcrEngine, OcrRequest } from './ocr';
import { Raster } from './raster';
import { locateOwnBlock } from './blockFinder';
import { IMPORT_FORMATS } from './formats';
import { isFreeCode } from './codeReading';
import { collectExamples, createTestEngine, decode, loadExpected, root, rotateBy } from '../testing/recognitionExamples';

const BASELINE_FILE = path.join(root, 'src/import/blockFinder.baseline.json');
const baseline: Record<string, number> = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8')) : {};
const measured: Record<string, number> = {};

let engine: OcrEngine;
// Texterkennung je Bild nur einmal (die Suche läuft für mehrere Personen auf demselben Bild)
const cache = new Map<string, ReturnType<OcrEngine['recognize']>>();
const fingerprint = (img: Raster) => {
  let h = 0;
  for (let i = 0; i < img.data.length; i += 4099) h = (h * 31 + img.data[i]) >>> 0;
  return `${img.width}x${img.height}:${h}`;
};
const cachingEngine: OcrEngine = {
  recognize: (img: Raster, request: OcrRequest) => {
    const key = `${fingerprint(img)}:${request.mode}:${request.characters ?? ''}`;
    if (!cache.has(key)) cache.set(key, engine.recognize(img, request));
    return cache.get(key)!;
  },
  terminate: () => engine.terminate()
};

beforeAll(async () => { engine = await createTestEngine(); });
afterAll(async () => {
  await engine?.terminate();
  if (process.env.UPDATE_BASELINE === '1') {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(Object.fromEntries(Object.entries({ ...baseline, ...measured }).sort()), null, 2) + '\n');
  }
});

// Pläne ohne Namen (Variante 2, nur Kürzel) sind außerhalb des Umfangs (PRD Dienstplan-Import, Einschränkungen)
const examples = collectExamples().filter(e => !e.image.startsWith('variante-2-'));
describe.each(examples.map(e => [e.isLocal ? `local/${e.image}` : e.image, e] as const))('Blocksuche %s', (key, example) => {
  it('findet den eigenen Block in der richtigen Drehung (mindestens wie in der Referenz)', async () => {
    cache.clear();
    const data = loadExpected(example.expectedFile);
    const subRows = data.unterzeilen ? Object.keys(data.unterzeilen).length : 1;
    const format = IMPORT_FORMATS.find(f => (f.subRows ?? 1) === subRows)!;
    const persons = data.zeilen.length, days = data.tage;
    // wie in der App: auch einbuchstabige Zweitkürzel (z. B. „S“ am Spätdienst) können vorkommen
    const dutyCodes = [...new Set<string>([...data.zeilen.flatMap((z: any) => z.codes), 'S'])].filter(c => !isFreeCode(c));
    const photo = decode(path.join(example.dir, example.image));
    const upright = rotateBy(photo, example.rotate);

    const misses: string[] = [];
    let hits = 0;
    // Private Pläne enthalten nur Platzhalternamen: dort die eigene Zeile aus local/dienstplaene/profil.json
    // (Feld "profilZeile" in den erwarteten Werten = Index der Person)
    const profileFile = path.join(example.dir, 'profil.json');
    const ownRow: number | undefined = data.profilZeile;
    const people = example.isLocal
      ? (ownRow !== undefined && fs.existsSync(profileFile) ? [{ p: ownRow, names: JSON.parse(fs.readFileSync(profileFile, 'utf-8')).rosterNames as string[] }] : [])
      : [...new Set([0, persons >> 1, persons - 1])].map(p => ({ p, names: [data.zeilen[p].name ?? data.zeilen[p].kuerzel] }));
    for (const { p, names } of people) {
      const row = data.zeilen[p];
      const label = example.isLocal ? `Person ${p + 1}` : row.name ?? row.kuerzel;
      const found = await locateOwnBlock(photo, cachingEngine, { rosterNames: names, days, blockRatio: format.blockRatio!, subRows, dutyCodes });
      if (!found) { misses.push(`${label}: nicht gefunden`); continue; }
      if (found.image.width !== upright.width || found.image.height !== upright.height) { misses.push(`${label}: falsche Drehung`); continue; }
      if (!example.curved) {
        const expected = quadSlice(example.corners, p / persons, (p + 1) / persons);
        const colWidth = Math.hypot(expected[1][0] - expected[0][0], expected[1][1] - expected[0][1]) / days;
        const deviation = Math.max(...expected.map(([x, y], i) => Math.hypot(found.match.corners[i][0] - x, found.match.corners[i][1] - y))) / colWidth;
        if (deviation > 0.4) { misses.push(`${label}: Ecken ${deviation.toFixed(2)} Spaltenbreiten daneben`); continue; }
      }
      hits++;
    }
    measured[key] = hits;
    if (misses.length) console.info(`Blocksuche ${key}: ${misses.join('; ')}`);
    if (key in baseline && process.env.UPDATE_BASELINE !== '1') expect(hits, misses.join('; ')).toBeGreaterThanOrEqual(baseline[key]);
  });
});
