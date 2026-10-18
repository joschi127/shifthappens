<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/shift-types"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEdit ? 'Vorlage bearbeiten' : 'Neue Vorlage' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="save">Speichern</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
        <ion-list>
          <ion-item>
            <ion-label position="stacked">Name</ion-label>
            <ion-input v-model="form.name" placeholder="z.B. Frühschicht"></ion-input>
          </ion-item>

          <ion-item>
            <div class="codes-field">
              <ion-label position="stacked">Schichtkürzel im Dienstplan</ion-label>
              <tag-list-input v-model="codes" placeholder="z.B. F"></tag-list-input>
              <ion-note class="field-help">
                Genau so eingeben, wie die Schicht auf dem Papier-Dienstplan steht (z.B. F, F1 oder Früh).
                Wird für die automatische Erkennung beim Dienstplan-Import genutzt. Mehrere Kürzel möglich.
              </ion-note>
            </div>
          </ion-item>

        <ion-item>
          <ion-label position="stacked">Farbe</ion-label>
          <div class="color-row">
            <div 
              v-for="color in PREDEFINED_COLORS" 
              :key="color.value"
              class="color-option"
              :style="{ backgroundColor: color.value }"
              :class="{ 'selected': form.color === color.value }"
              @click="form.color = color.value"
            >
              <div v-if="form.color === color.value" class="checkmark">✓</div>
            </div>
          </div>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Beginn</ion-label>
          <ion-datetime-button datetime="startTime"></ion-datetime-button>
          <ion-modal :keep-contents-mounted="true">
            <ion-datetime 
              id="startTime" 
              presentation="time" 
              hour-cycle="h23"
              v-model="form.startTime"
              @ionChange="onTimeChange"
            ></ion-datetime>
          </ion-modal>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Ende</ion-label>
          <ion-datetime-button datetime="endTime"></ion-datetime-button>
          <ion-modal :keep-contents-mounted="true">
            <ion-datetime 
              id="endTime" 
              presentation="time" 
              hour-cycle="h23"
              v-model="form.endTime"
              @ionChange="onTimeChange"
            ></ion-datetime>
          </ion-modal>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Standardpause (Minuten)</ion-label>
          <ion-input type="number" v-model.number="form.defaultPauseMinutes"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label>Nachtbereitschaft</ion-label>
          <ion-toggle v-model="form.hasNightStandby"></ion-toggle>
        </ion-item>

        <template v-if="form.hasNightStandby">
          <ion-item>
            <ion-label position="stacked">Bereitschaft Beginn</ion-label>
            <ion-datetime-button datetime="standbyStart"></ion-datetime-button>
            <ion-modal :keep-contents-mounted="true">
              <ion-datetime 
                id="standbyStart" 
                presentation="time" 
                hour-cycle="h23"
                v-model="form.nightStandbyStartTime"
              ></ion-datetime>
            </ion-modal>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Bereitschaft Ende</ion-label>
            <ion-datetime-button datetime="standbyEnd"></ion-datetime-button>
            <ion-modal :keep-contents-mounted="true">
              <ion-datetime 
                id="standbyEnd" 
                presentation="time" 
                hour-cycle="h23"
                v-model="form.nightStandbyEndTime"
              ></ion-datetime>
            </ion-modal>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Anrechnung (%)</ion-label>
            <ion-input type="number" v-model.number="form.nightStandbyPercentage" placeholder="z.B. 25"></ion-input>
          </ion-item>
        </template>

        <ion-item>
          <ion-label>Geteilte Schicht</ion-label>
          <ion-toggle v-model="form.isSplitShift"></ion-toggle>
        </ion-item>

        <template v-if="form.isSplitShift">
          <ion-item>
            <ion-label position="stacked">2. Teil Beginn</ion-label>
            <ion-datetime-button datetime="splitStartTime"></ion-datetime-button>
            <ion-modal :keep-contents-mounted="true">
              <ion-datetime 
                id="splitStartTime" 
                presentation="time" 
                hour-cycle="h23"
                v-model="form.splitStartTime"
              ></ion-datetime>
            </ion-modal>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">2. Teil Ende</ion-label>
            <ion-datetime-button datetime="splitEndTime"></ion-datetime-button>
            <ion-modal :keep-contents-mounted="true">
              <ion-datetime 
                id="splitEndTime" 
                presentation="time" 
                hour-cycle="h23"
                v-model="form.splitEndTime"
              ></ion-datetime>
            </ion-modal>
          </ion-item>
        </template>
      </ion-list>

      <div class="summary-card ion-padding">
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>Zusammenfassung</ion-card-subtitle>
            <ion-card-title>Gesamt-Arbeitszeit</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="time-breakdown">
              <div class="time-row">
                <span>Hauptschicht:</span>
                <span>{{ formatDuration(timeDetails.main) }}</span>
              </div>
              <div v-if="timeDetails.pause > 0" class="time-row pause">
                <span>Pause:</span>
                <span>- {{ formatDuration(timeDetails.pause) }}</span>
              </div>
              <div v-if="form.hasNightStandby" class="time-row standby">
                <span>Nachtbereitschaft ({{ form.nightStandbyPercentage }}%):</span>
                <span>+ {{ formatDuration(timeDetails.standby) }}</span>
              </div>
              <div v-if="form.isSplitShift" class="time-row split">
                <span>2. Schichthälfte:</span>
                <span>+ {{ formatDuration(timeDetails.split) }}</span>
              </div>
            </div>
            
            <div class="total-divider"></div>

            <div class="total-time">
              {{ formattedTotalTime }}
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <div v-if="isEdit" class="ion-padding">
        <ion-button expand="block" color="danger" fill="outline" @click="confirmDelete">
          Vorlage löschen
        </ion-button>
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
  IonItem,
  IonLabel,
  IonInput,
  IonButtons,
  IonBackButton,
  IonButton,
  IonToggle,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonNote,
  toastController,
  alertController
} from '@ionic/vue';
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { db, ShiftType } from '../db';
import { calculateLegalPause } from '../utils/pauseCalculator';
import { PREDEFINED_COLORS } from '../utils/colors';
import { addHours, formatToHHmm, getDurationMinutes, formatDuration } from '../utils/timeUtils';
import { watch } from 'vue';
import TagListInput from '../components/TagListInput.vue';
import { markLocalModified } from '../services/googleDriveService';
import { getImportProfile } from '../services/importSettingsService';
import { sameEntry } from '../utils/tagList';

