/// <reference types="node" />
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadReferenceRoster, REFERENCE_ROSTER_DIR } from './referenceRosters';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const FREE = '-';
const isShift = (code: string) => code !== '' && code !== FREE && code !== '–';

describe.each(['variante-1', 'variante-2', 'variante-3', 'variante-4'])('Referenz-Dienstplan %s', (variant) => {
  const roster = loadReferenceRoster(variant);

  it('verweist auf vorhandene Bilddateien', () => {
    for (const file of roster.dateien) {
      expect(existsSync(`${REFERENCE_ROSTER_DIR}${file}`), file).toBe(true);
    }
  });

  it('hat pro Zeile genau einen Eintrag je Tag des Monats', () => {
    const daysInMonth = new Date(roster.jahr, roster.monat, 0).getDate();
    expect(roster.tage).toBe(daysInMonth);
    for (const row of roster.zeilen) {
      for (const subRow of [row.codes, row.sonder, row.bereitschaft, row.anfang, row.ende]) {
        if (subRow) expect(subRow, row.name ?? row.kuerzel).toHaveLength(daysInMonth);
      }
    }
  });

  it('nutzt nur Kürzel aus der Legende (falls der Plan eine hat)', () => {
    if (!roster.legende) return;
    const legendCodes = new Set(roster.legende.map(entry => entry.code));
    for (const row of roster.zeilen) {
      for (const code of row.codes) {
        expect(legendCodes.has(code), `${row.kuerzel}: ${code}`).toBe(true);
      }
    }
  });

  it('beginnt mit dem Wochentag, den der echte Kalender für den 1. liefert', () => {
    expect(WEEKDAYS[new Date(roster.jahr, roster.monat - 1, 1).getDay()]).toBe(roster.ersterWochentag);
  });

  it('hat eindeutige Namen und Kürzel (soweit vorhanden)', () => {
    for (const values of [roster.zeilen.map(row => row.name), roster.zeilen.map(row => row.kuerzel)]) {
      const present = values.filter(Boolean);
      expect(new Set(present).size).toBe(present.length);
    }
    expect(roster.zeilen.every(row => row.name || row.kuerzel)).toBe(true);
  });
});

describe('Variante 2 (ohne Namensspalte)', () => {
  it('enthält dieselben Schichten wie Variante 1, nur ohne Namen', () => {
    const v1 = loadReferenceRoster('variante-1');
    const v2 = loadReferenceRoster('variante-2');
    expect(v2.zeilen.every(row => row.name === undefined)).toBe(true);
    expect(v2.zeilen).toEqual(v1.zeilen.map(({ kuerzel, codes }) => ({ kuerzel, codes })));
  });
});

describe('Variante 3 (Unterzeilen D/S/B/A/E)', () => {
  const roster = loadReferenceRoster('variante-3');
  const days = (row: { codes: string[] }) => row.codes.map((_, i) => i);

  it('hat für jeden Dienst Anfang und Ende und sonst keine Zeiten', () => {
    for (const row of roster.zeilen) {
      for (const i of days(row)) {
        const hasTimes = row.anfang![i] !== '' && row.ende![i] !== '';
        expect(hasTimes, `${row.name}, Tag ${i + 1}`).toBe(isShift(row.codes[i]));
      }
    }
  });

  it('hat für jedes Kürzel überall dieselben Zeiten', () => {
    const timesByCode = new Map<string, string>();
    for (const row of roster.zeilen) {
      for (const i of days(row)) {
        if (!isShift(row.codes[i])) continue;
        const times = `${row.anfang![i]}–${row.ende![i]}`;
        const known = timesByCode.get(row.codes[i]);
        if (known) expect(times, `${row.name}, Tag ${i + 1}, ${row.codes[i]}`).toBe(known);
        timesByCode.set(row.codes[i], times);
      }
    }
    expect(Object.fromEntries(timesByCode)).toEqual({
      'F01': '07:00–15:30', 'F02': '05:57–07:15', 'F04': '06:30–14:00',
      'M01': '08:00–18:00', 'M05': '10:00–18:00', 'S04': '13:00–21:00',
      'N01': '17:30–23:57', 'N06': '05:57–23:57', 'N08': '20:30–23:57',
      'D03': '08:00–12:00', '////': '07:30–16:00'
    });
  });

  it('hat Bereitschaft (B11) genau an den Tagen mit Nachtdienst (N..)', () => {
    for (const row of roster.zeilen) {
      for (const i of days(row)) {
        expect(row.bereitschaft![i] === 'B11', `${row.name}, Tag ${i + 1}`).toBe(row.codes[i].startsWith('N'));
      }
    }
  });

  it('hat Abwesenheiten (U) nur an Tagen ohne Dienst', () => {
    for (const row of roster.zeilen) {
      for (const i of days(row)) {
        if (row.sonder![i] !== '') {
          expect(row.sonder![i]).toBe('U');
          expect(row.codes[i], `${row.name}, Tag ${i + 1}`).toBe(FREE);
        }
      }
    }
  });
});

describe('Variante 4 (Variante 3 mit Handschrift)', () => {
  const roster = loadReferenceRoster('variante-4');

  it('übernimmt die gedruckten Werte von Variante 3', () => {
    expect(roster.zeilen).toEqual(loadReferenceRoster('variante-3').zeilen);
  });

  it('bezieht Korrekturen auf den tatsächlich gedruckten Dienst', () => {
    const corrections = roster.handschrift!.filter(entry => entry.art === 'korrektur');
    expect(corrections.length).toBeGreaterThan(0);
    for (const correction of corrections) {
      const row = roster.zeilen.find(r => r.name === correction.name);
      expect(row?.codes[correction.tag! - 1], `${correction.name}, Tag ${correction.tag}`).toBe(correction.gedruckt);
    }
  });

  it('enthält eine ersetzte und eine ersatzlos gestrichene Schicht', () => {
    const corrections = roster.handschrift!.filter(entry => entry.art === 'korrektur');
    expect(corrections.some(c => c.ersatz === null)).toBe(true);
    expect(corrections.some(c => typeof c.ersatz === 'string')).toBe(true);
  });

  it('ordnet jeden handschriftlichen Eintrag nur Bildern dieser Variante zu', () => {
    for (const entry of roster.handschrift!) {
      expect(entry.dateien.length).toBeGreaterThan(0);
      for (const file of entry.dateien) expect(roster.dateien).toContain(file);
    }
  });
});
