import { Shift, ShiftType } from '../db';

// Erzeugt eine Schicht mit den Standardwerten der Vorlage
export function shiftFromType(type: ShiftType, date: string): Shift {
  return {
    date,
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
    splitEndTime: type.splitEndTime
  };
}
