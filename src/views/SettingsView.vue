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
          <ion-label>Datensicherung</ion-label>
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

      <div class="ion-padding">
        <p class="ion-text-center version-text">
          Schichtator v1.0.0
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
  alertController,
  loadingController,
  toastController
} from '@ionic/vue';
import { cloudDownloadOutline, cloudUploadOutline, moon, sunny } from 'ionicons/icons';
import { ref } from 'vue';
import { exportDatabase, importDatabase } from '../services/dbExportService';
import { isDarkMode, toggleDarkMode } from '../services/themeService';

const fileInput = ref<HTMLInputElement | null>(null);

const onToggleDark = (event: CustomEvent) => {
  if (isDarkMode.value !== event.detail.checked) {
    toggleDarkMode();
  }
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
              // Reset file input
              target.value = '';
            } else {
              const errorAlert = await alertController.create({
                header: 'Fehler',
                message: 'Der Import ist fehlgeschlagen. Bitte stellen Sie sicher, dass die Datei ein gültiges Schichtator-Backup ist.',
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
.version-text {
  color: var(--ion-color-medium);
  font-size: 0.8rem;
  margin-top: 20px;
}
</style>
