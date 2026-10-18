<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Open-Source-Lizenzen</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <p class="ion-padding-horizontal intro">
        ShiftHappens verwendet die folgenden Open-Source-Bibliotheken. Wir danken allen Beteiligten.
        Antippen zeigt den Lizenztext.
      </p>

      <p v-if="error" class="ion-padding-horizontal error">
        Die Liste konnte nicht geladen werden. Bitte mit Internetverbindung erneut öffnen.
      </p>
      <div v-else-if="!licenses" class="ion-text-center ion-padding">
        <ion-spinner></ion-spinner>
      </div>

      <ion-accordion-group v-else :multiple="true" class="licenses">
        <ion-accordion v-for="entry in licenses" :key="entry.name" :value="entry.name">
          <ion-item slot="header">
            <ion-label>
              <h2>{{ entry.name }}</h2>
              <p>{{ [entry.version, entry.license].filter(Boolean).join(' · ') }}</p>
            </ion-label>
          </ion-item>
          <div slot="content" class="license-content">
            <p v-if="entry.author" class="meta">{{ entry.author }}</p>
            <p v-if="entry.homepage" class="meta">
              <a :href="entry.homepage" target="_blank" rel="noopener noreferrer">{{ entry.homepage }}</a>
            </p>
            <p v-if="entry.note" class="meta">{{ entry.note }}</p>
            <template v-for="text in entry.texts" :key="text.file">
              <h3>{{ text.file }}</h3>
              <pre>{{ text.text }}</pre>
            </template>
          </div>
        </ion-accordion>
      </ion-accordion-group>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { onMounted, ref } from 'vue';

// Aufbau wie in scripts/third-party-licenses.mjs erzeugt (licenses.json, ADR 0015)
interface LicenseEntry {
  name: string;
  version?: string;
  license: string;
  author?: string;
  homepage?: string;
  note?: string;
  texts: { file: string; text: string }[];
}

const licenses = ref<LicenseEntry[] | null>(null);
const error = ref(false);

onMounted(async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}licenses.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    licenses.value = await response.json();
  } catch (e) {
    console.error('Lizenzliste nicht geladen', e);
    error.value = true;
  }
});
</script>

<style scoped>
.intro {
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.error {
  color: var(--ion-color-danger);
}

.license-content {
  padding: 8px 16px 16px;
}

.meta {
  margin: 0 0 6px;
  font-size: 0.85rem;
  color: var(--ion-color-medium);
  overflow-wrap: anywhere;
}

h3 {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 12px 0 4px;
}

pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 0.72rem;
  line-height: 1.35;
  margin: 0;
  padding: 8px;
  border-radius: 6px;
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
}
</style>
