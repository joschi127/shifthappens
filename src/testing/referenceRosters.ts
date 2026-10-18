/// <reference types="node" />
/**
 * Zugriff auf die Referenz-Dienstpläne in docs/beispiele/dienstplaene (nur für Tests).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const REFERENCE_ROSTER_DIR = fileURLToPath(new URL('../../docs/beispiele/dienstplaene/', import.meta.url));

export interface ReferenceRosterLegendEntry {
  code: string;
  bezeichnung: string;
  beginn?: string;
  ende?: string;
}

export interface ReferenceRosterRow {
  name?: string;     // fehlt bei Plänen ohne Namensspalte (nur Kürzel)
  kuerzel?: string;  // fehlt bei Plänen ohne Kürzelspalte
  codes: string[];   // Dienst je Tag ("" = leer)
  // Nur bei Plänen mit Unterzeilen je Person (D/S/B/A/E)
  sonder?: string[];
  bereitschaft?: string[];
  anfang?: string[];
  ende?: string[];
  summen?: { istGut: string; soll: string; uebertrag: string };
}

export interface ReferenceRosterHandwriting {
  art: 'notiz' | 'korrektur';
  dateien: string[];          // Bilder, auf denen der Eintrag zu sehen ist
  // Notiz
  text?: string;
  position?: string;
  unsicher?: boolean;
  // Korrektur eines gedruckten Dienstes
  name?: string;
  tag?: number;
  gedruckt?: string;
  durchgestrichen?: boolean;
  zeitenDurchgestrichen?: boolean;
  ersatz?: string | null;     // null = ersatzlos gestrichen
  ersatzPosition?: string;
  erwarteteAufloesung?: string;  // Kürzel, auf das ein unvollständiger Ersatz aufgelöst werden soll
  hinweis?: string;
}

export interface ReferenceRoster {
  beschreibung: string;
  dateien: string[];
  titel: string;
  jahr: number;
  monat: number;
  tage: number;
  ersterWochentag: string;
  planbereich?: string;
  zeitraum?: { von: string; bis: string };
  planstatus?: string;
  unterzeilen?: Record<string, string>;
  legende?: ReferenceRosterLegendEntry[];
  zeilen: ReferenceRosterRow[];
  // Je Bild: Ecken des Tagesrasters (oben links, oben rechts, unten rechts, unten links) und ggf. Drehung,
  // für die Simulation in scripts/poc-lokale-erkennung/
  auswertung?: Record<string, { ecken: [number, number][]; drehung?: number }>;
  // Varianten, die einen anderen Plan nur anders abbilden (z. B. mit Handschrift)
  basis?: string;
  handschrift?: ReferenceRosterHandwriting[];
}

export function loadReferenceRoster(variant: string): ReferenceRoster {
  const data = JSON.parse(readFileSync(`${REFERENCE_ROSTER_DIR}${variant}.erwartet.json`, 'utf-8'));
  if (!data.basis) {
    return data;
  }
  // Gedruckte Werte kommen aus der Basisvariante, Dateien und Handschrift aus dieser Variante
  return { ...loadReferenceRoster(data.basis), ...data };
}
