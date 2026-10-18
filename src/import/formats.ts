/**
 * Bekannte Aufbauten eines Personenblocks im Dienstplan (Import-Vorlagen, ADR 0003).
 */
import { ImportTemplate } from '../db';
import { Quad } from './geometry';

export const IMPORT_FORMATS: ImportTemplate[] = [
  { id: 'unterzeilen-dsbae', name: 'Fünf Unterzeilen je Person (Dienst, Sonder, Bereitschaft, Anfang, Ende)', orientation: 'horizontal',
    subRows: 5, dutyRow: 0, absenceRow: 1, standbyRow: 2, blockRatio: 2.9 },
  { id: 'einzeilig', name: 'Eine Zeile pro Person', orientation: 'horizontal', subRows: 1, dutyRow: 0, blockRatio: 0.8 }
];

// Gespeicherte Werte (z. B. gelerntes blockRatio) über die Standardwerte legen
export function mergeFormats(saved: ImportTemplate[]): ImportTemplate[] {
  return IMPORT_FORMATS.map(f => ({ ...f, ...saved.find(s => s.id === f.id) }));
}

/**
 * Seitenverhältnis (Blockhöhe ÷ Spaltenbreite) eines bestätigten Blocks, auf zwei Stellen gerundet.
 * Weicht es stark vom Standardwert des Aufbaus ab (z. B. versehentlich verschobene Ecke oder falscher
 * Aufbau gewählt), wird es nicht gelernt (null), damit die nächste automatische Suche nicht danebenliegt.
 */
export function learnedBlockRatio(corners: Quad, days: number, format: ImportTemplate): number | null {
  const [tl, tr, br, bl] = corners;
  const width = (Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) + Math.hypot(br[0] - bl[0], br[1] - bl[1])) / 2;
  const height = (Math.hypot(bl[0] - tl[0], bl[1] - tl[1]) + Math.hypot(br[0] - tr[0], br[1] - tr[1])) / 2;
  if (!(width > 0) || !(height > 0) || days < 1) return null;
  const ratio = Math.round((height / (width / days)) * 100) / 100;
  const standard = IMPORT_FORMATS.find(f => f.id === format.id)?.blockRatio ?? format.blockRatio;
  if (standard && (ratio < standard * 0.6 || ratio > standard * 1.6)) return null;
  return ratio;
}
