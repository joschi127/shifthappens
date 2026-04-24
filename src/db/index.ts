import Dexie, { Table } from 'dexie';

export interface ShiftType {
  id?: number;
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
}

export interface Shift {
  id?: number;
  date: string;       // ISO Date String (YYYY-MM-DD)
  shiftTypeId?: number;
  name: string;       // Fallback or custom name
  startTime: string;
  endTime: string;
  pauseMinutes: number;
  isNightStandby: boolean;
  notes: string;
  isSplitShift: boolean;
  splitStartTime?: string;
  splitEndTime?: string;
}

export class MyDatabase extends Dexie {
  shifts!: Table<Shift>;
  shiftTypes!: Table<ShiftType>;

  constructor() {
    super('SchichtatorDB');
    
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
  }
}

export const db = new MyDatabase();
