/**
 * Teile einer Schicht mit Tageszuordnung (ADR 0013): Hauptteil -> Nachtbereitschaft -> zweiter Teil.
 * Beginnt ein Teil vor dem Ende des vorherigen, liegt er am Folgetag; zur selben Uhrzeit schließt er direkt an.
 */
import { formatToHHmm } from './timeUtils';

export interface ShiftTimes {
  kind?: 'shift' | 'absence';
  startTime: string;
  endTime: string;
  isNightStandby?: boolean;
  nightStandbyStartTime?: string;
  nightStandbyEndTime?: string;
  isSplitShift?: boolean;
  splitStartTime?: string;
  splitEndTime?: string;
}

export interface ShiftPart {
  part: 'main' | 'standby' | 'split';
  start: string;      // HH:mm
  end: string;        // HH:mm
  startDay: number;   // 0 = Datum der Schicht, 1 = Folgetag, ...
  endDay: number;     // Tag, an dem der Teil endet (Ende genau 00:00 zählt zum Vortag)
  minutes: number;    // Dauer
}

const toMinutes = (time: string): number => {
  const [h, m] = formatToHHmm(time).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function shiftParts(shift: ShiftTimes): ShiftPart[] {
  if (shift.kind === 'absence' || !shift.startTime || !shift.endTime) return [];
  const raw: { part: ShiftPart['part']; start: string; end: string }[] = [{ part: 'main', start: shift.startTime, end: shift.endTime }];
  if (shift.isNightStandby && shift.nightStandbyStartTime && shift.nightStandbyEndTime) {
    raw.push({ part: 'standby', start: shift.nightStandbyStartTime, end: shift.nightStandbyEndTime });
  }
  if (shift.isSplitShift && shift.splitStartTime && shift.splitEndTime) {
    raw.push({ part: 'split', start: shift.splitStartTime, end: shift.splitEndTime });
  }

  const parts: ShiftPart[] = [];
  let previousEnd = -Infinity;  // absolute Minuten ab 00:00 des Schichtdatums
  for (const r of raw) {
    let start = toMinutes(r.start);
    if (previousEnd !== -Infinity) {
      const dayOfPreviousEnd = Math.floor(previousEnd / 1440) * 1440;
      start += dayOfPreviousEnd;
      if (start < previousEnd) start += 1440;
    }
    let duration = toMinutes(r.end) - toMinutes(r.start);
    if (duration < 0) duration += 1440;
    const end = start + duration;
    parts.push({
      part: r.part,
      start: formatToHHmm(r.start),
      end: formatToHHmm(r.end),
      startDay: Math.floor(start / 1440),
      endDay: Math.floor(Math.max(start, end - 1) / 1440),
      minutes: duration
    });
    previousEnd = end;
  }
  return parts;
}

// Reicht die Schicht (mit einem ihrer Teile) in den Folgetag?
export const reachesNextDay = (shift: ShiftTimes): boolean => shiftParts(shift).some(p => p.endDay > 0);
