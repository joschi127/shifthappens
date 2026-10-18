import { db, Shift, ShiftType, ImportSetting } from '../db';

// Version 2: Tabelle importSettings (Dienstplan-Import) ergänzt
export const BACKUP_VERSION = 2;

export interface BackupData {
  version: number;
  timestamp?: string;
  tables: {
    shifts: Shift[];
    shiftTypes: ShiftType[];
    importSettings?: ImportSetting[];
  };
}

export function isValidBackup(data: any): data is BackupData {
  return !!data?.tables && Array.isArray(data.tables.shifts) && Array.isArray(data.tables.shiftTypes);
}

export async function collectBackup(timestamp?: string): Promise<BackupData> {
  const [shifts, shiftTypes, importSettings] = await Promise.all([
    db.shifts.toArray(),
    db.shiftTypes.toArray(),
    db.importSettings.toArray()
  ]);

  return {
    version: BACKUP_VERSION,
    timestamp,
    tables: { shifts, shiftTypes, importSettings }
  };
}

/**
 * Ersetzt den lokalen Datenbestand durch ein Backup.
 * Ältere Backups (Version 1) enthalten keine importSettings – in diesem Fall
 * bleiben die lokalen Import-Einstellungen erhalten, statt gelöscht zu werden.
 */
export async function restoreBackup(backup: BackupData): Promise<void> {
  const { shifts, shiftTypes, importSettings } = backup.tables;

  await db.transaction('rw', db.shifts, db.shiftTypes, db.importSettings, async () => {
    await db.shifts.clear();
    await db.shiftTypes.clear();
    await db.shifts.bulkAdd(shifts);
    await db.shiftTypes.bulkAdd(shiftTypes);

    if (importSettings) {
      await db.importSettings.clear();
      await db.importSettings.bulkAdd(importSettings);
    }
  });
}
