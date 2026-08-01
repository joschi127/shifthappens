import { db } from '../db';
import { markLocalModified } from './googleDriveService';

export async function exportDatabase() {
  const shifts = await db.shifts.toArray();
  const shiftTypes = await db.shiftTypes.toArray();

  const data = {
    version: 1,
    tables: {
      shifts,
      shiftTypes
    }
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `schichtator_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importDatabase(jsonString: string) {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.tables || !data.tables.shifts || !data.tables.shiftTypes) {
      throw new Error('Ungültiges Backup-Format');
    }

    await db.transaction('rw', db.shifts, db.shiftTypes, async () => {
      // Clear existing data
      await db.shifts.clear();
      await db.shiftTypes.clear();

      // Import data
      await db.shifts.bulkAdd(data.tables.shifts);
      await db.shiftTypes.bulkAdd(data.tables.shiftTypes);
    });

    markLocalModified();
    
    return { success: true };
  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, error };
  }
}
