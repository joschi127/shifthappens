<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Einstellungen</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>Erscheinungsbild</ion-label>
        </ion-list-header>

        <ion-item button @click="toggleDarkMode">
          <ion-icon slot="start" :icon="isDarkMode ? moon : sunny"></ion-icon>
          <ion-label>
            <h2>Dark Mode</h2>
            <p>Zwischen hellem und dunklem Design umschalten.</p>
          </ion-label>
          <ion-toggle slot="end" :checked="isDarkMode" @click.stop @ionChange="onToggleDark"></ion-toggle>
        </ion-item>
      </ion-list>

      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>Dienstplan-Import</ion-label>
        </ion-list-header>

        <ion-item>
          <div class="settings-field">
            <ion-label position="stacked">Name im Dienstplan</ion-label>
            <tag-list-input
              :model-value="importProfile.rosterNames"
              placeholder="z.B. Anna Müller"
              @update:model-value="updateProfile({ rosterNames: $event })"
            ></tag-list-input>
            <ion-note class="field-help">
              So, wie du im Dienstplan geführt wirst, z. B. „Müller, Anna“ oder nur „Müller“. Mehrere
              Schreibweisen möglich, etwa für verschiedene Arbeitgeber. Pläne, in denen statt Namen nur
              Kürzel stehen (z. B. „AMü“), werden nicht unterstützt.
            </ion-note>
          </div>
        </ion-item>

        <ion-item>
          <div class="settings-field">
            <ion-label position="stacked">Kürzel ohne Eintrag</ion-label>
            <tag-list-input
              :model-value="importProfile.ignoreCodes"
              placeholder="z.B. X"
              @update:model-value="updateProfile({ ignoreCodes: $event })"
            ></tag-list-input>
            <ion-note class="field-help">
              Kürzel aus dem Papier-Dienstplan, für die nichts eingetragen werden soll, z. B. „X“.
              Urlaub, Krankheit oder Fortbildung (U, K, FB) legst du dagegen als Schicht-Vorlage
              der Art „Abwesenheit“ an, damit sie im Kalender erscheinen.
            </ion-note>
          </div>
        </ion-item>

        <ion-item button router-link="/shift-types">
          <ion-icon slot="start" :icon="pricetagsOutline"></ion-icon>
          <ion-label>
            <h2>Schichtkürzel</h2>
            <p>Werden an den Schicht-Vorlagen gepflegt.</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>Google Drive Synchronisation</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-icon slot="start" :icon="cloudDownloadOutline"></ion-icon>
          <ion-label>
            <h2>Verbindungsstatus</h2>
            <p>{{ connectionStatus }}</p>
          </ion-label>
          <ion-button v-if="isConnected && needsReauth" slot="end" color="warning" size="small" @click="reconnectAndSync">
            Anmelden
          </ion-button>
          <ion-button slot="end" :color="isConnected ? 'danger' : 'primary'" size="small" @click="handleGoogleAuth">
            {{ isConnected ? 'Trennen' : 'Verbinden' }}
          </ion-button>
        </ion-item>

        <ion-item>
          <ion-icon slot="start" :icon="syncOutline"></ion-icon>
          <ion-label>
            <h2>Automatische Synchronisierung</h2>
            <p>Regelmäßiger Sync im Hintergrund</p>
          </ion-label>
          <ion-toggle slot="end" :checked="autoSyncEnabled" @ionChange="onToggleAutoSync"></ion-toggle>
        </ion-item>

        <ion-item button @click="handleManualSync" :disabled="!isConnected">
          <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
          <ion-label>
            <h2>Jetzt synchronisieren</h2>
            <p>Manuellen Sync mit Google Drive ausführen</p>
          </ion-label>
        </ion-item>

        <ion-item>
          <ion-label>
            <h2>Letzte Synchronisation</h2>
            <p>{{ lastSyncTime ? `${lastSyncTime} (${lastSyncDirection})` : 'Noch nie' }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>Datensicherung (Lokal)</ion-label>
        </ion-list-header>

        <ion-item button @click="handleExport">
          <ion-icon slot="start" :icon="cloudDownloadOutline"></ion-icon>
          <ion-label>
            <h2>Backup exportieren</h2>
            <p>Speichert alle Schichten und Vorlagen als JSON-Datei.</p>
          </ion-label>
        </ion-item>

        <ion-item button @click="triggerFileInput">
          <ion-icon slot="start" :icon="cloudUploadOutline"></ion-icon>
          <ion-label>
            <h2>Backup importieren</h2>
            <p>Stellt Daten aus einer JSON-Datei wieder her (Überschreibt vorhandene Daten!).</p>
          </ion-label>
          <input
            type="file"
            ref="fileInput"
            style="display: none"
            accept=".json"
            @change="handleImport"
          />
        </ion-item>
      </ion-list>

      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>Über die App</ion-label>
        </ion-list-header>

        <ion-item button router-link="/licenses">
          <ion-icon slot="start" :icon="documentTextOutline"></ion-icon>
          <ion-label>
            <h2>Open-Source-Lizenzen</h2>
            <p>Verwendete Bibliotheken und ihre Lizenztexte.</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <div class="ion-padding">
        <p class="ion-text-center version-text">
          ShiftHappens v1.0.0
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonToggle,
  IonButton,
  IonNote,
  alertController,
  loadingController,
  toastController
} from '@ionic/vue';
import {
  cloudDownloadOutline,
  cloudUploadOutline,
  documentTextOutline,
  moon,
  sunny,
  syncOutline,
  refreshOutline,
  pricetagsOutline
} from 'ionicons/icons';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { liveQuery, Subscription } from 'dexie';
import { db, ImportProfile } from '../db';
import TagListInput from '../components/TagListInput.vue';
import {
  DEFAULT_IMPORT_PROFILE,
  findShiftTypeByCode,
  getImportProfile,
  profileFromEntry,
  saveImportProfile
} from '../services/importSettingsService';
import { exportDatabase, importDatabase } from '../services/dbExportService';
import { isDarkMode, toggleDarkMode } from '../services/themeService';
import {
  isConnected,
  needsReauth,
  userEmail,
  autoSyncEnabled,
  lastSyncTime,
  lastSyncDirection,
  setAutoSync,
  loginToGoogle,
  logoutFromGoogle,
  reconnectAndSync,
  syncNow
} from '../services/googleDriveService';

