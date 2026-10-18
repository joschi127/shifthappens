import { describe, expect, it } from 'vitest';
import { ShiftType } from '../db';
import { DayReading, resolveShifts } from './resolveShifts';
import { planImport } from './importPlan';

const base = { color: '#000', isSplitShift: false, hasNightStandby: false, startTime: '07:00', endTime: '15:30' };
const templates: ShiftType[] = [
  { ...base, id: 1, order: 0, name: 'Frühdienst', codes: ['F01'] },
  { ...base, id: 2, order: 1, name: 'Spätdienst', codes: ['S04'] },
  { ...base, id: 3, order: 2, name: 'Nachtdienst', codes: ['N01 + B11 + F02'], startTime: '17:30', endTime: '23:57',
    hasNightStandby: true, nightStandbyStartTime: '23:57', nightStandbyEndTime: '05:57', isSplitShift: true, splitStartTime: '05:57', splitEndTime: '07:15' },
  { ...base, id: 4, order: 3, name: 'Nacht ohne Folgetag', codes: ['N01'] },
  { ...base, id: 5, order: 4, name: 'Urlaub', kind: 'absence', codes: ['U'], startTime: '', endTime: '' }
];

const sure = (value: string) => ({ value, uncertain: false, raw: value });
const unsure = (suggestion: string, raw = '') => ({ value: '', uncertain: true, suggestion, raw });
const day = (duty: ReturnType<typeof sure>, extra: Partial<DayReading> = {}): DayReading => ({ duty, ...extra });
const opts = { templates, ignoreCodes: ['X'], year: 2026, month: 11 };

describe('resolveShifts', () => {
  it('ordnet einzelne Kürzel den Vorlagen zu und ignoriert "frei" und Kürzel ohne Eintrag', () => {
    const r = resolveShifts([day(sure('F01')), day(sure('')), day(sure('X')), day(sure('S04'))], opts);
    expect(r.map(d => d.items.map(i => i.shiftTypeId))).toEqual([[1], [], [], [2]]);
    expect(r[0].date).toBe('2026-11-01');
  });

  it('fasst N01 + B11 + F02 zu einer Schicht zusammen, wenn die Bereitschaft passt', () => {
    const r = resolveShifts([
      day(sure('N01'), { standby: { labelled: true, raw: 'B11' } }),
      day(sure('F02'))
    ], opts);
    expect(r[0].items).toEqual([expect.objectContaining({ shiftTypeId: 3, spansNextDay: true, status: 'ok' })]);
    expect(r[1].consumedByPrevious).toBe(true);
    expect(r[1].items).toEqual([]);
  });

  it('nimmt die einzelne Vorlage, wenn auf N01 nicht F02 folgt', () => {
    const r = resolveShifts([day(sure('N01'), { standby: { labelled: true, raw: 'B11' } }), day(sure('S04'))], opts);
    expect(r.map(d => d.items.map(i => i.shiftTypeId))).toEqual([[4], [2]]);
  });

  it('übernimmt Abwesenheiten zusätzlich zur Dienstzeile', () => {
    const r = resolveShifts([day(sure(''), { absence: sure('U') }), day(sure('F01'), { absence: sure('U') })], opts);
    expect(r.map(d => d.items.map(i => i.shiftTypeId))).toEqual([[5], [5, 1]]);
  });

  it('markiert unsichere Zellen und nutzt den Vorschlag', () => {
    const [d0] = resolveShifts([day(unsure('F01'))], opts);
    expect(d0.items[0]).toMatchObject({ shiftTypeId: 1, status: 'uncertain', review: expect.any(String) });
  });

  it('löst unvollständige Kürzel über die erste passende Vorlage auf und markiert sie', () => {
    const [d0] = resolveShifts([day(unsure('', 'S'))], opts);
    expect(d0.items[0]).toMatchObject({ shiftTypeId: 2, status: 'uncertain', review: 'Unvollständiges Kürzel „S“ – bitte prüfen' });
  });

  it('meldet unbekannte Kürzel ohne Zuordnung', () => {
    const [d0] = resolveShifts([day(sure('Q7'))], opts);
    expect(d0.items[0]).toMatchObject({ code: 'Q7', status: 'unknown' });
    expect(d0.items[0].shiftTypeId).toBeUndefined();
  });
});

describe('planImport', () => {
  const proposals = resolveShifts([day(sure('F01')), day(sure('S04')), day(sure(''))], opts);

  it('legt neue Schichten als importiert an', () => {
    const plan = planImport(proposals, templates, [], 'imp-1', '2026-10-18T10:00:00.000Z');
    expect(plan.planned.map(p => [p.shift.date, p.shift.shiftTypeId, p.shift.source, p.include])).toEqual([
      ['2026-11-01', 1, 'import', true], ['2026-11-02', 2, 'import', true]
    ]);
    expect(plan.removals).toEqual([]);
  });

  it('überschreibt früher importierte Schichten, entfernt entfallene und lässt manuelle unangetastet', () => {
    const existing = [
      { id: 10, date: '2026-11-01', kind: 'shift', source: 'import', importedAt: 'alt', lastChangeBy: 'manual', name: 'Spät', startTime: '', endTime: '', pauseMinutes: 0, isNightStandby: false, notes: '', isSplitShift: false },
      { id: 11, date: '2026-11-03', kind: 'shift', source: 'import', name: 'Früh', startTime: '', endTime: '', pauseMinutes: 0, isNightStandby: false, notes: '', isSplitShift: false },
      { id: 12, date: '2026-11-02', kind: 'shift', source: 'manual', name: 'Eigene', startTime: '', endTime: '', pauseMinutes: 0, isNightStandby: false, notes: '', isSplitShift: false },
      { id: 13, date: '2026-12-01', kind: 'shift', source: 'import', name: 'Anderer Monat', startTime: '', endTime: '', pauseMinutes: 0, isNightStandby: false, notes: '', isSplitShift: false }
    ] as const;
    const plan = planImport(proposals, templates, existing as any, 'imp-2');
    const first = plan.planned[0];
    expect(first.shift).toMatchObject({ id: 10, importedAt: 'alt', shiftTypeId: 1 });
    expect(first.manuallyChanged).toBe(true);
    expect(plan.planned[1]).toMatchObject({ include: false, manualConflicts: [expect.objectContaining({ id: 12 })] });
    expect(plan.removals.map(s => s.id)).toEqual([11]);
  });
});
