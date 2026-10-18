// Gesamtauswertung der Simulation über alle Beispielbilder mit hinterlegten Ecken.
// Öffentliche Beispiele: docs/beispiele/dienstplaene/, private (falls vorhanden): local/dienstplaene/
// Aufruf aus dem Projektverzeichnis: node scripts/poc-local-recognition/evaluate.mjs [ausgabeordner]
// Gibt nur Kennzahlen aus (keine Namen), damit die Ausgabe auch für private Daten unkritisch ist.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const outRoot = process.argv[2] || fs.mkdtempSync('/tmp/roster-evaluation-');
const BEST = { TEMPLATES: '1', T_MIN: '0.85', T_MARGIN: '0.10', SNAP: '1', MODE: 'gray', SCALE: '2', INSET_L: '0.06', INSET_R: '0.02', INSET_Y: '0.1',
  LINEFIX: '1', ROWOCR: '1', ROWPSM: 'sparse', GAP: '60', IGNORE: '////,D03', PLANINK: '1', SNAP_LOCAL: '1', ROWBG: 'check' };

const isFree = (v) => ['', '-', '–', '—'].includes(v);
const isCorrect = (c) => c.result === c.expected || (isFree(c.result) && isFree(c.expected));
const summarize = (cells) => cells.length
  ? `${cells.filter(c => !c.uncertain && isCorrect(c)).length} / ${cells.filter(c => !c.uncertain && !isCorrect(c)).length} / ${cells.filter(c => c.uncertain).length} von ${cells.length}`
  : '–';

const dirs = [path.join(root, 'docs/beispiele/dienstplaene'), path.join(root, 'local/dienstplaene')].filter(d => fs.existsSync(d));
const rows = [];
for (const dir of dirs) for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.erwartet.json')).sort()) {
  const expectedPath = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'));
  for (const image of data.dateien || []) {
    const setup = data.auswertung?.[image]; if (!setup) continue;
    if (setup.drehung && setup.drehung !== 90) continue; // die Simulation kennt nur 90°, alle Drehungen prüft npm run test:recognition
    const out = path.join(outRoot, image.replace(/\W+/g, '_'));
    const args = [path.join(here, 'recognize.mjs'), path.join(dir, image), JSON.stringify(setup.ecken), out];
    if (setup.drehung === 90) args.push('rotate90');
    execFileSync(process.execPath, args, { env: { ...process.env, ...BEST, EXPECTED: expectedPath }, stdio: ['ignore', 'ignore', 'ignore'] });
    const result = JSON.parse(fs.readFileSync(path.join(out, 'result.json'), 'utf-8'));
    // Handschriftliche Korrekturen: sollen NICHT als sicher gelesener gedruckter Wert durchgehen
    const corrections = (data.handschrift || []).filter(h => h.art === 'korrektur' && (!h.dateien || h.dateien.includes(image)));
    const handwriting = corrections.length
      ? corrections.map(h => { const c = result.D.find(x => x.person === h.name && x.day === h.tag); return c ? (c.uncertain ? 'markiert' : `sicher „${c.result}“`) : '?'; }).join(', ')
      : '–';
    rows.push({ image: dir.includes('local') ? `local/${image}` : image, D: summarize(result.D), S: summarize(result.S), handwriting });
  }
}
console.log('| Bild | D-Zeile: sicher richtig / SICHER FALSCH / unsicher | S-Zeile | Handschriftliche Korrekturen |');
console.log('|---|---|---|---|');
for (const r of rows) console.log(`| ${r.image} | ${r.D} | ${r.S} | ${r.handwriting} |`);
