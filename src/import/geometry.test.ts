import { describe, expect, it } from 'vitest';
import { Quad, neighborBlocks, quadSlice } from './geometry';

const block: Quad = [[100, 200], [700, 200], [700, 260], [100, 260]];

describe('quadSlice', () => {
  it('verlängert ein Rechteck um ganze Blockhöhen', () => {
    expect(quadSlice(block, -1, 2).map(p => p.map(Math.round))).toEqual([[100, 140], [700, 140], [700, 320], [100, 320]]);
  });

  it('teilt ein perspektivisch verzerrtes Viereck so, dass die Teile wieder zusammenpassen', () => {
    const table: Quad = [[110, 100], [690, 120], [720, 500], [80, 480]];
    const upper = quadSlice(table, 0, 0.5), lower = quadSlice(table, 0.5, 1);
    expect(upper[3][0]).toBeCloseTo(lower[0][0]);
    expect(upper[2][1]).toBeCloseTo(lower[1][1]);
    expect(lower[2][0]).toBeCloseTo(720);
  });
});

describe('neighborBlocks', () => {
  it('nimmt nur Nachbarblöcke, die vollständig im Bild liegen', () => {
    expect(neighborBlocks({ width: 800, height: 600 }, block, 1)).toEqual({ above: 1, below: 1 });
    expect(neighborBlocks({ width: 800, height: 290 }, block, 1)).toEqual({ above: 1, below: 0 });
    expect(neighborBlocks({ width: 800, height: 600 }, block, 3)).toEqual({ above: 3, below: 3 });
    expect(neighborBlocks({ width: 800, height: 600 }, [[100, 20], [700, 20], [700, 80], [100, 80]], 1)).toEqual({ above: 0, below: 1 });
  });
});