const connectionStatus = computed(() => {
  if (!isConnected.value) return 'Nicht verbunden';
  if (needsReauth.value) return `Anmeldung abgelaufen (${userEmail.value}). Der automatische Sync ist pausiert.`;
  return `Verbunden als ${userEmail.value}`;
});

const fileInput = ref<HTMLInputElement | null>(null);

// Import-Profil live beobachten, damit Änderungen durch Sync/Backup-Import sofort sichtbar sind
const importProfile = ref<ImportProfile>({ ...DEFAULT_IMPORT_PROFILE });
let importProfileSubscription: Subscription | null = null;

onMounted(() => {
  importProfileSubscription = liveQuery(() => db.importSettings.get('profile')).subscribe({
    next: (entry) => { importProfile.value = profileFromEntry(entry); }
  });
});

onUnmounted(() => importProfileSubscription?.unsubscribe());

const updateProfile = async (changes: Partial<ImportProfile>) => {
  // Ein Kürzel ohne Eintrag darf nicht gleichzeitig Schichtkürzel einer Vorlage sein
  for (const code of changes.ignoreCodes ?? []) {
    const owner = await findShiftTypeByCode(code);
    if (owner) {
      const toast = await toastController.create({
        message: `Das Kürzel „${code}“ ist bereits bei der Vorlage „${owner.name}“ hinterlegt.`,
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }
  }
  // Aktuellen Stand aus der DB lesen: liveQuery aktualisiert importProfile asynchron,
  // bei schnell aufeinanderfolgenden Änderungen ginge sonst eine verloren
  await saveImportProfile({ ...(await getImportProfile()), ...changes });
};

const onToggleDark = (event: CustomEvent) => {
  if (isDarkMode.value !== event.detail.checked) {
    toggleDarkMode();
  }
};

const onToggleAutoSync = (event: CustomEvent) => {
  setAutoSync(event.detail.checked);
};

const handleGoogleAuth = async () => {
  if (isConnected.value) {
    logoutFromGoogle();
    const toast = await toastController.create({
      message: 'Von Google Drive getrennt.',
      duration: 2000,
      color: 'medium'
    });
    await toast.present();
  } else {
    const success = await loginToGoogle(true);
    if (success) {
      const toast = await toastController.create({
        message: `Verbunden als ${userEmail.value}`,
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    }
  }
};

const handleManualSync = async () => {
  const loading = await loadingController.create({
    message: 'Synchronisiere mit Google Drive...'
  });
  await loading.present();

  const result = await syncNow(true);
  await loading.dismiss().catch(() => {});

  const toast = await toastController.create({
    message: result.message,
    duration: 3000,
    color: result.success ? 'success' : 'danger'
  });
  await toast.present();
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleExport = async () => {
  try {
    await exportDatabase();
    const toast = await toastController.create({
      message: 'Export erfolgreich gestartet.',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  } catch (error) {
    const toast = await toastController.create({
      message: 'Export fehlgeschlagen.',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
  }
};

const handleImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const alert = await alertController.create({
    header: 'Daten importieren?',
    message: 'Alle aktuellen Daten werden gelöscht und durch die Daten aus dem Backup ersetzt. Dieser Vorgang kann nicht rückgängig gemacht werden.',
    buttons: [
      {
        text: 'Abbrechen',
        role: 'cancel'
      },
      {
        text: 'Importieren',
        role: 'destructive',
        handler: async () => {
          const loading = await loadingController.create({
            message: 'Importiere Daten...'
          });
          await loading.present();

          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            const result = await importDatabase(content);

            await loading.dismiss();

            if (result.success) {
              const toast = await toastController.create({
                message: 'Daten erfolgreich importiert.',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
              target.value = '';
            } else {
              const errorAlert = await alertController.create({
                header: 'Fehler',
                message: 'Der Import ist fehlgeschlagen. Bitte stellen Sie sicher, dass die Datei ein gültiges ShiftHappens-Backup ist.',
                buttons: ['OK']
              });
              await errorAlert.present();
            }
          };
          reader.readAsText(file);
        }
      }
    ]
  });

  await alert.present();
};
</script>

<style scoped>
.settings-field {
  width: 100%;
  padding-bottom: 8px;
}

.field-help {
  display: block;
  font-size: 0.8rem;
  line-height: 1.3;
}

.version-text {
  color: var(--ion-color-medium);
  font-size: 0.8rem;
  margin-top: 20px;
}
</style>
