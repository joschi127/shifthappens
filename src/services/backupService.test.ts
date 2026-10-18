import { beforeEach, describe, expect, it } from 'vitest';
import { db, ShiftType } from '../db';
import { BACKUP_VERSION, collectBackup, isValidBackup, restoreBackup } from './backupService';

const earlyType: ShiftType = {
  id: 1,
  name: 'Frühdienst',
  startTime: '06:00',
  endTime: '14:00',
  color: '#3880ff',
  order: 0,
  isSplitShift: false,
  hasNightStandby: false,
  codes: ['F']
};

const profile = { key: 'profile' as const, value: { rosterNames: ['Anna Müller'], ignoreCodes: ['X'] } };

beforeEach(async () => {
  await db.shifts.clear();
  await db.shiftTypes.clear();
  await db.importSettings.clear();
});

describe('collectBackup', () => {
  it('enthält alle Tabellen inklusive Import-Einstellungen', async () => {
    await db.shiftTypes.add(earlyType);
    await db.importSettings.put(profile);

    const backup = await collectBackup('2026-10-18T10:00:00.000Z');

    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.timestamp).toBe('2026-10-18T10:00:00.000Z');
    expect(backup.tables.shiftTypes).toEqual([earlyType]);
    expect(backup.tables.importSettings).toEqual([profile]);
  });
});

describe('isValidBackup', () => {
  it('akzeptiert Backups der Version 1 ohne importSettings', () => {
    expect(isValidBackup({ version: 1, tables: { shifts: [], shiftTypes: [] } })).toBe(true);
  });

  it('lehnt Daten ohne Tabellen ab', () => {
    expect(isValidBackup({})).toBe(false);
    expect(isValidBackup({ tables: { shifts: [] } })).toBe(false);
    expect(isValidBackup(null)).toBe(false);
  });
});

describe('restoreBackup', () => {
  it('ersetzt alle Tabellen bei einem Backup der Version 2', async () => {
    await db.importSettings.put({ key: 'profile', value: { rosterNames: ['Alt'], ignoreCodes: [] } });

    await restoreBackup({
      version: 2,
      tables: { shifts: [], shiftTypes: [earlyType], importSettings: [profile] }
    });

    expect(await db.shiftTypes.toArray()).toEqual([earlyType]);
    expect(await db.importSettings.toArray()).toEqual([profile]);
  });

  it('behält lokale Import-Einstellungen bei einem Backup der Version 1', async () => {
    await db.importSettings.put(profile);

    await restoreBackup({ version: 1, tables: { shifts: [], shiftTypes: [earlyType] } });

    expect(await db.shiftTypes.toArray()).toEqual([earlyType]);
    expect(await db.importSettings.toArray()).toEqual([profile]);
  });

  it('entfernt Schichtkürzel, wenn ein Backup der Version 1 Vorlagen ohne Kürzel enthält', async () => {
    await db.shiftTypes.add(earlyType);
    const { codes, ...legacyType } = earlyType;

    await restoreBackup({ version: 1, tables: { shifts: [], shiftTypes: [legacyType] } });

    expect((await db.shiftTypes.get(1))?.codes).toBeUndefined();
  });
});
