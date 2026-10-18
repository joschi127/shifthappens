import { db, ImportProfile, ImportSetting, ImportTemplate } from '../db';
import { markLocalModified } from './googleDriveService';
import { sameEntry } from '../utils/tagList';

export const DEFAULT_IMPORT_PROFILE: ImportProfile = {
  rosterNames: [],
  ignoreCodes: []
};

export function profileFromEntry(entry?: ImportSetting): ImportProfile {
  return entry?.key === 'profile'
    ? { ...DEFAULT_IMPORT_PROFILE, ...entry.value }
    : { ...DEFAULT_IMPORT_PROFILE };
}

export async function getImportProfile(): Promise<ImportProfile> {
  return profileFromEntry(await db.importSettings.get('profile'));
}

// Liefert die Vorlage, an der ein Kürzel bereits als Schichtkürzel hinterlegt ist
export async function findShiftTypeByCode(code: string) {
  const types = await db.shiftTypes.toArray();
  return types.find(t => t.codes?.some(c => sameEntry(c, code)));
}

export async function saveImportProfile(profile: ImportProfile): Promise<void> {
  // Arrays kopieren: Vue-Proxies lassen sich nicht in IndexedDB speichern
  await db.importSettings.put({
    key: 'profile',
    value: {
      rosterNames: [...profile.rosterNames],
      ignoreCodes: [...profile.ignoreCodes]
    }
  });
  markLocalModified();
}

export async function getImportTemplates(): Promise<ImportTemplate[]> {
  const entry = await db.importSettings.get('templates');
  return entry?.key === 'templates' ? entry.value : [];
}

export async function saveImportTemplates(templates: ImportTemplate[]): Promise<void> {
  await db.importSettings.put({
    key: 'templates',
    value: JSON.parse(JSON.stringify(templates))
  });
  markLocalModified();
}
