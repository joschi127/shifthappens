<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ monthName }} {{ currentYear }}</ion-title>
        <ion-buttons slot="end">
          <div class="month-nav-group">
            <ion-button @click="prevMonth" class="compact-nav-btn">
              <ion-icon slot="icon-only" :icon="chevronBackOutline"></ion-icon>
            </ion-button>
            <ion-button @click="goToCurrentMonth" title="Zum aktuellen Monat" class="compact-nav-btn today-nav-btn">
              <ion-icon slot="icon-only" :icon="locateOutline"></ion-icon>
            </ion-button>
            <ion-button @click="nextMonth" class="compact-nav-btn">
              <ion-icon slot="icon-only" :icon="chevronForwardOutline"></ion-icon>
            </ion-button>
          </div>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="calendar-container">
        <!-- Wochentage Header -->
        <div class="weekday-header">
          <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
        </div>

        <!-- Kalender-Gitter -->
        <div class="calendar-grid" ref="calendarGrid">
          <div 
            v-for="{ date, isCurrentMonth, isToday, dayNumber } in calendarDays" 
            :key="date"
            class="calendar-day"
            :class="{ 
              'other-month': !isCurrentMonth, 
              'today': isToday,
              'selected': date === selectedDate 
            }"
            @click="selectDay(date)"
          >
            <div class="day-number">{{ dayNumber }}</div>
            <div class="shift-indicator-container">
              <div 
                v-for="shift in getShiftsForDate(date)" 
                :key="shift.id" 
                class="shift-indicator"
                :class="{ 'crosses-midnight': isShiftCrossingMidnight(shift) }"
                :style="{ backgroundColor: getShiftColor(shift) }"
              >
                {{ getShiftShortName(shift) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste der Schichten am ausgewählten Tag -->
      <div v-if="selectedDate" class="selected-day-info ion-padding">
        <h3>{{ formatDateDisplay(selectedDate) }}</h3>
        <ion-list v-if="selectedDayShifts.length > 0">
          <ion-item-sliding v-for="shift in selectedDayShifts" :key="shift.id">
            <ion-item>
              <ion-label>
                <h2>{{ shift.name }}</h2>
                <p>{{ shift.startTime }} - {{ shift.endTime }} <span v-if="shift.isSplitShift">/ {{ shift.splitStartTime }} - {{ shift.splitEndTime }}</span></p>
              </ion-label>
              <ion-note slot="end" v-if="shift.isNightStandby">Nachtbereitschaft</ion-note>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="danger" @click="deleteShift(shift.id!)">
                <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
        <p v-else>Keine Schichten eingetragen.</p>
        
        <ion-button expand="block" @click="openAddShiftModal">
          <ion-icon slot="start" :icon="addOutline"></ion-icon>
          Schicht hinzufügen
        </ion-button>
      </div>

      <!-- Modal zum Schicht hinzufügen -->
      <ion-modal :is-open="isModalOpen" @didDismiss="isModalOpen = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Schicht hinzufügen</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="isModalOpen = false">Abbrechen</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p>Wähle eine Vorlage für den {{ formatDateDisplay(selectedDate!) }}:</p>
          <ion-list>
            <ion-item v-for="type in shiftTypes" :key="type.id" button @click="addShiftFromType(type)">
              <div slot="start" class="color-dot" :style="{ backgroundColor: type.color }"></div>
              <ion-label>
                <h2>{{ type.name }}</h2>
                <p>{{ type.startTime }} - {{ type.endTime }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <div v-if="shiftTypes.length === 0" class="ion-padding ion-text-center">
            <p>Keine Schicht-Vorlagen vorhanden.</p>
            <ion-button router-link="/shift-types/new" @click="isModalOpen = false">Vorlage erstellen</ion-button>
          </div>
        </ion-content>
      </ion-modal>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonButton, IonIcon, IonList, IonItem, IonLabel, IonNote, IonModal,
  IonItemSliding, IonItemOptions, IonItemOption, alertController,
  IonBackButton
} from '@ionic/vue';
import { 
  chevronBackOutline, chevronForwardOutline, 
  addOutline, trashOutline, locateOutline 
} from 'ionicons/icons';
import { db, Shift, ShiftType } from '../db';
import { liveQuery } from 'dexie';
import { toISODateString, crossesMidnight, getNextDayISO } from '../utils/timeUtils';

const today = new Date();
const currentMonth = ref(today.getMonth());
const currentYear = ref(today.getFullYear());
const selectedDate = ref<string>(toISODateString(today));

const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const monthNames = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const monthName = computed(() => monthNames[currentMonth.value]);

// Daten aus DB
const shifts = ref<Shift[]>([]);
const shiftTypes = ref<ShiftType[]>([]);

let shiftsObservable: any;
let shiftTypesObservable: any;

const calendarGrid = ref<HTMLElement | null>(null);

onMounted(() => {
  shiftsObservable = liveQuery(() => db.shifts.toArray()).subscribe({
    next: (data) => shifts.value = data
  });
  shiftTypesObservable = liveQuery(() => db.shiftTypes.orderBy('order').toArray()).subscribe({
    next: (data) => shiftTypes.value = data
  });

  // Zellbreite berechnen und als CSS Variable setzen
  // Wir nutzen nextTick und eine kleine Verzögerung, um sicherzustellen, dass das Layout gerendert ist
  nextTick(() => {
    setTimeout(updateCellWidth, 100);
  });
  window.addEventListener('resize', updateCellWidth);
});

const calendarDays = computed(() => {
  const days = [];
  const firstDayOfMonth = new Date(currentYear.value, currentMonth.value, 1);
  const lastDayOfMonth = new Date(currentYear.value, currentMonth.value + 1, 0);
  
  // Wochentag des ersten Tages (0=So, 1=Mo, ..., 6=Sa) -> umrechnen auf Mo=0
  let firstDayWeekday = firstDayOfMonth.getDay();
  firstDayWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;
  
  // Tage vom Vormonat
  const prevMonthLastDay = new Date(currentYear.value, currentMonth.value, 0).getDate();
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const d = new Date(currentYear.value, currentMonth.value - 1, prevMonthLastDay - i);
    days.push({
      date: toISODateString(d),
      isCurrentMonth: false,
      isToday: false,
      dayNumber: d.getDate()
    });
  }
  
  // Tage des aktuellen Monats
  const todayStr = toISODateString(new Date());
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(currentYear.value, currentMonth.value, i);
    const dateStr = toISODateString(d);
    days.push({
      date: dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      dayNumber: i
    });
  }
  
  // Tage des Folgemonats auffüllen bis 42 (6 Wochen)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const d = new Date(currentYear.value, currentMonth.value + 1, i);
    days.push({
      date: toISODateString(d),
      isCurrentMonth: false,
      isToday: false,
      dayNumber: i
    });
  }
  
  return days;
});

