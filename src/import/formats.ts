/**
 * Bekannte Aufbauten eines Personenblocks im Dienstplan (Import-Vorlagen, ADR 0003).
 */
import { ImportTemplate } from '../db';

export const IMPORT_FORMATS: ImportTemplate[] = [
  { id: 'unterzeilen-dsbae', name: 'Fünf Unterzeilen je Person (Dienst, Sonder, Bereitschaft, Anfang, Ende)', orientation: 'horizontal',
    subRows: 5, dutyRow: 0, absenceRow: 1, standbyRow: 2, blockRatio: 2.9 },
  { id: 'einzeilig', name: 'Eine Zeile pro Person', orientation: 'horizontal', subRows: 1, dutyRow: 0, blockRatio: 0.8 }
];

// Gespeicherte Werte (z. B. gelerntes blockRatio) über die Standardwerte legen
export function mergeFormats(saved: ImportTemplate[]): ImportTemplate[] {
  return IMPORT_FORMATS.map(f => ({ ...f, ...saved.find(s => s.id === f.id) }));
}
