import { ref } from 'vue';
import { db } from '../db';
import { alertController, loadingController, toastController } from '@ionic/vue';

const CLIENT_ID_KEY = 'google_client_id';
const AUTO_SYNC_KEY = 'google_auto_sync';
const LAST_SYNC_TIME_KEY = 'google_last_sync_time';
const LAST_SYNC_ISO_KEY = 'google_last_sync_iso';
const LAST_SYNC_DIR_KEY = 'google_last_sync_dir';
const LOCAL_MODIFIED_KEY = 'shifthappens_local_modified';
const CONNECTED_KEY = 'google_connected';
const USER_EMAIL_KEY = 'google_user_email';

const envClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
export const clientId = ref(localStorage.getItem(CLIENT_ID_KEY) || envClientId);
export const isConnected = ref(localStorage.getItem(CONNECTED_KEY) === 'true');
export const userEmail = ref(localStorage.getItem(USER_EMAIL_KEY) || '');
export const autoSyncEnabled = ref(localStorage.getItem(AUTO_SYNC_KEY) === 'true');
const rawLastSync = localStorage.getItem(LAST_SYNC_TIME_KEY) || '';
const formattedLastSync = rawLastSync.includes('T') ? new Date(rawLastSync).toLocaleString('de-DE') : rawLastSync;
export const lastSyncTime = ref(formattedLastSync);
export const lastSyncDirection = ref(localStorage.getItem(LAST_SYNC_DIR_KEY) || 'Noch nicht synchronisiert');

let tokenClient: any = null;
let accessToken: string | null = null;
let autoSyncInterval: any = null;

export function setClientId(id: string) {
  clientId.value = id.trim();
  localStorage.setItem(CLIENT_ID_KEY, clientId.value);
}

export function setAutoSync(enabled: boolean) {
  autoSyncEnabled.value = enabled;
  localStorage.setItem(AUTO_SYNC_KEY, String(enabled));
  if (enabled) {
    startAutoSyncTimer();
  } else {
    stopAutoSyncTimer();
  }
}

export function markLocalModified() {
  localStorage.setItem(LOCAL_MODIFIED_KEY, new Date().toISOString());
}

export async function initGoogleAuth(): Promise<boolean> {
  if (!clientId.value || clientId.value.trim() === '') {
    console.error('Google Client ID (VITE_GOOGLE_CLIENT_ID) is missing or empty.');
    return false;
  }
  return new Promise((resolve) => {
    if (typeof (window as any).google === 'undefined' || !(window as any).google.accounts) {
      resolve(false);
      return;
    }
    try {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId.value,
        scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email',
        callback: async (response: any) => {
          if (response.error) {
            console.error('Auth error:', response);
            isConnected.value = false;
            localStorage.removeItem(CONNECTED_KEY);
            localStorage.removeItem(USER_EMAIL_KEY);
            resolve(false);
          } else {
            accessToken = response.access_token;
            isConnected.value = true;
            localStorage.setItem(CONNECTED_KEY, 'true');
            await fetchUserInfo();
            resolve(true);
          }
        },
      });
      resolve(true);
    } catch (e) {
      console.error('Init auth error:', e);
      resolve(false);
    }
  });
}

async function fetchUserInfo() {
  if (!accessToken) return;
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      userEmail.value = data.email || data.name || 'Google Nutzer';
      localStorage.setItem(USER_EMAIL_KEY, userEmail.value);
    }
  } catch (e) {
    console.error('Failed to fetch user info:', e);
  }
}

export async function loginToGoogle(promptConsent = false): Promise<boolean> {
  if (!clientId.value || clientId.value.trim() === '') {
    const alert = await alertController.create({
      header: 'Google Client ID fehlt',
      message: 'Die Google OAuth Client ID (VITE_GOOGLE_CLIENT_ID) ist in der .env-Datei nicht konfiguriert oder leer. Bitte tragen Sie dort eine gültige Client ID ein und starten Sie die Entwicklungsumgebung neu.',
      buttons: ['OK']
    });
    await alert.present();
    return false;
  }

  const initialized = await initGoogleAuth();
  if (!initialized || !tokenClient) {
    const alert = await alertController.create({
      header: 'Fehler',
      message: 'Google Identity Services konnten nicht initialisiert werden.',
      buttons: ['OK']
    });
    await alert.present();
    return false;
  }

  return new Promise((resolve) => {
    // Override or trigger request
    tokenClient.callback = async (response: any) => {
      if (response.error) {
        console.error('Login error:', response);
        isConnected.value = false;
        localStorage.removeItem(CONNECTED_KEY);
        localStorage.removeItem(USER_EMAIL_KEY);
        resolve(false);
      } else {
        accessToken = response.access_token;
        isConnected.value = true;
        localStorage.setItem(CONNECTED_KEY, 'true');
        await fetchUserInfo();
        resolve(true);
      }
    };
    const options: any = {};
    if (promptConsent) {
      options.prompt = 'consent';
    } else {
      options.prompt = '';
    }
    tokenClient.requestAccessToken(options);
  });
}

