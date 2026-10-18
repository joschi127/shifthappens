/**
 * Hilfsfunktionen für frei eingegebene Listen-Einträge
 * (Name im Dienstplan, Schichtkürzel, Kürzel ohne Eintrag).
 */

export function normalizeEntry(entry: string): string {
  return entry.trim().replace(/\s+/g, ' ');
}

// Vergleich ohne Groß-/Kleinschreibung, Umlaute bleiben unterscheidbar
export function sameEntry(a: string, b: string): boolean {
  return normalizeEntry(a).toLocaleLowerCase('de-DE') === normalizeEntry(b).toLocaleLowerCase('de-DE');
}

export function addUniqueEntry(list: string[], entry: string): string[] {
  const normalized = normalizeEntry(entry);
  if (!normalized || list.some(existing => sameEntry(existing, normalized))) {
    return list;
  }
  return [...list, normalized];
}