const route = useRoute();
const router = useRouter();
const isEdit = computed(() => route.params.id !== undefined);

const form = ref<ShiftType>({
  name: '',
  startTime: '08:00',
  endTime: '16:00',
  color: '#3880ff',
  order: 0,
  isSplitShift: false,
  defaultPauseMinutes: 30,
  hasNightStandby: false,
  nightStandbyStartTime: '',
  nightStandbyEndTime: '06:00',
  nightStandbyPercentage: 25,
  codes: []
});

const codes = computed({
  get: () => form.value.codes ?? [],
  set: (value: string[]) => { form.value.codes = value; }
});

// Watcher für Geteilte Schicht Defaults
watch(() => form.value.isSplitShift, (newValue) => {
  if (newValue && !form.value.splitStartTime) {
    const baseEnd = formatToHHmm(form.value.endTime);
    form.value.splitStartTime = addHours(baseEnd, 2);
    form.value.splitEndTime = addHours(form.value.splitStartTime, 2);
  }
});

// Watcher für Nachtbereitschaft Defaults
watch(() => form.value.hasNightStandby, (newValue) => {
  if (newValue && !form.value.nightStandbyStartTime) {
    form.value.nightStandbyStartTime = formatToHHmm(form.value.endTime);
  }
});

const loadShiftType = async () => {
  if (isEdit.value) {
    const id = parseInt(route.params.id as string);
    const data = await db.shiftTypes.get(id);
    if (data) {
      form.value = { ...data };
    }
  }
};

const onTimeChange = () => {
  if (form.value.startTime && form.value.endTime) {
    form.value.defaultPauseMinutes = calculateLegalPause(form.value.startTime, form.value.endTime);
  }
};

// Ein Schichtkürzel muss eindeutig sein, sonst ist die Erkennung beim Import mehrdeutig
const findCodeConflict = async (): Promise<string | null> => {
  const currentId = isEdit.value ? parseInt(route.params.id as string) : undefined;
  const otherTypes = (await db.shiftTypes.toArray()).filter(t => t.id !== currentId);
  const { ignoreCodes } = await getImportProfile();

  for (const code of codes.value) {
    const owner = otherTypes.find(t => t.codes?.some(c => sameEntry(c, code)));
    if (owner) {
      return `Das Kürzel „${code}“ ist bereits bei der Vorlage „${owner.name}“ hinterlegt.`;
    }
    if (ignoreCodes.some(c => sameEntry(c, code))) {
      return `Das Kürzel „${code}“ ist in den Einstellungen als „Kürzel ohne Eintrag“ hinterlegt.`;
    }
  }
  return null;
};

