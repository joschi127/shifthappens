<template>
  <div class="region-selector">
    <ion-segment :value="mode" class="view-mode" @ionChange="setMode($event.detail.value as ViewMode)">
      <ion-segment-button value="names"><ion-label>Namen</ion-label></ion-segment-button>
      <ion-segment-button value="block"><ion-label>Zeile</ion-label></ion-segment-button>
      <ion-segment-button value="full"><ion-label>Bild</ion-label></ion-segment-button>
    </ion-segment>
    <div
      ref="wrapper"
      class="stage"
      :style="{ aspectRatio: `${view.w} / ${view.h}` }"
      @pointerdown="startDrag"
      @pointermove="drag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
    >
      <canvas ref="canvas" class="image"></canvas>
      <svg class="overlay" :viewBox="`${view.x} ${view.y} ${view.w} ${view.h}`" preserveAspectRatio="none">
        <polygon :points="corners.map(p => p.join(',')).join(' ')" class="area" />
        <line v-for="(p, i) in corners" :key="`l${i}`" :x1="p[0]" :y1="p[1]" :x2="corners[(i + 1) % 4][0]" :y2="corners[(i + 1) % 4][1]" class="edge" />
      </svg>
      <div
        v-for="(p, i) in corners"
        :key="i"
        class="handle"
        :class="{ active: dragging === i }"
        :style="handleStyle(p)"
        role="button"
        :aria-label="handleLabels[i]"
      ></div>
      <canvas v-show="dragging !== null" ref="loupe" class="loupe" :class="loupeSide" width="140" height="140"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { Point, Quad } from '../../import/geometry';
import type { Raster } from '../../import/raster';

const props = defineProps<{ image: Raster; corners: Quad }>();
const emit = defineEmits<{ (e: 'update:corners', value: Quad): void; (e: 'tap', point: Point): void }>();

const wrapper = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const loupe = ref<HTMLCanvasElement | null>(null);
const dragging = ref<number | null>(null);
const handleLabels = ['Ecke oben links', 'Ecke oben rechts', 'Ecke unten rechts', 'Ecke unten links'];

// Sichtbarer Ausschnitt (Bildkoordinaten). Der Ausschnitt darf über das Bild hinausgehen (grauer Rand), damit
// Ecken am Bildrand nie direkt am Bildschirmrand liegen und sich mit dem Finger greifen lassen.
// - names: Namensspalte und erste Tage über die ganze Bildhöhe, groß genug, um die eigene Person anzutippen
// - block: der markierte Block über die ganze Tabellenbreite (links und rechts prüfen, Ecken fein justieren)
// - full:  das ganze Bild
type ViewMode = 'names' | 'block' | 'full';
const mode = ref<ViewMode>('names');
const view = ref({ x: 0, y: 0, w: 1, h: 1 });
const fitView = () => {
  const { width, height } = props.image;
  const xs = props.corners.map(p => p[0]), ys = props.corners.map(p => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
  if (mode.value === 'full') {
    const pad = Math.max(width, height) * 0.06;
    view.value = { x: -pad, y: -pad, w: width + 2 * pad, h: height + 2 * pad };
    return;
  }
  if (mode.value === 'names') {
    const pad = height * 0.03;
    const x = Math.min(...xs) - bw * 0.25 - 20;
    view.value = { x, y: -pad, w: Math.min(...xs) + bw * 0.12 - x, h: height + 2 * pad };
    return;
  }
  // links mehr Rand, damit die Namensspalte zum Antippen sichtbar ist
  const mxLeft = bw * 0.22 + 20, mxRight = bw * 0.08 + 20, my = Math.max(bh * 0.6, bw * 0.12) + 20;
  const x = Math.min(...xs) - mxLeft, y = Math.min(...ys) - my;
  view.value = { x, y, w: Math.max(...xs) + mxRight - x, h: Math.max(...ys) + my - y };
};

const draw = () => {
  if (!canvas.value) return;
  fitView();
  const { x, y, w, h } = view.value;
  const source = document.createElement('canvas');
  source.width = props.image.width; source.height = props.image.height;
  source.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(props.image.data), props.image.width, props.image.height), 0, 0);
  fullImage = source;
  canvas.value.width = Math.round(w); canvas.value.height = Math.round(h);
  const ctx = canvas.value.getContext('2d')!;
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(0, 0, w, h);
  // nur den Teil des Bildes zeichnen, der im Ausschnitt liegt (Ausschnitt kann über das Bild hinausgehen)
  const sx = Math.max(0, x), sy = Math.max(0, y);
  const sw = Math.min(props.image.width, x + w) - sx, sh = Math.min(props.image.height, y + h) - sy;
  if (sw > 0 && sh > 0) ctx.drawImage(source, sx, sy, sw, sh, sx - x, sy - y, sw, sh);
};
let fullImage: HTMLCanvasElement | null = null;
onMounted(draw);
watch(() => props.image, () => nextTick(draw));
// Wurden die Ecken von außen gesetzt (z. B. automatische Suche), den Ausschnitt neu anpassen
watch(() => props.corners, () => { if (dragging.value === null) nextTick(draw); });
const setMode = (value: ViewMode) => { mode.value = value; draw(); };

