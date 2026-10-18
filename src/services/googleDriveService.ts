import { ref } from 'vue';
import { collectBackup, isValidBackup, restoreBackup } from './backupService';
import { alertController, loadingController, toastController } from '@ionic/vue';

const CLIENT_ID_KEY = 'google_client_id';
const AUTO_SYNC_KEY = 'google_auto_sync';
const LAST_SYNC_TIME_KEY = 'google_last_sync_time';
const LAST_SYNC_ISO_KEY = 'google_last_sync_iso';
const LAST_SYNC_DIR_KEY = 'google_last_sync_dir';
const LOCAL_MODIFIED_KEY = 'shifthappens_local_modified';
const CONNECTED_KEY = 'google_connected';
const USER_EMAIL_KEY = 'google_user_email';
const ACCESS_TOKEN_KEY = 'google_access_token';
const TOKEN_EXPIRES_AT_KEY = 'google_access_token_expires_at';

// Token etwas früher als abgelaufen behandeln, damit es nicht mitten im Sync ungültig wird
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;
const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;

const envClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
export const clientId = ref(localStorage.getItem(CLIENT_ID_KEY) || envClientId);
export const isConnected = ref(localStorage.getItem(CONNECTED_KEY) === 'true');
export const userEmail = ref(localStorage.getItem(USER_EMAIL_KEY) || '');
export const autoSyncEnabled = ref(localStorage.getItem(AUTO_SYNC_KEY) === 'true');
const rawLastSync = localStorage.getItem(LAST_SYNC_TIME_KEY) || '';
const formattedLastSync = rawLastSync.includes('T') ? new Date(rawLastSync).toLocaleString('de-DE') : rawLastSync;
export const lastSyncTime = ref(formattedLastSync);
export const lastSyncDirection = ref(localStorage.getItem(LAST_SYNC_DIR_KEY) || 'Noch nicht synchronisiert');
// Verbunden, aber ohne gültiges Zugriffstoken: Google erlaubt die Erneuerung nur nach einer Nutzeraktion (Popup)
export const needsReauth = ref(false);

let tokenClient: any = null;
let tokenErrorHandler: ((error: any) => void) | null = null;
let autoSyncInterval: any = null;
let reauthHintShown = false;

class AuthExpiredError extends Error {
  constructor() {
    super('Google-Zugriffstoken fehlt oder ist abgelaufen');
  }
}

/**
 * Das Zugriffstoken wird mit Ablaufzeit gespeichert, damit die Verbindung ein Neuladen
 * der App übersteht. Es ist auf den versteckten App-Ordner und die E-Mail-Adresse beschränkt
 * und läuft nach ca. einer Stunde ab.
 */
function storeToken(response: any) {
  const expiresInMs = Number(response.expires_in || 3600) * 1000;
  localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
  localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + expiresInMs - TOKEN_EXPIRY_BUFFER_MS));
  needsReauth.value = false;
  reauthHintShown = false;
}

function clearToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
}

