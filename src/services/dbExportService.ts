import { markLocalModified } from './googleDriveService';
import { collectBackup, isValidBackup, restoreBackup } from './backupService';

export async function exportDatabase() {
  const data = await collectBackup(new Date().toISOString());

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `shifthappens_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importDatabase(jsonString: string) {
  try {
    const data = JSON.parse(jsonString);

    if (!isValidBackup(data)) {
      throw new Error('Ungültiges Backup-Format');
    }

    await restoreBackup(data);

    markLocalModified();

    return { success: true };
  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, error };
  }
}
