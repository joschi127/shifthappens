/**
 * Erkannte Kürzel pro Tag in Vorschläge übersetzen (PRD Dienstplan-Import, ADR 0012, 0013):
 * Kombinationen über zwei Tage zuerst (mit Bereitschaft vor ohne), dann einzelne Kürzel;
 * Abwesenheiten aus der Abwesenheitszeile; "Kürzel ohne Eintrag" erzeugen nichts.
 */
import { ShiftType } from '../db';
import { isStandbyWildcard, matchesStandby, parseShiftCode } from '../utils/shiftCodes';
import { sameEntry } from '../utils/tagList';
import { CellResult } from './recognizeGrid';
import { isFreeCode } from './codeReading';

export interface DayReading {
  duty: CellResult;
  absence?: CellResult;
  standby?: { labelled: boolean; raw: string };
}

export type ProposalStatus = 'ok' | 'uncertain' | 'unknown';

export interface ProposalItem {
  kind: 'duty' | 'absence';
  code: string;              // gelesenes bzw. vorgeschlagenes Kürzel (bei Kombinationen "N01 + F02")
  shiftTypeId?: number;      // zugeordnete Vorlage, falls gefunden
  status: ProposalStatus;    // ok = sicher; uncertain = bitte bestätigen; unknown = kein passendes Kürzel
  review?: string;           // Grund für "zu prüfen" beim Speichern ohne Bestätigung
  spansNextDay?: boolean;    // Kombination: Folgetag gehört zu dieser Schicht
}

export interface DayProposal {
  date: string;              // YYYY-MM-DD
  items: ProposalItem[];
  consumedByPrevious?: boolean; // Dienst dieses Tages gehört zur Kombination des Vortags
}

export interface ResolveOptions {
  templates: ShiftType[];    // in Reihenfolge der Vorlagenliste
  ignoreCodes: string[];
  year: number;
  month: number;             // 1–12
}

const iso = (year: number, month: number, day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// Gelesener Wert einer Zelle: sicherer Wert oder Vorschlag
const readValue = (cell: CellResult): { code: string; uncertain: boolean } =>
  cell.uncertain ? { code: cell.suggestion || cell.raw || '', uncertain: true } : { code: cell.value, uncertain: false };

export function resolveShifts(days: DayReading[], options: ResolveOptions): DayProposal[] {
  const { templates, ignoreCodes, year, month } = options;
  const shiftTypes = templates.filter(t => t.kind !== 'absence');
  const absenceTypes = templates.filter(t => t.kind === 'absence');
  const isIgnored = (code: string) => isFreeCode(code) || ignoreCodes.some(c => sameEntry(c, code));

  // Einzelne Kürzel und Kombinationen je Vorlage
  const singles = (types: ShiftType[]) => types.flatMap(t => (t.codes ?? []).map(parseShiftCode)
    .filter((p): p is { type: 'single'; code: string } => p?.type === 'single').map(p => ({ code: p.code, type: t })));
  const combos = shiftTypes.flatMap(t => (t.codes ?? []).map(parseShiftCode)
    .filter((p): p is { type: 'combo'; first: string; standby?: string; second: string } => p?.type === 'combo').map(p => ({ ...p, type: t })))
    // spezifischste zuerst: mit konkretem Bereitschaftskürzel, mit Platzhalter, ohne
    .sort((a, b) => rank(a.standby) - rank(b.standby));

  // Rückfall für unvollständige Kürzel: erste Vorlage (Listenreihenfolge), deren Kürzel mit dem Text beginnt
  const byPrefix = (text: string, types: ShiftType[]) => text.length >= 1
    ? types.find(t => (t.codes ?? []).some(c => { const p = parseShiftCode(c); return p?.type === 'single' && p.code.toUpperCase().startsWith(text.toUpperCase()); }))
    : undefined;

  const result: DayProposal[] = days.map((_, i) => ({ date: iso(year, month, i + 1), items: [] }));

  for (let d = 0; d < days.length; d++) {
    const day = days[d];
    // Abwesenheit (eigene Zeile, kann zusätzlich zu einer Schicht stehen)
    if (day.absence) {
      const { code, uncertain } = readValue(day.absence);
      if (code && !isIgnored(code)) result[d].items.push(itemFor('absence', code, uncertain, singles(absenceTypes), absenceTypes, byPrefix));
    }
    if (result[d].consumedByPrevious) continue;

    const { code, uncertain } = readValue(day.duty);
    if (!code || isIgnored(code)) continue;

    // Kombination über zwei Tage
    const next = days[d + 1];
    if (next) {
      const nextRead = readValue(next.duty);
      const combo = combos.find(c => sameEntry(c.first, code) && sameEntry(c.second, nextRead.code)
        && (!c.standby || (day.standby && (isStandbyWildcard(c.standby) ? day.standby.labelled : matchesStandby(c.standby, day.standby.raw)))));
      if (combo) {
        const anyUncertain = uncertain || nextRead.uncertain;
        result[d].items.push({
          kind: 'duty', code: [combo.first, combo.standby, combo.second].filter(Boolean).join(' + '), shiftTypeId: combo.type.id,
          status: anyUncertain ? 'uncertain' : 'ok', spansNextDay: true,
          ...(anyUncertain ? { review: 'Unsicher erkannt – bitte prüfen' } : {})
        });
        result[d + 1].consumedByPrevious = true;
        continue;
      }
    }
    result[d].items.push(itemFor('duty', code, uncertain, singles(shiftTypes), shiftTypes, byPrefix));
  }
  return result;
}

const rank = (standby?: string) => !standby ? 2 : isStandbyWildcard(standby) ? 1 : 0;

function itemFor(kind: 'duty' | 'absence', code: string, uncertain: boolean,
                 singles: { code: string; type: ShiftType }[], types: ShiftType[],
                 byPrefix: (text: string, types: ShiftType[]) => ShiftType | undefined): ProposalItem {
  const exact = singles.find(s => sameEntry(s.code, code));
  if (exact) {
    return { kind, code, shiftTypeId: exact.type.id, status: uncertain ? 'uncertain' : 'ok', ...(uncertain ? { review: 'Unsicher erkannt – bitte prüfen' } : {}) };
  }
  const prefix = byPrefix(code, types);
  if (prefix) {
    return { kind, code, shiftTypeId: prefix.id, status: 'uncertain', review: `Unvollständiges Kürzel „${code}“ – bitte prüfen` };
  }
  return { kind, code, status: 'unknown' };
}
