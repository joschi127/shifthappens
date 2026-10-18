import { describe, expect, it } from 'vitest';
import { formatShiftCode, matchesStandby, normalizeShiftCode, parseShiftCode, sameShiftCode } from './shiftCodes';

describe('parseShiftCode', () => {
  it('erkennt einzelne Kürzel', () => {
    expect(parseShiftCode('F01')).toEqual({ type: 'single', code: 'F01' });
    expect(parseShiftCode('////')).toEqual({ type: 'single', code: '////' });
  });

  it('erkennt Kombinationen über zwei Tage, mit und ohne Bereitschaft', () => {
    expect(parseShiftCode('N01+F02')).toEqual({ type: 'combo', first: 'N01', second: 'F02' });
    expect(parseShiftCode(' N01 +  B11 + F02 ')).toEqual({ type: 'combo', first: 'N01', standby: 'B11', second: 'F02' });
  });

  it('lehnt leere Teile und mehr als drei Teile ab', () => {
    expect(parseShiftCode('N01 + ')).toBeNull();
    expect(parseShiftCode('A + B + C + D')).toBeNull();
  });
});

describe('normalizeShiftCode / sameShiftCode', () => {
  it('vereinheitlicht die Leerzeichen um "+"', () => {
    expect(normalizeShiftCode('N01+B11 +F02')).toBe('N01 + B11 + F02');
    expect(formatShiftCode({ type: 'combo', first: 'N01', second: 'F02' })).toBe('N01 + F02');
  });

  it('vergleicht unabhängig von Schreibweise und Groß-/Kleinschreibung', () => {
    expect(sameShiftCode('n01+f02', 'N01 + F02')).toBe(true);
    expect(sameShiftCode('N01', 'N01 + F02')).toBe(false);
  });
});

describe('matchesStandby', () => {
  it('prüft konkrete Kürzel und den Platzhalter', () => {
    expect(matchesStandby('B11', 'B11')).toBe(true);
    expect(matchesStandby('B11', 'RB')).toBe(false);
    expect(matchesStandby('B*', 'RB2')).toBe(true);
    expect(matchesStandby('B*', '')).toBe(false);
  });
});