export function logoutFromGoogle() {
  accessToken = null;
  isConnected.value = false;
  userEmail.value = '';
  stopAutoSyncTimer();
  localStorage.removeItem(CONNECTED_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}

// Find backup file in appDataFolder
async function findCloudFile(): Promise<{ id: string; modifiedTime: string } | null> {
  if (!accessToken) return null;
  try {
    const query = encodeURIComponent("name = 'shifthappens_backup.json' and trashed = false");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return {
        id: data.files[0].id,
        modifiedTime: data.files[0].modifiedTime
      };
    }
  } catch (e) {
    console.error('Error finding cloud file:', e);
  }
  return null;
}

// Download cloud backup content and metadata
async function downloadCloudBackup(fileId: string): Promise<{ data: any; modifiedTime: string } | null> {
  if (!accessToken) return null;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return { data: json, modifiedTime: json.timestamp || new Date().toISOString() };
  } catch (e) {
    console.error('Error downloading cloud backup:', e);
    return null;
  }
}

// Upload backup to cloud
async function uploadToCloud(fileId: string | null, jsonString: string): Promise<boolean> {
  if (!accessToken) return false;
  try {
    const metadata = {
      name: 'shifthappens_backup.json',
      parents: fileId ? undefined : ['appDataFolder']
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([jsonString], { type: 'application/json' }));

    const url = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const method = fileId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    });

    return res.ok;
  } catch (e) {
    console.error('Error uploading to cloud:', e);
    return false;
  }
}

function parseLastSyncTime(str: string | null): number {
  if (!str) return 0;
  if (str.includes('T') || str.includes('-')) {
    const t = new Date(str).getTime();
    return isNaN(t) ? 0 : t;
  }
  try {
    const parts = str.split(',');
    if (parts.length >= 1) {
      const datePart = parts[0].trim();
      const timePart = parts[1] ? parts[1].trim() : '00:00:00';
      const dateParts = datePart.split('.');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        const timeParts = timePart.split(':');
        const hour = timeParts[0] ? parseInt(timeParts[0], 10) : 0;
        const minute = timeParts[1] ? parseInt(timeParts[1], 10) : 0;
        const second = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
        const d = new Date(year, month, day, hour, minute, second);
        const t = d.getTime();
        return isNaN(t) ? 0 : t;
      }
    }
  } catch (e) {
    console.error('Error parsing legacy last sync time:', e);
  }
  return 0;
}

function updateSyncStatus(direction: string) {
  const now = new Date();
  const displayStr = now.toLocaleString('de-DE');
  const isoStr = now.toISOString();
  lastSyncTime.value = displayStr;
  lastSyncDirection.value = direction;
  localStorage.setItem(LAST_SYNC_TIME_KEY, displayStr);
  localStorage.setItem(LAST_SYNC_ISO_KEY, isoStr);
  localStorage.setItem(LAST_SYNC_DIR_KEY, direction);
  localStorage.removeItem(LOCAL_MODIFIED_KEY);
}