// Auch bei Änderungen der Kalendertage neu berechnen
watch(calendarDays, () => {
  nextTick(() => {
    updateCellWidth();
  });
});

onUnmounted(() => {
  if (shiftsObservable) shiftsObservable.unsubscribe();
  if (shiftTypesObservable) shiftTypesObservable.unsubscribe();
  window.removeEventListener('resize', updateCellWidth);
});

const updateCellWidth = () => {
  requestAnimationFrame(() => {
    if (calendarGrid.value) {
      const firstDay = calendarGrid.value.querySelector('.calendar-day');
      if (firstDay) {
        const width = (firstDay as HTMLElement).offsetWidth;
        if (width > 0) {
          calendarGrid.value.style.setProperty('--cell-width', `${width}px`);
        } else {
          // Falls immer noch 0, nochmal probieren
          setTimeout(updateCellWidth, 200);
        }
      }
    }
  });
};

const selectedDayShifts = computed(() => {
  if (!selectedDate.value || !shifts.value) return [];
  const dayShifts = shifts.value.filter(s => s.date === selectedDate.value);
  return dayShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
});

const getShiftsForDate = (date: string) => {
  if (!shifts.value) return [];
  
  // Schichten an diesem Tag zurückgeben und nach Startzeit sortieren
  const dayShifts = shifts.value.filter(s => s.date === date);
  return dayShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
};

/**
 * Prüft, ob eine Schicht (Haupt, Split oder Standby) über Mitternacht geht.
 */
const isShiftCrossingMidnight = (shift: Shift) => {
  const type = shiftTypes.value?.find(t => t.id === shift.shiftTypeId);
  
  // Zeiten von der Schicht oder als Fallback von der Vorlage
  const startTime = shift.startTime;
  const endTime = shift.endTime;
  const splitStartTime = shift.splitStartTime || type?.splitStartTime;
  const splitEndTime = shift.splitEndTime || type?.splitEndTime;
  const standbyStartTime = shift.nightStandbyStartTime || type?.nightStandbyStartTime;
  const standbyEndTime = shift.nightStandbyEndTime || type?.nightStandbyEndTime;

  const mainCrosses = crossesMidnight(startTime, endTime);
  const splitCrosses = shift.isSplitShift && splitStartTime && splitEndTime ? crossesMidnight(splitStartTime, splitEndTime) : false;
  const standbyCrosses = shift.isNightStandby && standbyStartTime && standbyEndTime ? crossesMidnight(standbyStartTime, standbyEndTime) : false;
  
  return mainCrosses || splitCrosses || standbyCrosses;
};

