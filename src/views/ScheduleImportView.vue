<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/calendar"></ion-back-button>
        </ion-buttons>
        <ion-title>Dienstplan importieren</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Schritt 1: Quelle, Monat, Format -->
      <div v-if="step === 'source'" class="ion-padding">
        <p class="intro">
          Fotografiere den Dienstplan oder wähle ein Bild aus. Die Erkennung läuft nur auf diesem Gerät,
          das Foto wird nicht gespeichert.
        </p>

        <ion-list :inset="true">
          <ion-item>
            <ion-select v-model="monthKey" label="Monat" interface="action-sheet">
              <ion-select-option v-for="m in monthOptions" :key="m.key" :value="m.key">{{ m.label }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-select v-model="formatId" label="Aufbau je Person" interface="action-sheet">
              <ion-select-option v-for="f in formats" :key="f.id" :value="f.id">{{ f.name }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <ion-note v-if="!rosterNames.length" class="hint">
          Tipp: Mit deinem „Name im Dienstplan“ (Einstellungen → Dienstplan-Import) findet die App deine Zeile automatisch.
        </ion-note>
        <ion-note v-if="!templates.length" class="hint warning">
          Es gibt noch keine Schicht-Vorlagen mit Schichtkürzeln. Lege zuerst Vorlagen an, z.B. „Frühdienst“ mit Kürzel „F01“.
        </ion-note>

        <ion-button expand="block" @click="cameraInput?.click()">
          <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
          Foto aufnehmen
        </ion-button>
        <ion-button expand="block" fill="outline" @click="fileInput?.click()">
          <ion-icon slot="start" :icon="imageOutline"></ion-icon>
          Bild auswählen
        </ion-button>
        <input ref="cameraInput" type="file" accept="image/*" capture="environment" hidden @change="onFile" />
        <input ref="fileInput" type="file" accept="image/*,application/pdf" hidden @change="onFile" />
      </div>

      <!-- Schritt 2: Bereich -->
      <div v-else-if="step === 'region' && image" class="region-step">
        <p class="ion-padding-horizontal step-text">
          {{ regionMessage }}
        </p>
        <region-selector v-model:corners="corners" :image="image"></region-selector>
        <div class="ion-padding">
          <div class="rotate-row">
            <ion-button fill="outline" size="small" @click="rotate('ccw')">
              <ion-icon slot="start" :icon="refreshOutline" class="mirror"></ion-icon>
              Drehen
            </ion-button>
            <ion-button fill="outline" size="small" @click="rotate('cw')">
              <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
              Drehen
            </ion-button>
            <ion-button fill="clear" size="small" :disabled="busy" @click="findOwnBlock()">Automatisch suchen</ion-button>
          </div>
          <ion-button expand="block" :disabled="busy" @click="runRecognition">Weiter: Erkennen</ion-button>
          <ion-button expand="block" fill="clear" @click="reset">Anderes Bild</ion-button>
        </div>
      </div>

      <!-- Erkennung läuft -->
      <div v-if="busy" class="ion-padding busy">
        <p>{{ busyText }}</p>
        <ion-progress-bar :value="progress ?? 0" :type="progress === null ? 'indeterminate' : 'determinate'"></ion-progress-bar>
      </div>

      <!-- Schritt 3: Bestätigen -->
      <div v-if="step === 'confirm' && !busy">
        <p class="ion-padding-horizontal step-text">
          Bitte prüfen. Gelb markierte Tage sind unsicher erkannt: antippen und bestätigen oder korrigieren.
          Unbestätigte werden mit „?!“ gespeichert.
        </p>
        <ion-list>
          <ion-item v-for="(day, index) in proposals" :key="day.date" :class="{ 'uncertain-row': dayIsUncertain(day) }" lines="full">
            <div slot="start" class="date-cell">
              <span class="weekday">{{ weekdayOf(day.date) }}</span>
              <span>{{ day.date.slice(8, 10) }}.</span>
            </div>
            <div class="items">
              <span v-if="day.consumedByPrevious" class="muted">Folgetag (gehört zum Vortag)</span>
              <button
                v-for="(item, itemIndex) in day.items"
                :key="itemIndex"
                type="button"
                class="chip"
                :class="item.status"
                :style="chipStyle(item)"
                @click="openAssign(index, itemIndex)"
              >
                <span v-if="item.status !== 'ok'" class="flag">?!</span>
                {{ chipLabel(item) }}
              </button>
              <button v-if="!day.items.length && !day.consumedByPrevious" type="button" class="chip free" :class="{ uncertain: day.uncertainEmpty }" @click="openAssign(index, -1)">
                <span v-if="day.uncertainEmpty" class="flag">?!</span>
                frei
              </button>
              <div v-for="conflict in conflictsOf(day.date)" :key="conflict.shift.date + conflict.shift.name" class="conflict">
                <ion-checkbox :checked="conflict.include" label-placement="end" @ionChange="conflict.include = $event.detail.checked">
                  Eigene Schicht „{{ conflict.manualConflicts.map(s => s.name).join(', ') }}“ vorhanden – trotzdem hinzufügen
                </ion-checkbox>
              </div>
              <div v-for="replaced in manuallyChangedOf(day.date)" :key="'m' + replaced.shift.date" class="conflict muted">
                Von Hand geänderte importierte Schicht wird überschrieben.
                <ion-checkbox :checked="replaced.include" label-placement="end" @ionChange="replaced.include = $event.detail.checked">überschreiben</ion-checkbox>
              </div>
            </div>
          </ion-item>
        </ion-list>

        <div v-if="plan && plan.removals.length" class="ion-padding-horizontal">
          <ion-checkbox :checked="applyRemovals" label-placement="end" @ionChange="applyRemovals = $event.detail.checked">
            {{ plan.removals.length }} früher importierte Schicht(en) fehlen in dieser Fassung und werden entfernt
          </ion-checkbox>
        </div>

        <div class="ion-padding">
          <ion-button expand="block" :disabled="busy" @click="save">Speichern</ion-button>
          <ion-button expand="block" fill="clear" @click="step = 'region'">Zurück zum Bereich</ion-button>
        </div>
      </div>

      <!-- Zuordnung einer Zelle -->
      <ion-modal :is-open="assign !== null" :initial-breakpoint="0.75" :breakpoints="[0, 0.75, 1]" @didDismiss="assign = null">
        <ion-content class="ion-padding">
          <h3>{{ assignTitle }}</h3>
          <p v-if="assignItem && assignItem.status === 'unknown'" class="muted">
            Das Kürzel „{{ assignItem.code }}“ ist keiner Vorlage zugeordnet.
          </p>
          <ion-item v-if="assignItem && assignItem.status === 'unknown' && !isCombo(assignItem.code)" lines="none">
            <ion-checkbox v-model="rememberCode" label-placement="end">Kürzel „{{ assignItem.code }}“ an der gewählten Vorlage merken</ion-checkbox>
          </ion-item>
          <ion-list>
            <ion-item v-for="t in templates" :key="t.id" button @click="choose(t.id!)">
              <div slot="start" class="color-dot" :style="{ backgroundColor: t.color }"></div>
              <ion-label>
                <h2>{{ t.name }}</h2>
                <p>{{ t.kind === 'absence' ? 'Abwesenheit' : `${t.startTime} - ${t.endTime}` }} · {{ (t.codes ?? []).join(', ') || 'ohne Kürzel' }}</p>
              </ion-label>
            </ion-item>
            <ion-item button @click="choose(null)">
              <ion-label><h2>Kein Eintrag (frei)</h2></ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonNote, IonSelect, IonSelectOption, IonProgressBar, IonModal, IonCheckbox,
  toastController, alertController
} from '@ionic/vue';
import { cameraOutline, imageOutline, refreshOutline } from 'ionicons/icons';
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { db, ImportTemplate, ShiftType } from '../db';
import RegionSelector from '../components/import/RegionSelector.vue';
import { getImportProfile, getImportTemplates, saveImportTemplates } from '../services/importSettingsService';
import { markLocalModified } from '../services/googleDriveService';
import { Quad } from '../import/geometry';
import { Raster, rotate90 } from '../import/raster';
import { ImageInputError, loadImageFile } from '../import/imageInput';
import { getBrowserEngine, releaseBrowserEngine } from '../import/browserEngine';
import { findBlock } from '../import/blockFinder';
import { recognizeOwnBlock } from '../import/recognizeOwnBlock';
import { DayProposal, DayReading, ProposalItem, resolveShifts } from '../import/resolveShifts';
import { ImportPlan, PlannedShift, planImport } from '../import/importPlan';
import { IMPORT_FORMATS, learnedBlockRatio, mergeFormats } from '../import/formats';
import { parseShiftCode, sameShiftCode } from '../utils/shiftCodes';

const route = useRoute();
const router = useRouter();

type Step = 'source' | 'region' | 'confirm';
const step = ref<Step>('source');
const busy = ref(false);
const busyText = ref('');
const progress = ref<number | null>(null);

// ---------- Monat ----------
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const now = new Date();
const keyOf = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
const monthOptions = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(now.getFullYear(), now.getMonth() - 1 + i, 1);
  return { key: keyOf(d.getFullYear(), d.getMonth() + 1), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
});
// Vorschlag: übergebener Monat (aus dem Kalender) oder nächster Monat
const initialMonth = typeof route.query.month === 'string' && /^\d{4}-\d{2}$/.test(route.query.month)
  ? route.query.month : monthOptions[2].key;
