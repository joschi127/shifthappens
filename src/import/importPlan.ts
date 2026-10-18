/**
 * Abgleich der Vorschläge mit vorhandenen Schichten (ADR 0014):
 * früher importierte Schichten des Monats werden überschrieben bzw. entfernt,
 * selbst angelegte bleiben unangetastet (Überschneidungen werden angezeigt und standardmäßig übersprungen).
 */
import { Shift, ShiftType } from '../db';
import { shiftFromType } from '../utils/shiftFactory';
import { DayProposal } from './resolveShifts';

export interface PlannedShift {
  shift: Shift;              // neue Schicht bzw. neuer Stand
  replaces?: Shift;          // überschriebene, früher importierte Schicht
  manuallyChanged?: boolean; // die überschriebene Schicht wurde seit dem Import von Hand geändert
  manualConflicts: Shift[];  // selbst angelegte Schichten am selben Tag
  include: boolean;          // Vorgabe für die Bestätigungsansicht
}

export interface ImportPlan {
  importId: string;
  planned: PlannedShift[];
  removals: Shift[];         // früher importierte Schichten, die in der neuen Fassung fehlen
}

export function planImport(proposals: DayProposal[], templates: ShiftType[], existing: Shift[], importId: string, now = new Date().toISOString()): ImportPlan {
  const month = proposals[0]?.date.slice(0, 7) ?? '';
  const inMonth = existing.filter(s => s.date.startsWith(month));
  const importedByDate = new Map<string, Shift[]>();
  for (const s of inMonth.filter(s => s.source === 'import')) importedByDate.set(s.date, [...(importedByDate.get(s.date) ?? []), s]);
  const used = new Set<number>();

  const planned: PlannedShift[] = [];
  for (const day of proposals) {
    for (const item of day.items) {
      const type = templates.find(t => t.id === item.shiftTypeId);
      if (!type) continue; // unbekannte Kürzel werden erst nach Zuordnung übernommen
      const shift = shiftFromType(type, day.date, { source: 'import', importId, now });
      if (item.review) shift.review = { reason: item.review, since: now };
      // Früher importierte Schicht derselben Art am selben Tag überschreiben (gleiche ID, Importzeitpunkt bleibt)
      const previous = (importedByDate.get(day.date) ?? []).find(s => s.id !== undefined && !used.has(s.id) && (s.kind ?? 'shift') === (type.kind ?? 'shift'));
      if (previous?.id !== undefined) {
        used.add(previous.id);
        Object.assign(shift, { id: previous.id, importedAt: previous.importedAt ?? now, createdAt: previous.createdAt ?? now });
      }
      const manualConflicts = inMonth.filter(s => s.date === day.date && s.source !== 'import' && (s.kind ?? 'shift') === (type.kind ?? 'shift'));
      planned.push({
        shift, replaces: previous, manuallyChanged: previous?.lastChangeBy === 'manual',
        manualConflicts, include: manualConflicts.length === 0
      });
    }
  }
  const removals = inMonth.filter(s => s.source === 'import' && s.id !== undefined && !used.has(s.id));
  return { importId, planned, removals };
}
