<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Schichtator</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Schichtator</ion-title>
        </ion-toolbar>
      </ion-header>

      <div id="container">
        <strong>Willkommen beim Schichtator</strong>
        <p>Dein persönlicher Schichtplaner für die Hosentasche.</p>
        
        <div class="ion-padding">
          <ion-button expand="block" router-link="/shift-types">
            Schicht-Vorlagen verwalten
          </ion-button>
          
          <ion-button expand="block" fill="outline" color="secondary" @click="testDb">
            Datenbank Test
          </ion-button>
        </div>
        
        <p v-if="dbStatus" class="ion-padding">{{ dbStatus }}</p>
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
  IonButton 
} from '@ionic/vue';
import { ref } from 'vue';
import { db } from '../db';

const dbStatus = ref('');

const testDb = async () => {
  try {
    const id = await db.shifts.add({
      name: 'Test Schicht',
      date: new Date().toISOString()
    });
    dbStatus.value = `Erfolg! Schicht mit ID ${id} gespeichert.`;
  } catch (e) {
    dbStatus.value = `Fehler: ${e}`;
  }
};
</script>

<style scoped>
#container {
  text-align: center;
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

#container strong {
  font-size: 20px;
  line-height: 26px;
}

#container p {
  font-size: 16px;
  line-height: 22px;
  color: #8c8c8c;
  margin: 0;
}
</style>
