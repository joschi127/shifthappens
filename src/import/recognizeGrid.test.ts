import { describe, expect, it } from 'vitest';
import { downgradeShortCodes } from './recognizeGrid';

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
