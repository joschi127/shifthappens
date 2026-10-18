import { describe, expect, it } from 'vitest';
import { IMPORT_FORMATS, learnedBlockRatio } from './formats';

const fiveRows = IMPORT_FORMATS[0];
const blockOf = (height: number) => [[0, 0], [3100, 0], [3100, height], [0, height]] as [number, number][];

describe('learnedBlockRatio', () => {
  it('lernt das Seitenverhältnis eines bestätigten Blocks (Höhe ÷ Spaltenbreite)', () => {
    expect(learnedBlockRatio(blockOf(310) as any, 31, fiveRows)).toBe(3.1);
  });

  it('lernt nichts bei stark abweichendem Verhältnis oder unbrauchbaren Ecken', () => {
    expect(learnedBlockRatio(blockOf(100) as any, 31, fiveRows)).toBeNull();
    expect(learnedBlockRatio(blockOf(900) as any, 31, fiveRows)).toBeNull();
    expect(learnedBlockRatio([[0, 0], [0, 0], [0, 0], [0, 0]], 31, fiveRows)).toBeNull();
  });
});