export async function syncNow(manual = true): Promise<{ success: boolean; message: string }> {
  if (!isConnected.value || !accessToken) {
    if (manual) {
      const loggedIn = await loginToGoogle();
      if (!loggedIn) return { success: false, message: 'Nicht mit Google verbunden.' };
    } else {
      return { success: false, message: 'Nicht mit Google verbunden.' };
    }
  }

  try {
    const shifts = await db.shifts.toArray();
    const shiftTypes = await db.shiftTypes.toArray();
    const backupTimestamp = new Date().toISOString();
    const payload = {
      version: 1,
      timestamp: backupTimestamp,
      tables: { shifts, shiftTypes }
    };
    const jsonString = JSON.stringify(payload, null, 2);

    const cloudFile = await findCloudFile();
    const localModifiedStr = localStorage.getItem(LOCAL_MODIFIED_KEY);
    const localModifiedTime = localModifiedStr ? new Date(localModifiedStr).getTime() : 0;
    const lastIsoStr = localStorage.getItem(LAST_SYNC_ISO_KEY) || localStorage.getItem(LAST_SYNC_TIME_KEY);
    const lastSyncTimeMs = parseLastSyncTime(lastIsoStr);

    if (!cloudFile) {
      // No file in cloud yet -> upload local
      const success = await uploadToCloud(null, jsonString);
      if (success) {
        updateSyncStatus('Hochgeladen');
        return { success: true, message: 'Backup erfolgreich in die Cloud hochgeladen.' };
      } else {
        return { success: false, message: 'Upload in die Cloud fehlgeschlagen.' };
      }
    }

    // Cloud file exists -> get cloud backup
    const cloudBackup = await downloadCloudBackup(cloudFile.id);
    const cloudTimestampMs = cloudBackup && cloudBackup.data.timestamp ? new Date(cloudBackup.data.timestamp).getTime() : new Date(cloudFile.modifiedTime).getTime();

    const tolerance = 2000; // 2 seconds tolerance for clock skew / rounding

    // Determine what changed
    const localChanged = localModifiedTime > lastSyncTimeMs + tolerance;
    const cloudChanged = cloudTimestampMs > lastSyncTimeMs + tolerance;

    if (!localChanged && !cloudChanged) {
      updateSyncStatus('Synchronisiert');
      return { success: true, message: 'Daten sind bereits synchronisiert.' };
    }

    if (localChanged && !cloudChanged) {
      // Only local changed -> upload
      const success = await uploadToCloud(cloudFile.id, jsonString);
      if (success) {
        updateSyncStatus('Hochgeladen');
        return { success: true, message: 'Lokale Änderungen in die Cloud hochgeladen.' };
      }
      return { success: false, message: 'Upload fehlgeschlagen.' };
    }

    if (!localChanged && cloudChanged) {
      // Only cloud changed -> download and import
      if (cloudBackup && cloudBackup.data.tables) {
        await db.transaction('rw', db.shifts, db.shiftTypes, async () => {
          await db.shifts.clear();
          await db.shiftTypes.clear();
          if (cloudBackup.data.tables.shifts) await db.shifts.bulkAdd(cloudBackup.data.tables.shifts);
          if (cloudBackup.data.tables.shiftTypes) await db.shiftTypes.bulkAdd(cloudBackup.data.tables.shiftTypes);
        });
        updateSyncStatus('Heruntergeladen');
        return { success: true, message: 'Änderungen aus der Cloud heruntergeladen und übernommen.' };
      }
    }

    // Conflict! Both local and cloud changed since last sync
    if (manual) {
      return new Promise((resolve) => {
        loadingController.dismiss().catch(() => {});
        alertController.create({
          header: 'Synchronisationskonflikt',
          message: 'Sowohl lokal als auch in der Cloud gab es Änderungen seit dem letzten Sync. Welchen Stand möchten Sie behalten?',
          buttons: [
            {
              text: 'Abbrechen',
              role: 'cancel',
              handler: () => resolve({ success: false, message: 'Synchronisation abgebrochen.' })
            },
            {
              text: 'Cloud-Stand bevorzugen',
              handler: async () => {
                if (cloudBackup && cloudBackup.data.tables) {
                  await db.transaction('rw', db.shifts, db.shiftTypes, async () => {
                    await db.shifts.clear();
                    await db.shiftTypes.clear();
                    if (cloudBackup.data.tables.shifts) await db.shifts.bulkAdd(cloudBackup.data.tables.shifts);
                    if (cloudBackup.data.tables.shiftTypes) await db.shiftTypes.bulkAdd(cloudBackup.data.tables.shiftTypes);
                  });
                  updateSyncStatus('Konflikt gelöst');
                  resolve({ success: true, message: 'Cloud-Stand erfolgreich übernommen.' });
                } else {
                  resolve({ success: false, message: 'Fehler beim Herunterladen des Cloud-Stands.' });
                }
              }
            },
            {
              text: 'Lokalen Stand hochladen',
              handler: async () => {
                const success = await uploadToCloud(cloudFile.id, jsonString);
                if (success) {
                  updateSyncStatus('Konflikt gelöst');
                  resolve({ success: true, message: 'Lokaler Stand in die Cloud hochgeladen.' });
                } else {
                  resolve({ success: false, message: 'Upload fehlgeschlagen.' });
                }
              }
            }
          ]
        }).then(alert => alert.present());
      });
    } else {
      // Automatic sync conflict: Default to newest or warn user via toast/alert
      // Let's compare timestamps: if cloud is newer than local, download; else upload
      if (cloudTimestampMs >= localModifiedTime) {
        if (cloudBackup && cloudBackup.data.tables) {
          await db.transaction('rw', db.shifts, db.shiftTypes, async () => {
            await db.shifts.clear();
            await db.shiftTypes.clear();
            if (cloudBackup.data.tables.shifts) await db.shifts.bulkAdd(cloudBackup.data.tables.shifts);
            if (cloudBackup.data.tables.shiftTypes) await db.shiftTypes.bulkAdd(cloudBackup.data.tables.shiftTypes);
          });
          updateSyncStatus('Auto-Sync: Konflikt gelöst');
          return { success: true, message: 'Auto-Sync: Cloud-Stand war neuer und wurde übernommen.' };
        }
      } else {
        const success = await uploadToCloud(cloudFile.id, jsonString);
        if (success) {
          updateSyncStatus('Auto-Sync: Konflikt gelöst');
          return { success: true, message: 'Auto-Sync: Lokaler Stand war neuer und wurde hochgeladen.' };
        }
      }
      return { success: false, message: 'Auto-Sync Konflikt konnte nicht gelöst werden.' };
    }

  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, message: 'Synchronisationsfehler aufgetreten.' };
  }
}

function startAutoSyncTimer() {
  stopAutoSyncTimer();
  // Check every 15 minutes if connected and auto-sync enabled
  autoSyncInterval = setInterval(async () => {
    if (autoSyncEnabled.value && isConnected.value) {
      await syncNow(false);
    }
  }, 15 * 60 * 1000);
}

function stopAutoSyncTimer() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}

// Initial auto-sync startup if enabled
if (autoSyncEnabled.value) {
  startAutoSyncTimer();
}

if (isConnected.value) {
  initGoogleAuth();
}