if (!monthOptions.some(m => m.key === initialMonth)) {
  const [y, m] = initialMonth.split('-').map(Number);
  monthOptions.unshift({ key: initialMonth, label: `${MONTHS[m - 1]} ${y}` });
}
const monthKey = ref(initialMonth);
const year = computed(() => Number(monthKey.value.slice(0, 4)));
const month = computed(() => Number(monthKey.value.slice(5, 7)));
const daysInMonth = computed(() => new Date(year.value, month.value, 0).getDate());

// ---------- Einstellungen und Vorlagen ----------
const templates = ref<ShiftType[]>([]);
const rosterNames = ref<string[]>([]);
const ignoreCodes = ref<string[]>([]);
const formats = ref<ImportTemplate[]>(IMPORT_FORMATS);
const formatId = ref(IMPORT_FORMATS[0].id);
const format = computed(() => formats.value.find(f => f.id === formatId.value) ?? IMPORT_FORMATS[0]);

onMounted(async () => {
  templates.value = await db.shiftTypes.orderBy('order').toArray();
  const profile = await getImportProfile();
  rosterNames.value = profile.rosterNames;
  ignoreCodes.value = profile.ignoreCodes;
  const saved = await getImportTemplates();
  formats.value = mergeFormats(saved);
  const lastUsed = saved.find(s => s.lastUsed);
  if (lastUsed) formatId.value = lastUsed.id;
});

