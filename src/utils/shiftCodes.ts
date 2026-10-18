/**
 * Schichtkürzel an Vorlagen (ADR 0002, 0013): einzelnes Kürzel oder Kombination über zwei Tage.
 *   "N01"             einzelner Dienst
 *   "N01 + F02"       Dienst an Tag 1 und Folgetag
 *   "N01 + B11 + F02" wie oben, zusätzlich Bereitschaftskürzel an Tag 1 ("B*" = beliebiger Eintrag)
 */
import { normalizeEntry, sameEntry } from './tagList';

export type ParsedShiftCode =
  | { type: 'single'; code: string }
  | { type: 'combo'; first: string; standby?: string; second: string };

export const isStandbyWildcard = (code: string): boolean => /^[^\s]*\*$/.test(code);

// null = ungültige Schreibweise (leere Teile oder mehr als drei Teile)
export function parseShiftCode(entry: string): ParsedShiftCode | null {
  const parts = entry.split('+').map(normalizeEntry);
  if (parts.some(p => p === '')) return null;
  if (parts.length === 1) return { type: 'single', code: parts[0] };
  if (parts.length === 2) return { type: 'combo', first: parts[0], second: parts[1] };
  if (parts.length === 3) return { type: 'combo', first: parts[0], standby: parts[1], second: parts[2] };
  return null;
}

export function formatShiftCode(code: ParsedShiftCode): string {
  return code.type === 'single'
    ? code.code
    : [code.first, code.standby, code.second].filter(Boolean).join(' + ');
}

// Einheitliche Schreibweise (Leerzeichen um "+"); ungültige Einträge bleiben nur bereinigt
export function normalizeShiftCode(entry: string): string {
  const parsed = parseShiftCode(entry);
  return parsed ? formatShiftCode(parsed) : normalizeEntry(entry);
}

export function sameShiftCode(a: string, b: string): boolean {
  return sameEntry(normalizeShiftCode(a), normalizeShiftCode(b));
}

// Passt ein Eintrag der Bereitschaftszeile zum Muster der Vorlage?
export function matchesStandby(pattern: string, value: string): boolean {
  if (!value) return false;
  return isStandbyWildcard(pattern) || sameEntry(pattern, value);
}
