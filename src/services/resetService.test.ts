import { beforeEach, describe, expect, it, vi } from 'vitest';

const logout = vi.fn();
const deleteCloud = vi.fn();
vi.mock('./googleDriveService', () => ({ logoutFromGoogle: () => logout(), deleteCloudBackup: () => deleteCloud() }));

// Minimaler Speicher-Ersatz für localStorage/sessionStorage in Node
const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); }, clear: () => data.clear(), get length() { return data.size; }
  };
};
vi.stubGlobal('localStorage', memoryStorage());
vi.stubGlobal('sessionStorage', memoryStorage());

const { db } = await import('../db');
const { deleteAllLocalData } = await import('./resetService');

describe('deleteAllLocalData', () => {
  beforeEach(async () => {
    if (!db.isOpen()) await db.open();
    await db.shiftTypes.add({ name: 'Frühdienst', color: '#000', startTime: '06:00', endTime: '14:00', isSplitShift: false, hasNightStandby: false, order: 0 });
    await db.shifts.add({ date: '2026-11-02', shiftTypeId: 1, name: 'Frühdienst', color: '#000', startTime: '06:00', endTime: '14:00' } as any);
    localStorage.setItem('dark_mode', 'true');
    localStorage.setItem('google_connected', 'true');
  });

  it('löscht Datenbank und Einstellungen und trennt vorher Google, ohne die Drive-Sicherung anzufassen', async () => {
    await deleteAllLocalData();
    expect(deleteCloud).not.toHaveBeenCalled();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
    await db.open();
    expect(await db.shiftTypes.count()).toBe(0);
    expect(await db.shifts.count()).toBe(0);
  });

  it('löscht auf Wunsch zuerst die Drive-Sicherung', async () => {
    deleteCloud.mockClear(); logout.mockClear();
    await deleteAllLocalData({ includeCloud: true });
    expect(deleteCloud).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);
    await db.open();
    expect(await db.shifts.count()).toBe(0);
  });

  it('löscht nichts auf dem Gerät, wenn das Löschen im Drive fehlschlägt', async () => {
    deleteCloud.mockRejectedValueOnce(new Error('offline')); logout.mockClear();
    await expect(deleteAllLocalData({ includeCloud: true })).rejects.toThrow('offline');
    expect(logout).not.toHaveBeenCalled();
    expect(await db.shifts.count()).toBe(1);
    expect(localStorage.getItem('google_connected')).toBe('true');
  });
});