// Erkennung im Speicher wieder freigeben, wenn die Ansicht verlassen wird
onUnmounted(() => { releaseBrowserEngine(); });

// ---------- Bild ----------
const cameraInput = ref<HTMLInputElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const image = shallowRef<Raster | null>(null);
const corners = ref<Quad>([[0, 0], [1, 0], [1, 1], [0, 1]]);
const regionMessage = ref('');

const defaultCorners = (img: Raster): Quad => {
  const mx = img.width * 0.15, my = img.height * 0.4;
  return [[mx, my], [img.width - mx, my], [img.width - mx, my + img.height * 0.12], [mx, my + img.height * 0.12]];
};

const toast = async (message: string, color = 'medium') => {
  const t = await toastController.create({ message, duration: 3500, color });
  await t.present();
};

const onFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    busy.value = true; busyText.value = 'Bild wird geladen …'; progress.value = null;
    image.value = await loadImageFile(file);
    step.value = 'region';
    await findOwnBlock();
  } catch (error) {
    await toast(error instanceof ImageInputError ? error.message : 'Das Bild konnte nicht verarbeitet werden.', 'danger');
  } finally {
    busy.value = false;
  }
};

const rotate = async (direction: 'cw' | 'ccw') => {
  if (!image.value) return;
  image.value = rotate90(image.value, direction);
  corners.value = defaultCorners(image.value);
  await findOwnBlock(false);
};

