import { describe, expect, it } from 'vitest';
import { reachesNextDay, shiftParts } from './shiftParts';

describe('shiftParts', () => {
  it('Tagdienst bleibt am selben Tag', () => {
    expect(shiftParts({ startTime: '07:00', endTime: '15:30' })).toEqual([
      { part: 'main', start: '07:00', end: '15:30', startDay: 0, endDay: 0, minutes: 510 }
    ]);
  });

  it('klassische Nachtschicht über Mitternacht', () => {
    const [main] = shiftParts({ startTime: '22:00', endTime: '06:00' });
    expect(main).toMatchObject({ startDay: 0, endDay: 1, minutes: 480 });
  });

  it('Ende genau um 00:00 zählt zum selben Tag', () => {
    expect(reachesNextDay({ startTime: '16:00', endTime: '00:00' })).toBe(false);
  });

  it('N01 + B11 + F02: Bereitschaft über Mitternacht, zweiter Teil am Folgetag', () => {
    const parts = shiftParts({
      startTime: '17:30', endTime: '23:57',
      isNightStandby: true, nightStandbyStartTime: '23:57', nightStandbyEndTime: '05:57',
      isSplitShift: true, splitStartTime: '05:57', splitEndTime: '07:15'
    });
    expect(parts.map(p => [p.part, p.startDay, p.endDay])).toEqual([['main', 0, 0], ['standby', 0, 1], ['split', 1, 1]]);
  });

  it('N06 + B11 + F02: über 25 Stunden, jeder Teil unter 24 Stunden', () => {
    const parts = shiftParts({
      startTime: '05:57', endTime: '23:57',
      isNightStandby: true, nightStandbyStartTime: '23:57', nightStandbyEndTime: '05:57',
      isSplitShift: true, splitStartTime: '05:57', splitEndTime: '07:15'
    });
    expect(parts.map(p => [p.part, p.startDay, p.endDay])).toEqual([['main', 0, 0], ['standby', 0, 1], ['split', 1, 1]]);
    expect(parts.reduce((sum, p) => sum + p.minutes, 0)).toBe(18 * 60 + 6 * 60 + 78);
  });

  it('zweiter Teil ohne Bereitschaft am selben Tag (geteilter Dienst)', () => {
    const parts = shiftParts({ startTime: '06:00', endTime: '10:00', isSplitShift: true, splitStartTime: '16:00', splitEndTime: '20:00' });
    expect(parts[1]).toMatchObject({ part: 'split', startDay: 0, endDay: 0 });
  });

  it('Abwesenheiten haben keine Teile', () => {
    expect(shiftParts({ kind: 'absence', startTime: '', endTime: '' })).toEqual([]);
  });
});
