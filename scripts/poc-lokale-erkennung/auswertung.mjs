// Gesamtauswertung der Simulation über alle Beispielbilder mit hinterlegten Ecken.
// Öffentliche Beispiele: docs/beispiele/dienstplaene/, private (falls vorhanden): local/dienstplaene/
// Aufruf aus dem Projektverzeichnis: node scripts/poc-lokale-erkennung/auswertung.mjs [ausgabeordner]
// Gibt nur Kennzahlen aus (keine Namen), damit die Ausgabe auch für private Daten unkritisch ist.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const outRoot = process.argv[2] || fs.mkdtempSync('/tmp/dienstplan-auswertung-');
const BEST = { TEMPLATES: '1', T_MIN: '0.85', T_MARGIN: '0.10', SNAP: '1', MODE: 'gray', SCALE: '2', INSET_L: '0.06', INSET_R: '0.02', INSET_Y: '0.1',
  LINEFIX: '1', ROWOCR: '1', ROWPSM: 'sparse', GAP: '60', IGNORE: '////,D03', PLANINK: '1' };

const dirs = [path.join(root, 'docs/beispiele/dienstplaene'), path.join(root, 'local/dienstplaene')].filter(d => fs.existsSync(d));
const rows = [];
for (const dir of dirs) for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.erwartet.json')).sort()) {
  const erwartet = path.join(dir, f);
  const data = JSON.parse(fs.readFileSync(erwartet, 'utf-8'));
  for (const bild of data.dateien || []) {
    const a = data.auswertung?.[bild]; if (!a) continue;
    const out = path.join(outRoot, bild.replace(/\W+/g, '_'));
    const args = [path.join(here, 'lokale-erkennung.mjs'), path.join(dir, bild), JSON.stringify(a.ecken), out];
    if (a.drehung === 90) args.push('rotate90');
    execFileSync(process.execPath, args, { env: { ...process.env, ...BEST, ERWARTET: erwartet }, stdio: ['ignore', 'ignore', 'ignore'] });
    const res = JSON.parse(fs.readFileSync(path.join(out, 'ergebnis.json'), 'utf-8'));
    const free = (v) => ['', '-', '–', '—'].includes(v);
    const ok = (c) => c.ergebnis === c.erwartet || (free(c.ergebnis) && free(c.erwartet));
    const stat = (cells) => cells.length ? `${cells.filter(c => !c.unsicher && ok(c)).length} / ${cells.filter(c => !c.unsicher && !ok(c)).length} / ${cells.filter(c => c.unsicher).length} von ${cells.length}` : '–';
    // Handschriftliche Korrekturen: sollen NICHT als sicher gelesener gedruckter Wert durchgehen
    let hand = '–';
    const korr = (data.handschrift || []).filter(h => h.art === 'korrektur' && (!h.dateien || h.dateien.includes(bild)));
    if (korr.length) hand = korr.map(h => { const c = res.D.find(x => x.person === h.name && x.tag === h.tag); return c ? (c.unsicher ? 'markiert' : `sicher „${c.ergebnis}“`) : '?'; }).join(', ');
    rows.push({ bild: dir.includes('local') ? `local/${bild}` : bild, D: stat(res.D), S: stat(res.S), hand });
  }
}
console.log('| Bild | D-Zeile: sicher richtig / SICHER FALSCH / unsicher | S-Zeile | Handschriftliche Korrekturen |');
console.log('|---|---|---|---|');
for (const r of rows) console.log(`| ${r.bild} | ${r.D} | ${r.S} | ${r.hand} |`);
