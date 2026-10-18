import Dexie, { Table } from 'dexie';

// Art einer Vorlage bzw. Schicht: Schicht mit Uhrzeiten oder ganztägige Abwesenheit (ADR 0012).
// Fehlt der Wert, gilt 'shift' (ältere Daten).
export type ShiftKind = 'shift' | 'absence';

export interface ShiftType {
  id?: number;
  kind?: ShiftKind;
  name: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  color: string;     // Hex color
  order: number;
  isSplitShift: boolean;
  splitStartTime?: string;
  splitEndTime?: string;
  defaultPauseMinutes?: number;
  hasNightStandby: boolean;
  nightStandbyStartTime?: string;
  nightStandbyEndTime?: string;
  nightStandbyPercentage?: number;
  codes?: string[];  // Schichtkürzel wie auf dem Papier-Dienstplan (z. B. "F", "F1", "N01 + B11 + F02", ADR 0013)
}

// Herkunft und Prüfhinweis einer Schicht (ADR 0014). Fehlende Werte gelten als "manuell, ohne Verlauf".
export type ShiftSource = 'manual' | 'import';

export interface ShiftReview {
  reason: string;
  since: string;  // ISO-Zeitpunkt
}

export interface Shift {
  id?: number;
  date: string;       // ISO Date String (YYYY-MM-DD)
  kind?: ShiftKind;   // aus der Vorlage übernommen; bei 'absence' sind die Uhrzeiten leer
  shiftTypeId?: number;
  name: string;       // Fallback or custom name
  startTime: string;
  endTime: string;
  pauseMinutes: number;
  isNightStandby: boolean;
  nightStandbyStartTime?: string;
  nightStandbyEndTime?: string;
  notes: string;
  isSplitShift: boolean;
  splitStartTime?: string;
  splitEndTime?: string;
  source?: ShiftSource;
  createdAt?: string;
  importedAt?: string;     // erster Import dieser Schicht
  importId?: string;       // Importvorgang, der die Schicht zuletzt geschrieben hat
  updatedAt?: string;
  lastChangeBy?: ShiftSource;
  review?: ShiftReview;    // "zu prüfen" (gelbes ?!), entfernt per "Geprüft"
}

// Normierte Bildkoordinaten (0..1), damit eine Vorlage unabhängig von der Fotoauflösung passt
export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface ImportTemplate {
  id: string;
  name: string;
  orientation: 'horizontal' | 'vertical';
  // Aufbau eines Personenblocks: Anzahl Unterzeilen und Rolle der Zeilen (PRD Dienstplan-Import)
  subRows?: number;
  dutyRow?: number;
  absenceRow?: number;
  standbyRow?: number;
  // Blockhöhe ÷ Spaltenbreite, beim Bestätigen der Ecken gelernt (für die automatische Blocksuche)
  blockRatio?: number;
  lastUsed?: boolean;      // zuletzt genutztes Format, wird beim nächsten Import vorgeschlagen
  // Ecken des eigenen Streifens: oben links, oben rechts, unten rechts, unten links
  region?: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint];
  // Anteil der Namenszelle am Streifen (0..1), wird vor der Erkennung abgeschnitten
  nameCellFraction?: number;
}

export interface ImportProfile {
  rosterNames: string[];  // Name/Kürzel, wie man im Dienstplan geführt wird
  ignoreCodes: string[];  // Kürzel, die keinen Eintrag erzeugen (frei, Urlaub, krank, ...)
}

export interface ImportSettingsMap {
  profile: ImportProfile;
  templates: ImportTemplate[];
}

export type ImportSetting = {
  [K in keyof ImportSettingsMap]: { key: K; value: ImportSettingsMap[K] }
}[keyof ImportSettingsMap];

export class MyDatabase extends Dexie {
  shifts!: Table<Shift>;
  shiftTypes!: Table<ShiftType>;
  importSettings!: Table<ImportSetting, string>;

  constructor() {
    super('ShiftHappensDB');
    
    this.version(3).stores({
      shifts: '++id, date, shiftTypeId',
      shiftTypes: '++id, name'
    });

    this.version(4).stores({
      shiftTypes: '++id, name, order'
    }).upgrade(async tx => {
      const types = await tx.table('shiftTypes').toArray();
      // Bestehende Schichten initial sortieren und order zuweisen
      types.sort((a, b) => {
        const startA = a.startTime || '00:00';
        const startB = b.startTime || '00:00';
        const startCompare = startA.localeCompare(startB);
        if (startCompare !== 0) return startCompare;
        
        const endA = a.isSplitShift && a.splitEndTime ? a.splitEndTime : (a.endTime || '00:00');
        const endB = b.isSplitShift && b.splitEndTime ? b.splitEndTime : (b.endTime || '00:00');
        return endA.localeCompare(endB);
      });
      
      for (let i = 0; i < types.length; i++) {
        if (types[i].id !== undefined) {
          await tx.table('shiftTypes').update(types[i].id, { order: i });
        }
      }
    });

    this.version(5).stores({
      importSettings: 'key'
    });
  }
}

export const db = new MyDatabase();
