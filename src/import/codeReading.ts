/**
 * Lesungen der Texterkennung bereinigen und auf bekannte Kürzel einrasten (nur eindeutige Fälle).
 */
export const isFreeCode = (value: string): boolean => ['', '-', '–', '—'].includes(value);

export function normalizeReading(text: string): string {
  let s = text.replace(/\s+/g, '').toUpperCase();
  if (/^[/|lI1]{3,}$/.test(s)) return '////';
  if (/^[-–—_~.]+$/.test(s)) return '-';
  // Typische Verwechslungen je nach Position: Buchstabe vorn, Ziffern dahinter (z. B. "SO4" -> "S04")
  if (s.length === 3 && /^[A-Z0-9]{3}$/.test(s)) {
    s = s[0].replace('0', 'O').replace('5', 'S').replace('8', 'B')
      + s.slice(1).replace(/[OQD]/g, '0').replace(/[IL|]/g, '1').replace(/S/g, '5').replace(/B/g, '8');
  }
  return s;
}

const FIRST_LETTER_ALTERNATIVES: Record<string, string> = { S: 'B5', B: 'S8', '5': 'S', '8': 'B' };

/**
 * Auf bekannte Kürzel einrasten. Erlaubt sind nur eindeutige, typische Lesefehler:
 * fehlende Nullen ("F1" -> "F01") und Verwechslung des ersten Buchstabens (S/B/5/8).
 * Liefert '?' wenn nichts oder mehr als ein Kürzel passt. Kein Abstandsabgleich (S04 und S01 sind verschieden).
 */
export function snapToKnown(reading: string, known: string[]): string {
  if (isFreeCode(reading) || known.includes(reading)) return reading;
  const candidates = known.filter(code =>
    code.replace(/0/g, '') === reading.replace(/0/g, '')
    || (code.length === reading.length && code.slice(1) === reading.slice(1) && (FIRST_LETTER_ALTERNATIVES[code[0]] || '').includes(reading[0])));
  return candidates.length === 1 ? candidates[0] : '?';
}

// Erlaubte Zeichen für die Texterkennung aus den bekannten Kürzeln
export const charactersFor = (codes: string[]): string =>
  [...new Set([...codes.join('').replace(/[–—\s]/g, ''), '-'])].join('');