function getValidToken(): string | null {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY) || 0);
  if (token && expiresAt > Date.now()) {
    return token;
  }
  clearToken();
  needsReauth.value = isConnected.value;
  return null;
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getValidToken();
  if (!token) {
    throw new AuthExpiredError();
  }
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` }
  });
  if (res.status === 401) {
    clearToken();
    needsReauth.value = isConnected.value;
    throw new AuthExpiredError();
  }
  return res;
}

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
            storeToken(response);
            isConnected.value = true;
            localStorage.setItem(CONNECTED_KEY, 'true');
            await fetchUserInfo();
            resolve(true);
          }
        },
        // z. B. Popup geschlossen oder blockiert
        error_callback: (error: any) => {
          console.warn('Google auth popup error:', error);
          tokenErrorHandler?.(error);
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
  try {
    const res = await driveFetch('https://www.googleapis.com/oauth2/v3/userinfo');
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
    tokenErrorHandler = () => resolve(false);
    tokenClient.callback = async (response: any) => {
      if (response.error) {
        console.error('Login error:', response);
        isConnected.value = false;
        localStorage.removeItem(CONNECTED_KEY);
        localStorage.removeItem(USER_EMAIL_KEY);
        resolve(false);
      } else {
        storeToken(response);
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
      // Bei erneuter Anmeldung das bekannte Konto vorschlagen, damit keine Kontoauswahl nötig ist
      if (userEmail.value.includes('@')) {
        options.login_hint = userEmail.value;
      }
    }
    tokenClient.requestAccessToken(options);
  });
}

export function logoutFromGoogle() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token && (window as any).google?.accounts?.oauth2) {
    (window as any).google.accounts.oauth2.revoke(token, () => {});
  }
  clearToken();
  needsReauth.value = false;
  isConnected.value = false;
  userEmail.value = '';
  stopAutoSyncTimer();
  localStorage.removeItem(CONNECTED_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}

/**
 * Sicherung im Google Drive löschen: alle Dateien im App-Ordner (appDataFolder, nur für diese App sichtbar).
 * Ohne gültiges Token wird zuerst neu angemeldet (Popup, daher nur nach einer Nutzeraktion aufrufen).
 * Wirft bei Fehlern, damit der Aufrufer nichts Lokales löscht, solange die Cloud-Sicherung noch besteht.
 */
export async function deleteCloudBackup(): Promise<number> {
  if (!getValidToken() && !(await loginToGoogle())) {
    throw new Error('Google-Anmeldung abgebrochen oder fehlgeschlagen.');
  }
  const res = await driveFetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id)&pageSize=100');
  if (!res.ok) throw new Error(`Drive-Dateiliste konnte nicht geladen werden (HTTP ${res.status})`);
  const files: { id: string }[] = (await res.json()).files ?? [];
  for (const file of files) {
    const del = await driveFetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, { method: 'DELETE' });
    if (!del.ok && del.status !== 404) throw new Error(`Drive-Datei konnte nicht gelöscht werden (HTTP ${del.status})`);
  }
  return files.length;
}

// Find backup file in appDataFolder
// Fehler werden geworfen statt als "keine Datei" gewertet, sonst würde eine zweite Backup-Datei angelegt
async function findCloudFile(): Promise<{ id: string; modifiedTime: string } | null> {
  const query = encodeURIComponent("name = 'shifthappens_backup.json' and trashed = false");
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`);
  if (!res.ok) {
    throw new Error(`Drive-Dateiliste konnte nicht geladen werden (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return {
      id: data.files[0].id,
      modifiedTime: data.files[0].modifiedTime
    };
  }
  return null;
}

// Download cloud backup content and metadata
async function downloadCloudBackup(fileId: string): Promise<{ data: any; modifiedTime: string } | null> {
  try {
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    if (!res.ok) return null;
    const json = await res.json();
    return { data: json, modifiedTime: json.timestamp || new Date().toISOString() };
  } catch (e) {
    if (e instanceof AuthExpiredError) throw e;
    console.error('Error downloading cloud backup:', e);
    return null;
  }
}

// Upload backup to cloud
async function uploadToCloud(fileId: string | null, jsonString: string): Promise<boolean> {
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

    const res = await driveFetch(url, { method, body: form });

    return res.ok;
  } catch (e) {
    if (e instanceof AuthExpiredError) throw e;
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
  if (!isConnected.value || !getValidToken()) {
    if (manual) {
      const loggedIn = await loginToGoogle();
      if (!loggedIn) return { success: false, message: 'Nicht mit Google verbunden.' };
    } else {
      return {
        success: false,
        message: isConnected.value ? 'Google-Anmeldung abgelaufen. Bitte erneut anmelden.' : 'Nicht mit Google verbunden.'
      };
    }
  }

  try {
    const payload = await collectBackup(new Date().toISOString());
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
      if (cloudBackup && isValidBackup(cloudBackup.data)) {
        await restoreBackup(cloudBackup.data);
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
                if (cloudBackup && isValidBackup(cloudBackup.data)) {
                  await restoreBackup(cloudBackup.data);
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
        if (cloudBackup && isValidBackup(cloudBackup.data)) {
          await restoreBackup(cloudBackup.data);
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
    if (error instanceof AuthExpiredError) {
      return { success: false, message: 'Google-Anmeldung abgelaufen. Bitte erneut anmelden.' };
    }
    console.error('Sync error:', error);
    return { success: false, message: 'Synchronisationsfehler aufgetreten.' };
  }
}

async function runAutoSync() {
  if (!autoSyncEnabled.value || !isConnected.value) return;
  await syncNow(false);
  if (needsReauth.value) {
    await showReauthHint();
  }
}

// Einmal pro Sitzung: Der Tipp auf "Anmelden" ist die Nutzeraktion, die Google für das Popup verlangt
async function showReauthHint() {
  if (reauthHintShown) return;
  reauthHintShown = true;
  const toast = await toastController.create({
    message: 'Google-Anmeldung abgelaufen. Der automatische Sync ist pausiert.',
    duration: 10000,
    color: 'warning',
    buttons: [
      { text: 'Anmelden', handler: () => { reconnectAndSync(); } },
      { text: 'Später', role: 'cancel' }
    ]
  });
  await toast.present();
}

export async function reconnectAndSync(): Promise<void> {
  if (!(await loginToGoogle())) return;
  const result = await syncNow(true);
  const toast = await toastController.create({
    message: result.message,
    duration: 3000,
    color: result.success ? 'success' : 'danger'
  });
  await toast.present();
}

function startAutoSyncTimer() {
  stopAutoSyncTimer();
  autoSyncInterval = setInterval(runAutoSync, AUTO_SYNC_INTERVAL_MS);
}

function stopAutoSyncTimer() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}

/**
 * Wird nach dem Mounten der App aufgerufen (main.ts), damit Toasts angezeigt werden können.
 * Synchronisiert beim Start sofort, statt erst nach dem ersten Intervall.
 */
export function initGoogleSync() {
  if (isConnected.value) {
    initGoogleAuth();
    getValidToken();
  }
  if (autoSyncEnabled.value) {
    startAutoSyncTimer();
    runAutoSync();
  }
}
