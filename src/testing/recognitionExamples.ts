/// <reference types="node" />
/**
 * Beispielbilder mit erwarteten Werten für die Regressionstests der Erkennung (npm run test:recognition):
 * docs/beispiele/dienstplaene/ und, falls vorhanden, local/dienstplaene/ (private Pläne, nur lokal).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { Quad } from '../import/geometry';
import { OcrEngine } from '../import/ocr';
import { Raster, rotate180, rotate90 } from '../import/raster';
import { createTesseractEngine } from '../import/tesseractEngine';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export interface Example {
  dir: string;
  expectedFile: string;
  image: string;
  corners: Quad;       // Ecken der ganzen Tabelle (Tagesraster aller Personen) im gedrehten Bild
  rotate: number;      // Drehung im Uhrzeigersinn in Grad (0, 90, 180, 270), damit der Plan aufrecht steht
  curved: boolean;     // Blatt stark gewölbt: Blöcke liegen nicht gleichmäßig zwischen den Ecken
  isLocal: boolean;
}

export function loadExpected(file: string): any {
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return data.basis ? { ...loadExpected(path.join(path.dirname(file), `${data.basis}.erwartet.json`)), ...data } : data;
}

export function collectExamples(): Example[] {
  const dirs = [['docs/beispiele/dienstplaene', false], ['local/dienstplaene', true]] as const;
  const examples: Example[] = [];
  for (const [rel, isLocal] of dirs) {
    const dir = path.join(root, rel);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.erwartet.json')).sort()) {
      const data = loadExpected(path.join(dir, f));
      for (const image of data.dateien ?? []) {
        const setup = data.auswertung?.[image];
        if (setup) examples.push({ dir, expectedFile: path.join(dir, f), image, corners: setup.ecken, rotate: setup.drehung ?? 0,
          curved: setup.gewoelbt === true, isLocal });
      }
    }
  }
  return examples;
}

export function decode(file: string): Raster {
  const buf = fs.readFileSync(file);
  if (file.endsWith('.png')) { const p = PNG.sync.read(buf); return { width: p.width, height: p.height, data: p.data }; }
  const j = jpeg.decode(buf, { useTArray: true });
  return { width: j.width, height: j.height, data: j.data };
}

export const encodePng = (img: Raster) => { const p = new PNG({ width: img.width, height: img.height }); p.data = Buffer.from(img.data); return PNG.sync.write(p); };

export const rotateBy = (img: Raster, degrees: number) =>
  degrees === 90 ? rotate90(img, 'cw') : degrees === 180 ? rotate180(img) : degrees === 270 ? rotate90(img, 'ccw') : img;

export const createTestEngine = (): Promise<OcrEngine> => createTesseractEngine({
  encode: encodePng,
  langPath: path.join(root, 'node_modules/@tesseract.js-data/eng/4.0.0_best_int'),
  cacheMethod: 'none'
});
