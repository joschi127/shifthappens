import Dexie, { Table } from 'dexie';

export interface ShiftType {
  id?: number;
  name: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  color: string;     // Hex color
  isSplitShift: boolean;
  splitStartTime?: string;
  splitEndTime?: string;
  defaultPauseMinutes?: number;
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
    this.version(2).stores({
      shifts: '++id, date, shiftTypeId',
      shiftTypes: '++id, name'
    });
  }
}

export const db = new MyDatabase();
