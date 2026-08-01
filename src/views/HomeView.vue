<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Schichtator</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/settings">
            <ion-icon slot="icon-only" :icon="settingsOutline"></ion-icon>
          </ion-button>
          <ion-button @click="toggleDarkMode()">
            <ion-icon slot="icon-only" :icon="isDarkMode ? sunny : moon"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Schichtator</ion-title>
        </ion-toolbar>
      </ion-header>

      <div id="container">
        <div class="logo-container">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="comic-logo">
            <!-- Stylized Time Clock / Cyborg Head Mix -->
            <!-- The "Helmet" / Case -->
            <rect x="40" y="40" width="120" height="120" rx="15" fill="#4a4a4a" stroke="#1a1a1a" stroke-width="6" />
            <path d="M40,110 L160,110 L160,145 C160,153 153,160 145,160 L55,160 C47,160 40,153 40,145 Z" fill="#666" />
            
            <!-- The Display / Visor -->
            <rect x="55" y="60" width="90" height="40" rx="5" fill="#222" />
            
            <!-- Red Scanning Eye (Cylons/Terminator style) -->
            <rect x="60" y="75" width="80" height="10" rx="5" fill="#400" />
            <rect x="70" y="75" width="20" height="10" rx="5" fill="#ff0000">
              <animate attributeName="x" values="60;120;60" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
            </rect>
            
            <!-- Slot for Time Card -->
            <rect x="70" y="25" width="60" height="20" fill="#ddd" stroke="#1a1a1a" stroke-width="4" />
            <path d="M75,10 L125,10 L125,30 L75,30 Z" fill="#fff" stroke="#1a1a1a" stroke-width="2" />
            <text x="82" y="22" font-family="monospace" font-size="10" fill="#333" font-weight="bold">SHIFT</text>
            
            <!-- Antennae / Ears -->
            <line x1="40" y1="80" x2="25" y2="80" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round" />
            <circle cx="20" cy="80" r="5" fill="#ff0000" />
            <line x1="160" y1="80" x2="175" y2="80" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round" />
            
            <!-- Mouth / Grill -->
            <line x1="75" y1="130" x2="125" y2="130" stroke="#1a1a1a" stroke-width="2" />
            <line x1="75" y1="135" x2="125" y2="135" stroke="#1a1a1a" stroke-width="2" />
            <line x1="75" y1="140" x2="125" y2="140" stroke="#1a1a1a" stroke-width="2" />
            
            <!-- Text/Punchline -->
            <text x="100" y="185" font-family="Impact, sans-serif" font-size="16" fill="#1a1a1a" text-anchor="middle" letter-spacing="1">SCHICHT-TERMINATOR</text>
          </svg>
        </div>
        <strong>Willkommen beim Schichtator</strong>
        <p>Dein persönlicher Schichtplaner für die Hosentasche.</p>
        
        <div class="ion-padding">
          <ion-button expand="block" router-link="/calendar">
            Zum Kalender
          </ion-button>
          <ion-button expand="block" fill="outline" router-link="/shift-types">
            Schicht-Vorlagen verwalten
          </ion-button>
          <ion-button expand="block" fill="outline" router-link="/settings">
            Einstellungen
          </ion-button>
        </div>
        
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
  IonButton,
  IonButtons,
  IonIcon
} from '@ionic/vue';
import { moon, sunny, settingsOutline } from 'ionicons/icons';
import { isDarkMode, toggleDarkMode } from '../services/themeService';

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

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.comic-logo {
  width: 150px;
  height: 150px;
  filter: drop-shadow(4px 4px 0px rgba(0,0,0,0.1));
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
