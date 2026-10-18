<template>
  <div ref="wrapper" class="region-selector">
    <canvas ref="canvas" class="image"></canvas>
    <svg class="overlay" :viewBox="`0 0 ${image.width} ${image.height}`" preserveAspectRatio="none">
      <polygon :points="corners.map(p => p.join(',')).join(' ')" class="area" />
      <!-- Hilfslinien: erste und letzte Tagesspalte liegen an den Kanten -->
      <line v-for="(p, i) in corners" :key="`l${i}`" :x1="p[0]" :y1="p[1]" :x2="corners[(i + 1) % 4][0]" :y2="corners[(i + 1) % 4][1]" class="edge" />
    </svg>
    <button
      v-for="(p, i) in corners"
      :key="i"
      type="button"
      class="handle"
      :class="{ active: dragging === i }"
      :style="handleStyle(p)"
      :aria-label="handleLabels[i]"
      @pointerdown="startDrag(i, $event)"
      @pointermove="drag($event)"
      @pointerup="endDrag"
      @pointercancel="endDrag"
    ></button>
    <canvas v-show="dragging !== null" ref="loupe" class="loupe" :class="loupeSide" width="140" height="140"></canvas>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { Point, Quad } from '../../import/geometry';
import type { Raster } from '../../import/raster';

const props = defineProps<{ image: Raster; corners: Quad }>();
const emit = defineEmits<{ (e: 'update:corners', value: Quad): void }>();

const wrapper = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const loupe = ref<HTMLCanvasElement | null>(null);
const dragging = ref<number | null>(null);
const handleLabels = ['Ecke oben links', 'Ecke oben rechts', 'Ecke unten rechts', 'Ecke unten links'];

const draw = () => {
  if (!canvas.value) return;
  canvas.value.width = props.image.width;
  canvas.value.height = props.image.height;
  canvas.value.getContext('2d')!.putImageData(
    new ImageData(new Uint8ClampedArray(props.image.data), props.image.width, props.image.height), 0, 0);
};
onMounted(draw);
watch(() => props.image, () => nextTick(draw));

const handleStyle = ([x, y]: Point) => ({ left: `${(x / props.image.width) * 100}%`, top: `${(y / props.image.height) * 100}%` });

// Lupe auf der dem Finger gegenüberliegenden Seite
const loupeSide = computed(() => dragging.value !== null && props.corners[dragging.value][0] < props.image.width / 2 ? 'right' : 'left');

const toImage = (event: PointerEvent): Point => {
  const rect = wrapper.value!.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * props.image.width;
  const y = ((event.clientY - rect.top) / rect.height) * props.image.height;
  return [Math.max(0, Math.min(props.image.width - 1, x)), Math.max(0, Math.min(props.image.height - 1, y))];
};

const drawLoupe = ([x, y]: Point) => {
  if (!loupe.value || !canvas.value) return;
  const ctx = loupe.value.getContext('2d')!;
  const size = 140, zoom = 3, src = size / zoom * (props.image.width / (wrapper.value?.clientWidth || props.image.width));
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
  ctx.drawImage(canvas.value, x - src / 2, y - src / 2, src, src, 0, 0, size, size);
  ctx.strokeStyle = '#e53935'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size); ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2); ctx.stroke();
};

const startDrag = (index: number, event: PointerEvent) => {
  dragging.value = index;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
  nextTick(() => drawLoupe(props.corners[index]));
};

const drag = (event: PointerEvent) => {
  if (dragging.value === null) return;
  const next = props.corners.map(p => [...p] as Point) as Quad;
  next[dragging.value] = toImage(event);
  emit('update:corners', next);
  drawLoupe(next[dragging.value]);
};

const endDrag = () => { dragging.value = null; };
</script>

<style scoped>
.region-selector {
  position: relative;
  width: 100%;
  touch-action: none;
  user-select: none;
}

.image {
  display: block;
  width: 100%;
  height: auto;
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
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
}

/* großzügige Touch-Fläche, sichtbarer Punkt in der Mitte */
.handle {
  position: absolute;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  border: none;
  border-radius: 50%;
  background: radial-gradient(circle, var(--ion-color-primary) 0 7px, rgba(56, 128, 255, 0.25) 8px 21px, transparent 22px);
  padding: 0;
  touch-action: none;
}

.handle.active {
  background: radial-gradient(circle, var(--ion-color-danger) 0 7px, rgba(229, 57, 53, 0.25) 8px 21px, transparent 22px);
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