const getShiftColor = (shift: Shift) => {
  const type = shiftTypes.value?.find(t => t.id === shift.shiftTypeId);
  return type?.color || '#cccccc';
};

const getShiftShortName = (shift: Shift) => {
  if (!shift.name) return '';
  return shift.name.substring(0, 2).toUpperCase();
};

const selectDay = (date: string) => {
  selectedDate.value = date;
};

const goToCurrentMonth = () => {
  const now = new Date();
  currentMonth.value = now.getMonth();
  currentYear.value = now.getFullYear();
  selectedDate.value = toISODateString(now);
};

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
};

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
};

const formatDateDisplay = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

// Schicht hinzufügen
const isModalOpen = ref(false);
const openAddShiftModal = () => {
  isModalOpen.value = true;
};

const addShiftFromType = async (type: ShiftType) => {
  const newShift: Shift = {
    date: selectedDate.value,
    shiftTypeId: type.id,
    name: type.name,
    startTime: type.startTime,
    endTime: type.endTime,
    pauseMinutes: type.defaultPauseMinutes || 0,
    isNightStandby: type.hasNightStandby,
    nightStandbyStartTime: type.nightStandbyStartTime,
    nightStandbyEndTime: type.nightStandbyEndTime,
    notes: '',
    isSplitShift: type.isSplitShift,
    splitStartTime: type.splitStartTime,
    splitEndTime: type.splitEndTime
  };
  
  await db.shifts.add(newShift);
  isModalOpen.value = false;
};

const deleteShift = async (id: number) => {
  const alert = await alertController.create({
    header: 'Schicht löschen',
    message: 'Möchten Sie diese Schicht wirklich aus dem Kalender entfernen?',
    buttons: [
      {
        text: 'Abbrechen',
        role: 'cancel'
      },
      {
        text: 'Löschen',
        role: 'destructive',
        handler: async () => {
          await db.shifts.delete(id);
        }
      }
    ]
  });
  await alert.present();
};

</script>

<style scoped>
.calendar-container {
  background: var(--ion-color-light);
  border-bottom: 1px solid var(--ion-color-step-150);
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-weight: bold;
  padding: 8px 0;
  background: var(--ion-color-step-50);
  font-size: 0.8rem;
  color: var(--ion-color-step-600);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  aspect-ratio: 1 / 1;
  border: 0.5px solid var(--ion-color-step-100);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 4px;
  background: var(--ion-background-color);
  position: relative;
  min-height: 50px;
}

.calendar-day.other-month {
  background: var(--ion-color-step-50);
  color: var(--ion-color-step-400);
}

.calendar-day.today {
  font-weight: bold;
}

.calendar-day.selected {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: -2px;
  z-index: 10;
}

.calendar-day.today .day-number {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-radius: 50%;
}

.day-number {
  font-size: 0.9rem;
  margin-bottom: 2px;
  min-width: 24px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: start;
  padding: 5px;
}

.shift-indicator-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 2px;
  width: 100%;
  padding: 0 4px 0 0;
}

.shift-indicator {
  width: 18px;
  height: 18px;
  margin-left: 4px;
  border-radius: 4px;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  text-shadow: 0px 0px 2px rgba(0,0,0,0.5);
  position: relative;
  overflow: hidden;
}

.shift-indicator.crosses-midnight {
  width: calc(var(--cell-width, 61px) * 0.5 + 18px + 10px);
  z-index: 5;
  margin-left: 15px;
  margin-right: calc((var(--cell-width, 61px) * 0.5 + 10px + 10px) * -1);
  border-radius: 4px;
}

.selected-day-info h3 {
  margin-top: 0;
  font-size: 1.1rem;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 12px;
}

.month-nav-group {
  display: flex;
  align-items: center;
  gap: 0px;
}

.compact-nav-btn {
  --padding-start: 4px;
  --padding-end: 4px;
  --padding-top: 4px;
  --padding-bottom: 4px;
  margin: 0 1px;
  height: 32px;
}

.today-nav-btn {
  height: 28px;
  --padding-start: 2px;
  --padding-end: 2px;
}

.today-nav-btn ion-icon {
  font-size: 16px;
}
</style>