const save = async () => {
  if (!form.value.name) {
    const toast = await toastController.create({
      message: 'Bitte einen Namen eingeben',
      duration: 2000,
      color: 'warning'
    });
    await toast.present();
    return;
  }

  const codeConflict = await findCodeConflict();
  if (codeConflict) {
    const toast = await toastController.create({
      message: codeConflict,
      duration: 3000,
      color: 'warning'
    });
    await toast.present();
    return;
  }

  // Array kopieren: Vue-Proxies lassen sich nicht in IndexedDB speichern
  const data: ShiftType = { ...form.value, codes: [...codes.value] };

  try {
    if (isEdit.value) {
      const id = parseInt(route.params.id as string);
      await db.shiftTypes.put({ ...data, id });
    } else {
      // Höchsten order-Wert ermitteln
      const types = await db.shiftTypes.toArray();
      const nextOrder = types.length > 0 
        ? Math.max(...types.map(t => t.order || 0)) + 1 
        : 0;
      await db.shiftTypes.add({ ...data, order: nextOrder });
    }
    markLocalModified();
    router.back();
  } catch (e) {
    const toast = await toastController.create({
      message: 'Fehler beim Speichern',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
  }
};

const confirmDelete = async () => {
  const alert = await alertController.create({
    header: 'Löschen bestätigen',
    message: 'Möchten Sie diese Schicht-Vorlage wirklich löschen?',
    buttons: [
      { text: 'Abbrechen', role: 'cancel' },
      {
        text: 'Löschen',
        role: 'destructive',
        handler: async () => {
          if (route.params.id) {
            await db.shiftTypes.delete(parseInt(route.params.id as string));
            markLocalModified();
            router.back();
          }
        }
      }
    ]
  });
  await alert.present();
};

const timeDetails = computed(() => {
  const details = {
    main: 0,
    pause: 0,
    split: 0,
    standby: 0,
    standbyReal: 0
  };

  // 1. Hauptschicht
  if (form.value.startTime && form.value.endTime) {
    details.main = getDurationMinutes(form.value.startTime, form.value.endTime);
  }

  // Pause
  if (form.value.defaultPauseMinutes) {
    details.pause = form.value.defaultPauseMinutes;
  }

  // 2. Geteilte Schicht
  if (form.value.isSplitShift && form.value.splitStartTime && form.value.splitEndTime) {
    details.split = getDurationMinutes(form.value.splitStartTime, form.value.splitEndTime);
  }

  // 3. Nachtbereitschaft (anteilig)
  if (form.value.hasNightStandby && form.value.nightStandbyStartTime && form.value.nightStandbyEndTime) {
    details.standbyReal = getDurationMinutes(form.value.nightStandbyStartTime, form.value.nightStandbyEndTime);
    const percentage = form.value.nightStandbyPercentage || 25;
    details.standby = (details.standbyReal * percentage) / 100;
  }

  return details;
});

const totalWorkTimeMinutes = computed(() => {
  const d = timeDetails.value;
  const total = d.main - d.pause + d.split + d.standby;
  return Math.max(0, total);
});

const formattedTotalTime = computed(() => formatDuration(totalWorkTimeMinutes.value));

onMounted(loadShiftType);
</script>

<style scoped>
.color-row {
  display: flex;
  overflow-x: auto;
  gap: 12px;
  padding: 12px 4px;
  width: 100%;
  scrollbar-width: none; /* Firefox */
}

.color-row::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.color-option {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.2s;
}

.color-option.selected {
  border-color: var(--ion-color-dark);
  transform: scale(1.1);
}

.checkmark {
  color: white;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0,0,0,0.5);
}

.codes-field {
  width: 100%;
  padding-bottom: 8px;
}

.field-help {
  display: block;
  font-size: 0.8rem;
  line-height: 1.3;
}

.summary-card {
  padding-bottom: 0;
}

.total-time {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--ion-color-primary);
  margin-top: 8px;
}

.time-breakdown {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}

.time-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}

.time-row.pause {
  color: var(--ion-color-warning);
}

.total-divider {
  height: 1px;
  background-color: var(--ion-color-light);
  margin: 8px 0;
}
</style>
