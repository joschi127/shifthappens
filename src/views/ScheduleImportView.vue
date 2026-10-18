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
          Tipp: Mit deinem „Name im Dienstplan“ findet die App deine Zeile automatisch.
          <router-link to="/settings">Jetzt in den Einstellungen eintragen</router-link>
        </ion-note>
        <ion-note v-if="!templates.some(t => t.codes?.length)" class="hint warning">
          Es gibt noch keine Schicht-Vorlagen mit Schichtkürzeln. Lege zuerst Vorlagen an, z. B. „Frühdienst“ mit Kürzel „F01“.
          <router-link to="/shift-types">Zu den Schicht-Vorlagen</router-link>
        </ion-note>

        <div class="explain">
          <button type="button" class="explain-toggle" :aria-expanded="explainTemplates" aria-controls="explain-templates" @click="explainTemplates = !explainTemplates">
            <ion-icon :icon="informationCircleOutline" aria-hidden="true"></ion-icon>
            <span>Warum brauche ich Schicht-Vorlagen?</span>
            <ion-icon :icon="chevronDownOutline" class="chevron" :class="{ open: explainTemplates }" aria-hidden="true"></ion-icon>
          </button>
          <!-- Auf- und Zuklappen animiert: Zeilenhöhe des Rasters von 0fr auf 1fr -->
          <div id="explain-templates" class="explain-collapse" :class="{ open: explainTemplates }" :aria-hidden="!explainTemplates" :inert="!explainTemplates">
          <div class="explain-inner"><div class="explain-text">
            <p>
              Die App liest deinen Dienstplan direkt hier auf deinem Handy. Damit das zuverlässig klappt, muss sie wissen,
              welche Kürzel in deinem Plan vorkommen und welche Schicht jeweils dahintersteckt, z. B. „F01“ = Frühdienst von 6:00 bis 14:00.
            </p>
            <ul>
              <li><strong>Weniger Lesefehler:</strong> Die App sucht gezielt nach deinen Kürzeln und verwechselt dadurch seltener, z. B. eine 0 mit einem O.</li>
              <li><strong>Kein Raten:</strong> Nur Kürzel, die sie kennt, trägt sie direkt ein. Alles andere zeigt sie dir zum Nachschauen.</li>
              <li><strong>Gleich die richtigen Zeiten:</strong> Über die Vorlage weiß sie Beginn, Ende und Pausen deiner Schicht.</li>
            </ul>
            <p>
              Am besten legst du deine üblichen Schichten einmal an und trägst bei jeder das Kürzel aus deinem Plan ein.
              Urlaub oder Krankheit legst du als Vorlage der Art „Abwesenheit“ an. Taucht später ein neues Kürzel auf, ist das kein Problem:
              Beim Import tippst du es an, wählst die passende Vorlage und lässt es dir für das nächste Mal merken.
            </p>
            <router-link to="/shift-types">Zu den Schicht-Vorlagen</router-link>
          </div></div>
          </div>
        </div>

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
        <!-- während der Suche ausgeblendet, sonst erscheinen kurz Platzhalter-Ecken -->
        <region-selector v-if="!busy" v-model:corners="corners" :image="image"></region-selector>
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
        <ion-note v-if="warpedPaper" class="hint warning">
          Das Blatt scheint stark gewölbt oder geknickt, deshalb konnten viele Tage nicht sicher gelesen werden.
          Für ein besseres Ergebnis: Blatt glatt hinlegen, gerade von oben fotografieren oder den Dokumentenmodus der Kamera nutzen.
        </ion-note>
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
                <span v-if="item.status !== 'ok' && item.status !== 'skipped'" class="flag">?!</span>
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
          <p v-if="assignItem && isUnassigned(assignItem)" class="muted">
            Das Kürzel „{{ assignItem.code }}“ ist keiner Vorlage zugeordnet. Wähle unten eine Vorlage oder:
          </p>
          <div v-if="assignItem && isUnassigned(assignItem)" class="unknown-actions">
            <ion-button expand="block" fill="outline" size="small" @click="createTemplateFor(assignItem.code)">
              <ion-icon slot="start" :icon="addOutline"></ion-icon>
              Neue Vorlage mit Kürzel „{{ assignItem.code }}“
            </ion-button>
            <ion-button v-if="assignItem.status !== 'skipped'" expand="block" fill="outline" size="small" color="medium" @click="skipItem">
              Diesmal überspringen
            </ion-button>
            <ion-button v-if="!isCombo(assignItem.code)" expand="block" fill="clear" size="small" color="medium" @click="ignoreAlways(assignItem.code)">
              Kürzel „{{ assignItem.code }}“ immer ignorieren
            </ion-button>
          </div>
          <ion-item v-if="assignItem && isUnassigned(assignItem) && !isCombo(assignItem.code)" lines="none">
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
  toastController, alertController, onIonViewWillEnter
} from '@ionic/vue';
import { addOutline, cameraOutline, chevronDownOutline, imageOutline, informationCircleOutline, refreshOutline } from 'ionicons/icons';
import { computed, onUnmounted, ref, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { db, ImportTemplate, ShiftType } from '../db';
import RegionSelector from '../components/import/RegionSelector.vue';
import { getImportProfile, getImportTemplates, saveImportProfile, saveImportTemplates } from '../services/importSettingsService';
import { markLocalModified } from '../services/googleDriveService';
import { Quad } from '../import/geometry';
import { Raster, rotate90 } from '../import/raster';
import { ImageInputError, loadImageFile } from '../import/imageInput';
import { getBrowserEngine, releaseBrowserEngine } from '../import/browserEngine';
import { BlockMatch, locateBlock, locateOwnBlock } from '../import/blockFinder';
import { recognizeOwnBlock } from '../import/recognizeOwnBlock';
import { DayProposal, DayReading, ProposalItem, ignoreCodeIn, rematchUnknown, resolveShifts } from '../import/resolveShifts';
import { ImportPlan, PlannedShift, planImport } from '../import/importPlan';
import { IMPORT_FORMATS, learnedBlockRatio, mergeFormats } from '../import/formats';
import { normalizeShiftCode, parseShiftCode, sameShiftCode } from '../utils/shiftCodes';
import { sameEntry } from '../utils/tagList';

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

// Erklärung zu den Schicht-Vorlagen, standardmäßig zugeklappt
const explainTemplates = ref(false);

// Bei jedem Betreten neu laden: Name und Vorlagen können zwischendurch in den Einstellungen geändert worden sein
let formatChosen = false;
onIonViewWillEnter(async () => {
  templates.value = await db.shiftTypes.orderBy('order').toArray();
  const profile = await getImportProfile();
  rosterNames.value = profile.rosterNames;
  ignoreCodes.value = profile.ignoreCodes;
  const saved = await getImportTemplates();
  formats.value = mergeFormats(saved);
  const lastUsed = saved.find(s => s.lastUsed);
  if (lastUsed && !formatChosen) formatId.value = lastUsed.id;
  // Zurück vom Anlegen einer Vorlage: unbekannte Kürzel, die jetzt passen, zuordnen
  if (step.value === 'confirm' && rematchUnknown(proposals.value, templates.value)) await refreshPlan();
  formatChosen = true;
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

// Sucht den eigenen Block; beim ersten Versuch auch im gedrehten Bild (90° in beide Richtungen, 180°)
const findOwnBlock = async (tryRotations = true) => {
  if (!image.value) return;
  if (!rosterNames.value.length) {
    corners.value = defaultCorners(image.value);
    regionMessage.value = 'Ziehe die vier Ecken auf deinen Block: von der ersten bis zur letzten Tagesspalte, alle Zeilen deiner Person, ohne Namensspalte. '
      + 'Tipp: Trägst du in den Einstellungen deinen „Name im Dienstplan“ ein, sucht die App den Block künftig selbst.';
    return;
  }
  busy.value = true; busyText.value = 'Deine Zeile wird gesucht (beim ersten Mal werden die Erkennungsdaten geladen) …'; progress.value = null;
  try {
    const engine = await getBrowserEngine();
    const options = { rosterNames: rosterNames.value, days: daysInMonth.value, blockRatio: format.value.blockRatio ?? 2.9,
      subRows: format.value.subRows ?? 1, dutyCodes: vocabulary().dutyOnly };
    let match: BlockMatch | null = null;
    if (tryRotations) {
      const found = await locateOwnBlock(image.value, engine, options, () => { busyText.value = 'Deine Zeile wird im gedrehten Bild gesucht …'; });
      if (found) { image.value = found.image; match = found.match; }
    } else {
      match = await locateBlock(image.value, engine, options);
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
// Raster in vielen Spalten nicht eindeutig (stark gewölbtes Blatt): Hinweis auf ein neues Foto
const warpedPaper = ref(false);

// Seitenverhältnis des bestätigten Blocks für die nächste automatische Suche merken (nach überzeugender Erkennung)
const learnBlockRatio = async () => {
  const learned = learnedBlockRatio(corners.value, daysInMonth.value, format.value);
  const saved = (await getImportTemplates()).map(t => ({ ...t, lastUsed: false }));
  const entry = { ...format.value, blockRatio: learned ?? format.value.blockRatio, lastUsed: true };
  await saveImportTemplates([...saved.filter(t => t.id !== entry.id), entry]);
  formats.value = mergeFormats([...saved.filter(t => t.id !== entry.id), entry]);
};

// Alle einzelnen Kürzel aus den Vorlagen (auch Teile von Kombinationen) als bekannter Wortschatz
const vocabulary = () => {
  const duty = new Set<string>(ignoreCodes.value), absence = new Set<string>(), dutyOnly = new Set<string>();
  for (const t of templates.value) for (const c of t.codes ?? []) {
    const p = parseShiftCode(c);
    if (!p) continue;
    const parts = p.type === 'single' ? [p.code] : [p.first, p.second];
    for (const part of parts) { duty.add(part); (t.kind === 'absence' ? absence : dutyOnly).add(part); }
  }
  // dutyOnly: nur Dienstkürzel, für die Nachprüfung der Blocksuche (Abwesenheiten zählen dort nicht)
  return { duty: [...duty], absence: [...absence], dutyOnly: [...dutyOnly] };
};

const runRecognition = async () => {
  if (!image.value) return;
  busy.value = true; progress.value = 0; busyText.value = 'Dienstplan wird erkannt …';
  try {
    const f = format.value;
    const engine = await getBrowserEngine();
    // Nachbarblöcke dienen nur als zusätzliche Beispiele, übernommen wird nur der eigene Block
    const person = await recognizeOwnBlock(image.value, corners.value, daysInMonth.value,
      { subRows: f.subRows ?? 1, dutyRow: f.dutyRow ?? 0, absenceRow: f.absenceRow, standbyRow: f.standbyRow },
      vocabulary(), engine, { onProgress: (done, total) => { progress.value = done / total; } });
    warpedPaper.value = (person.unreliableShare ?? 0) >= 0.2;
    // Seitenverhältnis nur aus einem überzeugenden Ergebnis lernen: falsch gesetzte Ecken würden sonst
    // die nächste automatische Suche verderben
    const sureShare = person.duty.filter(c => !c.uncertain).length / person.duty.length;
    if (!warpedPaper.value && sureShare >= 0.5) await learnBlockRatio();
    // Lieber ein neues Foto als eine schlechte Erkennung: bei stark gewölbtem Blatt zuerst darum bitten
    if (warpedPaper.value && !(await askForBetterPhoto())) { reset(); return; }
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

// Liefert true, wenn der Nutzer trotzdem mit diesem Bild weitermachen möchte
const askForBetterPhoto = async (): Promise<boolean> => {
  busy.value = false;
  const alert = await alertController.create({
    header: 'Bitte ein besseres Foto',
    message: 'Das Blatt scheint stark gewölbt oder geknickt. Viele Tage lassen sich so nicht sicher lesen. '
      + 'Lege das Blatt glatt auf den Tisch und fotografiere es gerade von oben, oder nutze den Dokumentenmodus deiner Kamera.',
    buttons: [
      { text: 'Trotzdem prüfen', role: 'cancel' },
      { text: 'Neues Foto', role: 'confirm' }
    ]
  });
  await alert.present();
  return (await alert.onDidDismiss()).role !== 'confirm';
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
const chipLabel = (item: ProposalItem) =>
  item.status === 'skipped' ? `„${item.code}“ übersprungen` : templateOf(item.shiftTypeId)?.name ?? `„${item.code}“ zuordnen`;
const chipStyle = (item: ProposalItem) => {
  const color = templateOf(item.shiftTypeId)?.color;
  return color ? { borderColor: color, backgroundColor: item.kind === 'absence' ? 'transparent' : `${color}22` } : {};
};
const dayIsUncertain = (day: DayProposal) => day.uncertainEmpty || day.items.some(i => i.status === 'uncertain' || i.status === 'unknown');
// Kürzel ohne Vorlage: unbekannt oder bewusst übersprungen
const isUnassigned = (item: ProposalItem) => item.status === 'unknown' || item.status === 'skipped';
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

// Diesmal nicht übernehmen (ohne Nachfrage beim Speichern); erneutes Antippen erlaubt doch eine Zuordnung
const skipItem = async () => {
  if (assignItem.value) assignItem.value.status = 'skipped';
  assign.value = null;
  await refreshPlan();
};

// Dauerhaft ignorieren: in die Ignorier-Liste der Einstellungen und an allen Tagen dieses Imports entfernen
const ignoreAlways = async (code: string) => {
  const profile = await getImportProfile();
  if (!profile.ignoreCodes.some(c => sameEntry(c, code))) {
    await saveImportProfile({ ...profile, ignoreCodes: [...profile.ignoreCodes, normalizeShiftCode(code)] });
  }
  ignoreCodes.value = (await getImportProfile()).ignoreCodes;
  const removed = ignoreCodeIn(proposals.value, code);
  assign.value = null;
  await refreshPlan();
  await toast(`„${code}“ wird ab jetzt ignoriert (${removed === 1 ? '1 Tag' : `${removed} Tage`} in diesem Plan). Rückgängig in Einstellungen → Dienstplan-Import.`);
};

// Neue Vorlage mit dem Kürzel anlegen; beim Zurückkehren werden passende Kürzel automatisch zugeordnet
const createTemplateFor = async (code: string) => {
  assign.value = null;
  await router.push({ path: '/shift-types/new', query: { code } });
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
.explain {
  margin: 0 16px 16px;
}

.explain-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 0;
  background: none;
  border: none;
  color: var(--ion-color-primary);
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
}

.explain-toggle span {
  flex: 1;
}

.explain-toggle ion-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.explain-toggle .chevron {
  transition: transform 0.25s ease;
}

.explain-toggle .chevron.open {
  transform: rotate(180deg);
}

.explain-collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.3s ease, opacity 0.3s ease;
}

.explain-collapse.open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.explain-inner {
  overflow: hidden;
  min-height: 0;
}

@media (prefers-reduced-motion: reduce) {
  .explain-collapse, .explain-toggle .chevron {
    transition: none;
  }
}

.explain-text {
  padding: 4px 12px 12px;
  border-left: 3px solid var(--ion-color-primary);
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--ion-color-step-800, #333333);
}

.explain-text p {
  margin: 8px 0;
}

.explain-text ul {
  margin: 8px 0;
  padding-left: 20px;
}

.explain-text li {
  margin-bottom: 6px;
}

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

.chip.skipped {
  border-style: dashed;
  color: var(--ion-color-step-500, #808080);
  text-decoration: line-through;
}

.unknown-actions {
  margin: 8px 0 12px;
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

/* Lange Checkbox-Texte umbrechen statt am Bildschirmrand abschneiden */
ion-checkbox::part(label) {
  white-space: normal;
}
</style>
