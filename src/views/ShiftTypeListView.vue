<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Schicht-Vorlagen</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Schicht-Vorlagen</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-list>
        <ion-item-sliding v-for="type in shiftTypes" :key="type.id">
          <ion-item :button="true" @click="editShiftType(type.id)">
            <ion-label>
              <h2>{{ type.name }}</h2>
              <p>
                {{ formatTime(type.startTime) }} - {{ formatTime(type.endTime) }}
                <span v-if="type.isSplitShift" class="split-shift-badge">
                  + {{ formatTime(type.splitStartTime) }} - {{ formatTime(type.splitEndTime) }}
                </span>
                <span v-if="type.hasNightStandby" class="night-standby-badge">
                  + NB ({{ formatTime(type.nightStandbyStartTime) }} - {{ formatTime(type.nightStandbyEndTime) }})
                </span>
              </p>
            </ion-label>
            <div slot="end" :style="{ backgroundColor: type.color, width: '20px', height: '20px', borderRadius: '50%' }"></div>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option color="danger" @click="deleteShiftType(type.id!)">
              Löschen
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div v-if="shiftTypes.length === 0" class="ion-padding ion-text-center">
        <p>Noch keine Schicht-Vorlagen erstellt.</p>
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button router-link="/shift-types/new">
          <ion-icon :icon="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
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
  IonFab,
  IonFabButton,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  alertController,
  onIonViewWillEnter
} from '@ionic/vue';
import { add } from 'ionicons/icons';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { db, ShiftType } from '../db';

const router = useRouter();
const shiftTypes = ref<ShiftType[]>([]);

/**
 * Formatiert eine Zeitangabe (HH:mm oder ISO-String) für die Anzeige.
 */
const formatTime = (time?: string) => {
  if (!time) return '';
  if (time.includes('T')) {
    // Falls es ein ISO-String ist (von ion-datetime)
    return time.split('T')[1].substring(0, 5);
  }
  return time;
};

const loadShiftTypes = async () => {
  const types = await db.shiftTypes.toArray();
  // Nach Startzeit sortieren, dann nach Endzeit
  shiftTypes.value = types.sort((a, b) => {
    // Primär: Startzeit
    const startCompare = a.startTime.localeCompare(b.startTime);
    if (startCompare !== 0) return startCompare;

    // Sekundär: Endzeit (bei geteilten Schichten die letzte Endzeit)
    const endA = a.isSplitShift && a.splitEndTime ? a.splitEndTime : a.endTime;
    const endB = b.isSplitShift && b.splitEndTime ? b.splitEndTime : b.endTime;
    
    return endA.localeCompare(endB);
  });
};

const editShiftType = (id?: number) => {
  if (id) {
    router.push(`/shift-types/edit/${id}`);
  }
};

const deleteShiftType = async (id: number) => {
  const alert = await alertController.create({
    header: 'Löschen bestätigen',
    message: 'Möchten Sie diese Schicht-Vorlage wirklich löschen?',
    buttons: [
      { text: 'Abbrechen', role: 'cancel' },
      {
        text: 'Löschen',
        role: 'destructive',
        handler: async () => {
          await db.shiftTypes.delete(id);
          await loadShiftTypes();
        }
      }
    ]
  });
  await alert.present();
};

onIonViewWillEnter(loadShiftTypes);
</script>

<style scoped>
.split-shift-badge,
.night-standby-badge {
  margin-left: 4px;
}
</style>