// Sucht den eigenen Block; findet sie nichts, werden (beim ersten Versuch) beide Drehungen um 90° probiert,
// denn Querformat-Pläne werden oft im Hochformat fotografiert
const findOwnBlock = async (tryRotations = true) => {
  if (!image.value) return;
  if (!rosterNames.value.length) {
    corners.value = defaultCorners(image.value);
    regionMessage.value = 'Ziehe die vier Ecken auf deinen Block: von der ersten bis zur letzten Tagesspalte, alle Zeilen deiner Person, ohne Namensspalte.';
    return;
  }
  busy.value = true; busyText.value = 'Deine Zeile wird gesucht (beim ersten Mal werden die Erkennungsdaten geladen) …'; progress.value = null;
  try {
    const engine = await getBrowserEngine();
    const search = async (img: Raster) => {
      const { words } = await engine.recognize(img, { mode: 'sparse' });
      return findBlock(img, words, { rosterNames: rosterNames.value, days: daysInMonth.value, blockRatio: format.value.blockRatio ?? 2.9 });
    };
    let match = await search(image.value);
    for (const direction of tryRotations && !match ? (['cw', 'ccw'] as const) : []) {
      busyText.value = 'Deine Zeile wird im gedrehten Bild gesucht …';
      const rotated = rotate90(image.value, direction);
      match = await search(rotated);
      if (match) { image.value = rotated; break; }
    }
    if (match) {
      corners.value = match.corners;
      regionMessage.value = match.partialName
        ? 'Deine Zeile wurde anhand eines Namensteils gefunden. Bitte prüfen und die Ecken bei Bedarf verschieben.'
        : 'Deine Zeile wurde gefunden. Bitte prüfen: Die Ecken sollen den Block von der ersten bis zur letzten Tagesspalte umfassen.';
    } else {
      corners.value = defaultCorners(image.value);
      regionMessage.value = 'Deine Zeile wurde nicht automatisch gefunden. Ist das Bild richtig herum? Sonst bitte drehen oder die Ecken selbst setzen.';
    }
  } catch (error) {
    console.error(error);
    corners.value = defaultCorners(image.value);
    regionMessage.value = 'Die automatische Suche ist fehlgeschlagen. Bitte die Ecken selbst setzen.';
  } finally {
    busy.value = false;
  }
};

const reset = () => { image.value = null; step.value = 'source'; proposals.value = []; plan.value = null; };

// ---------- Erkennung ----------
const proposals = ref<DayProposal[]>([]);
const plan = ref<ImportPlan | null>(null);
const applyRemovals = ref(true);

// Seitenverhältnis des bestätigten Blocks für die nächste automatische Suche merken
const learnBlockRatio = async () => {
  const learned = learnedBlockRatio(corners.value, daysInMonth.value, format.value);
  const saved = (await getImportTemplates()).map(t => ({ ...t, lastUsed: false }));
  const entry = { ...format.value, blockRatio: learned ?? format.value.blockRatio, lastUsed: true };
  await saveImportTemplates([...saved.filter(t => t.id !== entry.id), entry]);
  formats.value = mergeFormats([...saved.filter(t => t.id !== entry.id), entry]);
};

// Alle einzelnen Kürzel aus den Vorlagen (auch Teile von Kombinationen) als bekannter Wortschatz
const vocabulary = () => {
  const duty = new Set<string>(ignoreCodes.value), absence = new Set<string>();
  for (const t of templates.value) for (const c of t.codes ?? []) {
    const p = parseShiftCode(c);
    if (!p) continue;
    const parts = p.type === 'single' ? [p.code] : [p.first, p.second];
    for (const part of parts) { duty.add(part); if (t.kind === 'absence') absence.add(part); }
  }
  return { duty: [...duty], absence: [...absence] };
};

