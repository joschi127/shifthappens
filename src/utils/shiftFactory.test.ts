import { describe, expect, it } from 'vitest';
import { ShiftType } from '../db';
import { shiftFromType } from './shiftFactory';

const nightType: ShiftType = {
  id: 7,
  name: 'Nachtdienst',
  startTime: '21:00',
  endTime: '23:00',
  color: '#000000',
  order: 2,
  isSplitShift: false,
  defaultPauseMinutes: 0,
  hasNightStandby: true,
  nightStandbyStartTime: '23:00',
  nightStandbyEndTime: '06:00',
  nightStandbyPercentage: 25,
  codes: ['N']
};

describe('shiftFromType', () => {
  it('übernimmt Zeiten und Optionen der Vorlage', () => {
    expect(shiftFromType(nightType, '2026-11-03')).toEqual({
      date: '2026-11-03',
      shiftTypeId: 7,
      name: 'Nachtdienst',
      startTime: '21:00',
      endTime: '23:00',
      pauseMinutes: 0,
      isNightStandby: true,
      nightStandbyStartTime: '23:00',
      nightStandbyEndTime: '06:00',
      notes: '',
      isSplitShift: false,
      splitStartTime: undefined,
      splitEndTime: undefined
    });
  });

  it('setzt fehlende Standardpause auf 0', () => {
    expect(shiftFromType({ ...nightType, defaultPauseMinutes: undefined }, '2026-11-03').pauseMinutes).toBe(0);
  });
});
