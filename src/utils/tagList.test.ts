import { describe, expect, it } from 'vitest';
import { addUniqueEntry, normalizeEntry, sameEntry } from './tagList';

describe('normalizeEntry', () => {
  it('entfernt Leerraum am Rand und fasst innere Leerzeichen zusammen', () => {
    expect(normalizeEntry('  Müller,   A. ')).toBe('Müller, A.');
  });
});

describe('sameEntry', () => {
  it('ignoriert Groß-/Kleinschreibung', () => {
    expect(sameEntry('amü', 'AMÜ')).toBe(true);
  });

  it('unterscheidet Umlaute', () => {
    expect(sameEntry('Mueller', 'Müller')).toBe(false);
    expect(sameEntry('Ä', 'A')).toBe(false);
  });
});

describe('addUniqueEntry', () => {
  it('fügt normalisierte Einträge hinzu', () => {
    expect(addUniqueEntry(['F'], ' S ')).toEqual(['F', 'S']);
  });

  it('ignoriert leere Einträge und Duplikate und liefert dann dieselbe Liste zurück', () => {
    const list = ['F'];
    expect(addUniqueEntry(list, '   ')).toBe(list);
    expect(addUniqueEntry(list, 'f')).toBe(list);
  });
});