const handleStyle = ([x, y]: Point) => ({
  left: `${((x - view.value.x) / view.value.w) * 100}%`,
  top: `${((y - view.value.y) / view.value.h) * 100}%`
});

const loupeSide = computed(() => dragging.value !== null && props.corners[dragging.value][0] < view.value.x + view.value.w / 2 ? 'right' : 'left');

const toImage = (event: PointerEvent): Point => {
  const rect = wrapper.value!.getBoundingClientRect();
  const x = view.value.x + ((event.clientX - rect.left) / rect.width) * view.value.w;
  const y = view.value.y + ((event.clientY - rect.top) / rect.height) * view.value.h;
  return [Math.max(0, Math.min(props.image.width - 1, x)), Math.max(0, Math.min(props.image.height - 1, y))];
};

const drawLoupe = ([x, y]: Point) => {
  if (!loupe.value || !fullImage || !wrapper.value) return;
  const ctx = loupe.value.getContext('2d')!;
  const size = 140, zoom = 3, src = (size / zoom) * (view.value.w / wrapper.value.clientWidth);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
  ctx.drawImage(fullImage, x - src / 2, y - src / 2, src, src, 0, 0, size, size);
  ctx.strokeStyle = '#e53935'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size); ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2); ctx.stroke();
};

// Die dem Finger nächstgelegene Ecke greifen (Ecken liegen auf dem Smartphone teils dicht beieinander)
let grabOffset: Point = [0, 0];
// Tippen ohne Ecke: Punkt melden (die Ansicht setzt daraus die Zeile), sofern sich der Finger kaum bewegt hat
let tapStart: { x: number; y: number; point: Point } | null = null;
const startDrag = (event: PointerEvent) => {
  const p = toImage(event);
  const scale = view.value.w / wrapper.value!.clientWidth;
  const distances = props.corners.map(c => Math.hypot(c[0] - p[0], c[1] - p[1]) / scale);
  const nearest = distances.indexOf(Math.min(...distances));
  if (distances[nearest] > 48) { tapStart = { x: event.clientX, y: event.clientY, point: p }; return; }
  tapStart = null;
  dragging.value = nearest;
  grabOffset = [props.corners[nearest][0] - p[0], props.corners[nearest][1] - p[1]];
  wrapper.value!.setPointerCapture(event.pointerId);
  nextTick(() => drawLoupe(props.corners[nearest]));
};

const drag = (event: PointerEvent) => {
  if (dragging.value === null) return;
  const p = toImage(event);
  const next = props.corners.map(c => [...c] as Point) as Quad;
  next[dragging.value] = [p[0] + grabOffset[0], p[1] + grabOffset[1]];
  emit('update:corners', next);
  drawLoupe(next[dragging.value]);
};

const endDrag = (event: PointerEvent) => {
  dragging.value = null;
  if (tapStart && event.type === 'pointerup' && Math.hypot(event.clientX - tapStart.x, event.clientY - tapStart.y) < 10) emit('tap', tapStart.point);
  tapStart = null;
};
</script>

<style scoped>
.region-selector {
  /* Abstand zum Bildschirmrand, damit Ecken am Rand mit dem Finger greifbar bleiben */
  padding: 0 16px;
}

.view-mode {
  margin-bottom: 8px;
}

.stage {
  position: relative;
  overflow: hidden;
  width: 100%;
  touch-action: none;
  user-select: none;
}

.image {
  display: block;
  width: 100%;
  height: 100%;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.area {
  fill: rgba(56, 128, 255, 0.18);
}

.edge {
  stroke: var(--ion-color-primary);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.handle {
  position: absolute;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.handle.active {
  background: var(--ion-color-danger);
}

.loupe {
  position: absolute;
  top: 8px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 3px solid var(--ion-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.loupe.left { left: 8px; }
.loupe.right { right: 8px; }

</style>
