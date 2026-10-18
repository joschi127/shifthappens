import { describe, expect, it } from 'vitest';
import { ShiftType } from '../db';
import { shiftFromType } from './shiftFactory';

const NOW = '2026-10-18T10:00:00.000Z';

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

const vacation: ShiftType = {
  id: 9, kind: 'absence', name: 'Urlaub', startTime: '08:00', endTime: '16:00', color: '#4caf50', order: 5,
  isSplitShift: false, hasNightStandby: false, codes: ['U']
};

describe('shiftFromType', () => {
  it('übernimmt Zeiten und Optionen der Vorlage und setzt die Herkunft', () => {
    expect(shiftFromType(nightType, '2026-11-03', { source: 'manual', now: NOW })).toEqual({
      date: '2026-11-03',
      kind: 'shift',
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
      splitEndTime: undefined,
      source: 'manual',
      createdAt: NOW,
      updatedAt: NOW,
      lastChangeBy: 'manual'
    });
  });

  it('setzt fehlende Standardpause auf 0', () => {
    expect(shiftFromType({ ...nightType, defaultPauseMinutes: undefined }, '2026-11-03').pauseMinutes).toBe(0);
  });

  it('legt Abwesenheiten ganztägig ohne Uhrzeiten an', () => {
    expect(shiftFromType(vacation, '2026-11-04', { source: 'manual', now: NOW })).toMatchObject({
      kind: 'absence', name: 'Urlaub', startTime: '', endTime: '', pauseMinutes: 0, isNightStandby: false, isSplitShift: false
    });
  });

  it('kennzeichnet importierte Schichten mit Importzeitpunkt und Import-ID', () => {
    expect(shiftFromType(nightType, '2026-11-03', { source: 'import', importId: 'imp-1', now: NOW })).toMatchObject({
      source: 'import', importId: 'imp-1', importedAt: NOW, lastChangeBy: 'import'
    });
  });
});
