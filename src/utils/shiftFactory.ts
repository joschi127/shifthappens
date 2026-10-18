import { Shift, ShiftKind, ShiftSource, ShiftType } from '../db';

export const isAbsence = (item: { kind?: ShiftKind }): boolean => item.kind === 'absence';

export interface ShiftOrigin {
  source: ShiftSource;
  importId?: string;
  now?: string;  // ISO-Zeitpunkt, für Tests überschreibbar
}

// Erzeugt eine Schicht mit den Standardwerten der Vorlage (ADR 0006) und ihrer Herkunft (ADR 0014)
export function shiftFromType(type: ShiftType, date: string, origin: ShiftOrigin = { source: 'manual' }): Shift {
  const now = origin.now ?? new Date().toISOString();
  const provenance: Partial<Shift> = {
    source: origin.source,
    createdAt: now,
    updatedAt: now,
    lastChangeBy: origin.source,
    ...(origin.source === 'import' ? { importedAt: now, importId: origin.importId } : {})
  };

  if (isAbsence(type)) {
    // Abwesenheiten sind ganztägig: keine Uhrzeiten, Pausen, Bereitschaft oder geteilte Schicht (ADR 0012)
    return {
      date,
      kind: 'absence',
      shiftTypeId: type.id,
      name: type.name,
      startTime: '',
      endTime: '',
      pauseMinutes: 0,
      isNightStandby: false,
      notes: '',
      isSplitShift: false,
      ...provenance
    };
  }

  return {
    date,
    kind: 'shift',
    shiftTypeId: type.id,
    name: type.name,
    startTime: type.startTime,
    endTime: type.endTime,
    pauseMinutes: type.defaultPauseMinutes || 0,
    isNightStandby: type.hasNightStandby,
    nightStandbyStartTime: type.nightStandbyStartTime,
    nightStandbyEndTime: type.nightStandbyEndTime,
    notes: '',
    isSplitShift: type.isSplitShift,
    splitStartTime: type.splitStartTime,
    splitEndTime: type.splitEndTime,
    ...provenance
  };
}