const runRecognition = async () => {
  if (!image.value) return;
  busy.value = true; progress.value = 0; busyText.value = 'Dienstplan wird erkannt …';
  try {
    await learnBlockRatio();
    const f = format.value;
    const engine = await getBrowserEngine();
    // Nachbarblöcke dienen nur als zusätzliche Beispiele, übernommen wird nur der eigene Block
    const person = await recognizeOwnBlock(image.value, corners.value, daysInMonth.value,
      { subRows: f.subRows ?? 1, dutyRow: f.dutyRow ?? 0, absenceRow: f.absenceRow, standbyRow: f.standbyRow },
      vocabulary(), engine, { onProgress: (done, total) => { progress.value = done / total; } });
    const days: DayReading[] = person.duty.map((duty, d) => ({ duty, absence: person.absence?.[d], standby: person.standby?.[d] }));
    proposals.value = resolveShifts(days, { templates: templates.value, ignoreCodes: ignoreCodes.value, year: year.value, month: month.value });
    await refreshPlan();
    step.value = 'confirm';
  } catch (error) {
    console.error(error);
    await toast('Die Erkennung ist fehlgeschlagen. Bitte erneut versuchen.', 'danger');
  } finally {
    busy.value = false;
  }
};

const refreshPlan = async () => {
  const existing = await db.shifts.where('date').startsWith(monthKey.value).toArray();
  const previous = plan.value;
  plan.value = planImport(proposals.value, templates.value, existing, previous?.importId ?? `import-${Date.now()}`);
  // Entscheidungen zu Konflikten beibehalten
  if (previous) for (const p of plan.value.planned) {
    const old = previous.planned.find(o => o.shift.date === p.shift.date && o.shift.shiftTypeId === p.shift.shiftTypeId);
    if (old) p.include = old.include;
  }
};

// ---------- Bestätigungsansicht ----------
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const weekdayOf = (date: string) => WEEKDAYS[new Date(`${date}T12:00:00`).getDay()];
const templateOf = (id?: number) => templates.value.find(t => t.id === id);
const chipLabel = (item: ProposalItem) => templateOf(item.shiftTypeId)?.name ?? `„${item.code}“ zuordnen`;
const chipStyle = (item: ProposalItem) => {
  const color = templateOf(item.shiftTypeId)?.color;
  return color ? { borderColor: color, backgroundColor: item.kind === 'absence' ? 'transparent' : `${color}22` } : {};
};
const dayIsUncertain = (day: DayProposal) => day.uncertainEmpty || day.items.some(i => i.status !== 'ok');
const conflictsOf = (date: string): PlannedShift[] => plan.value?.planned.filter(p => p.shift.date === date && p.manualConflicts.length) ?? [];
const manuallyChangedOf = (date: string): PlannedShift[] => plan.value?.planned.filter(p => p.shift.date === date && p.manuallyChanged) ?? [];
const isCombo = (code: string) => parseShiftCode(code)?.type === 'combo';

const assign = ref<{ day: number; item: number } | null>(null);
const rememberCode = ref(true);
const assignItem = computed(() => assign.value && assign.value.item >= 0 ? proposals.value[assign.value.day].items[assign.value.item] : null);
const assignTitle = computed(() => {
  if (!assign.value) return '';
  const d = proposals.value[assign.value.day].date;
  return `${weekdayOf(d)} ${d.slice(8, 10)}.${d.slice(5, 7)}.: Zuordnung`;
});
const openAssign = (day: number, item: number) => { rememberCode.value = true; assign.value = { day, item }; };

const choose = async (shiftTypeId: number | null) => {
  if (!assign.value) return;
  const day = proposals.value[assign.value.day];
  const item = assignItem.value;
  if (shiftTypeId === null) {
    if (item) day.items.splice(assign.value.item, 1);
    day.uncertainEmpty = false;
  } else {
    const type = templateOf(shiftTypeId)!;
    if (item) {
      if (item.status === 'unknown' && rememberCode.value && !isCombo(item.code)) await rememberCodeAt(type, item.code);
      Object.assign(item, { shiftTypeId, status: 'ok', kind: type.kind === 'absence' ? 'absence' : 'duty', review: undefined });
    } else {
      day.items.push({ kind: type.kind === 'absence' ? 'absence' : 'duty', code: (type.codes ?? [])[0] ?? type.name, shiftTypeId, status: 'ok' });
      day.uncertainEmpty = false;
    }
  }
  assign.value = null;
  await refreshPlan();
};

