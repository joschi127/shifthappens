<template>
  <div class="tag-list-input">
    <div v-if="modelValue.length" class="chips">
      <ion-chip
        v-for="(entry, index) in modelValue"
        :key="entry"
        role="button"
        tabindex="0"
        :aria-label="`${entry} entfernen`"
        @click="remove(index)"
        @keydown.enter.prevent="remove(index)"
        @keydown.space.prevent="remove(index)"
      >
        <ion-label>{{ entry }}</ion-label>
        <ion-icon :icon="closeCircle"></ion-icon>
      </ion-chip>
    </div>
    <div class="add-row">
      <ion-input
        v-model="draft"
        :placeholder="placeholder"
        autocapitalize="off"
        autocorrect="off"
        :spellcheck="false"
        enterkeyhint="done"
        @keyup.enter="add"
        @ionBlur="add"
      ></ion-input>
      <ion-button fill="clear" size="small" :disabled="!draft.trim()" aria-label="Hinzufügen" @click="add">
        <ion-icon slot="icon-only" :icon="addCircleOutline"></ion-icon>
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonChip, IonLabel, IonIcon, IonInput, IonButton } from '@ionic/vue';
import { closeCircle, addCircleOutline } from 'ionicons/icons';
import { ref } from 'vue';
import { addUniqueEntry } from '../utils/tagList';

const props = defineProps<{
  modelValue: string[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const draft = ref('');

const add = () => {
  const next = addUniqueEntry(props.modelValue, draft.value);
  draft.value = '';
  if (next !== props.modelValue) {
    emit('update:modelValue', next);
  }
};

const remove = (index: number) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index));
};
</script>

<style scoped>
.tag-list-input {
  width: 100%;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 8px;
}

.chips ion-chip {
  margin: 0;
}

.add-row {
  display: flex;
  align-items: center;
}
</style>
