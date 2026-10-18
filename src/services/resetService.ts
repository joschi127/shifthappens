import { db } from '../db';
import { deleteCloudBackup, logoutFromGoogle } from './googleDriveService';

/**
 * Alle Daten und Einstellungen dieses Geräts löschen: Schichten, Vorlagen, Import-Einstellungen (IndexedDB)
 * sowie Design, Google-Verbindung und Sync-Status (localStorage).
 *
 * - Mit includeCloud wird zuerst die Sicherung im Google Drive gelöscht. Schlägt das fehl, wird abgebrochen
 *   und auf dem Gerät bleibt alles erhalten (kein halb gelöschter Zustand).
 * - Die Google-Verbindung wird vor dem lokalen Löschen getrennt (Zugriff widerrufen, automatischer Sync gestoppt),
 *   damit kein leerer Stand ins Drive hochgeladen wird. Ohne includeCloud bleibt die Sicherung im Drive erhalten;
 *   wer sich später neu verbindet, bekommt sie beim ersten Sync zurück.
 * - Die vom Service Worker gecachten App-Dateien (inkl. Texterkennung) sind keine persönlichen Daten und bleiben,
 *   damit die App offline startfähig bleibt.
 *
 * Danach muss die App neu geladen werden, weil Dienste ihren Zustand beim Start aus dem Speicher lesen.
 */
export async function deleteAllLocalData(options: { includeCloud?: boolean } = {}): Promise<void> {
  if (options.includeCloud) await deleteCloudBackup();
  logoutFromGoogle();
  db.close();
  await db.delete();
  localStorage.clear();
  sessionStorage.clear();
}