// "Kürzel merken": an der gewählten Vorlage speichern, sofern es nirgends sonst vergeben ist
const rememberCodeAt = async (type: ShiftType, code: string) => {
  const owner = templates.value.find(t => t.id !== type.id && (t.codes ?? []).some(c => sameShiftCode(c, code)));
  if (owner) { await toast(`„${code}“ ist bereits bei „${owner.name}“ hinterlegt und wurde nicht gemerkt.`, 'warning'); return; }
  const codes = [...(type.codes ?? []), code];
  await db.shiftTypes.update(type.id!, { codes });
  type.codes = codes;
  markLocalModified();
};

const save = async () => {
  if (!plan.value) return;
  const unknown = proposals.value.flatMap(d => d.items).filter(i => i.status === 'unknown').length;
  if (unknown) {
    const alert = await alertController.create({
      header: 'Nicht zugeordnete Kürzel',
      message: unknown === 1
        ? 'Ein Kürzel ist keiner Vorlage zugeordnet und wird nicht übernommen.'
        : `${unknown} Kürzel sind keiner Vorlage zugeordnet und werden nicht übernommen.`,
      buttons: [{ text: 'Zurück', role: 'cancel' }, { text: 'Trotzdem speichern', role: 'confirm' }]
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'confirm') return;
  }
  busy.value = true; busyText.value = 'Wird gespeichert …'; progress.value = null;
  try {
    const current = plan.value;
    await db.transaction('rw', db.shifts, async () => {
      for (const p of current.planned) {
        if (!p.include) continue;
        await db.shifts.put(JSON.parse(JSON.stringify(p.shift)));
      }
      if (applyRemovals.value) await db.shifts.bulkDelete(current.removals.map(s => s.id!));
    });
    markLocalModified();
    const count = current.planned.filter(p => p.include).length;
    await toast(`${count} Einträge übernommen.`, 'success');
    image.value = null;
    router.replace('/calendar');
  } catch (error) {
    console.error(error);
    await toast('Speichern fehlgeschlagen.', 'danger');
  } finally {
    busy.value = false;
  }
};
</script>

<style scoped>
.intro, .step-text {
  color: var(--ion-color-step-700, #4d4d4d);
  font-size: 0.95rem;
}

.hint {
  display: block;
  margin: 8px 16px 16px;
  font-size: 0.85rem;
}

.hint.warning {
  color: var(--ion-color-warning-shade);
}

.region-step .step-text {
  margin-top: 12px;
}

.rotate-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 12px;
}

.mirror {
  transform: scaleX(-1);
}

.busy p {
  margin-bottom: 8px;
}

.date-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 36px;
  font-size: 0.9rem;
}

.weekday {
  font-size: 0.75rem;
  color: var(--ion-color-step-600, #666666);
}

.items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 0;
  width: 100%;
}

.chip {
  border: 2px solid var(--ion-color-step-300, #c8c8c8);
  border-radius: 16px;
  padding: 6px 12px;
  min-height: 36px;
  background: var(--ion-background-color);
  color: var(--ion-text-color);
  font-size: 0.9rem;
}

.chip.uncertain {
  border-style: dashed;
  border-color: var(--ion-color-warning) !important;
}

.chip.unknown {
  border-color: var(--ion-color-danger) !important;
  color: var(--ion-color-danger);
}

.chip.free {
  color: var(--ion-color-step-500, #808080);
}

.flag {
  display: inline-block;
  margin-right: 4px;
  padding: 0 5px;
  border-radius: 8px;
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
  font-weight: bold;
  font-size: 0.75rem;
}

.uncertain-row {
  --background: rgba(255, 196, 9, 0.08);
}

.conflict {
  width: 100%;
  font-size: 0.85rem;
}

.muted {
  color: var(--ion-color-step-600, #666666);
  font-size: 0.85rem;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}
</style>
