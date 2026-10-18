import { describe, expect, it } from 'vitest';
import { downgradeShortCodes, implausiblePersons } from './recognizeGrid';

const cell = (value: string, uncertain = false) => ({ value, uncertain });

describe('downgradeShortCodes', () => {
  it('stuft ein einbuchstabiges Kürzel in einem Plan mit dreistelligen Kürzeln herab', () => {
    const cells = [cell('S04'), cell('F01'), cell('M05'), cell('S'), cell('-')];
    downgradeShortCodes(cells);
    expect(cells[3]).toEqual({ value: 'S', uncertain: true, suggestion: 'S' });
    expect(cells.filter(c => c.uncertain)).toHaveLength(1);
  });

  it('lässt Pläne mit durchweg einbuchstabigen Kürzeln unverändert', () => {
    const cells = [cell('F'), cell('S'), cell('N'), cell('FB'), cell('–')];
    downgradeShortCodes(cells);
    expect(cells.every(c => !c.uncertain)).toBe(true);
  });
});

describe('implausiblePersons', () => {
  const known = ['F01', 'S04', 'N01'];
  const row = (person: number, values: string[]) => values.map(got => ({ person, got }));

  it('verwirft Hilfsblöcke ohne bekannte Kürzel (z. B. Kopfzeile mit Tageszahlen)', () => {
    const cells = [
      ...row(0, Array.from({ length: 30 }, (_, d) => String(d + 1))),
      ...row(1, Array(30).fill('F01')),
      ...row(2, [...Array(10).fill('S04'), ...Array(20).fill('-')])
    ];
    expect([...implausiblePersons(cells, [0, 2], known, 30)]).toEqual([0]);
  });

  it('prüft nur die angegebenen Hilfsblöcke', () => {
    expect(implausiblePersons(row(0, Array(30).fill('')), [], known, 30).size).toBe(0);
  });
});
