<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>ShiftHappens</ion-title>
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
          <ion-title size="large">ShiftHappens</ion-title>
        </ion-toolbar>
      </ion-header>

      <div id="container">
        <div class="logo-container">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="comic-logo" role="img" aria-label="ShiftHappens Logo">
            <defs>
              <!-- Moderner Farbverlauf für das Badge -->
              <linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#5b8dff" />
                <stop offset="55%" stop-color="#3880ff" />
                <stop offset="100%" stop-color="#6a4bff" />
              </linearGradient>
              <linearGradient id="faceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="100%" stop-color="#eef3ff" />
              </linearGradient>
            </defs>

            <!-- App-Badge mit weichem Verlauf -->
            <rect x="18" y="18" width="164" height="164" rx="42"
                  fill="url(#badgeGrad)" stroke="#1a1a1a" stroke-width="5" />

            <!-- Kreisende Shift-Pfeile (der humorvolle "es verschiebt sich"-Twist) -->
            <g class="orbit" stroke="#ffd34e" stroke-width="7" stroke-linecap="round" fill="none">
              <path d="M100 34 A66 66 0 0 1 166 100" />
              <path d="M166 100 L160 82 M166 100 L179 90" />
              <path d="M100 166 A66 66 0 0 1 34 100" />
              <path d="M34 100 L40 118 M34 100 L21 110" />
            </g>

            <!-- Uhr-/Charakter-Gesicht -->
            <circle cx="100" cy="100" r="54" fill="url(#faceGrad)" stroke="#1a1a1a" stroke-width="5" />

            <!-- Cartoon-Augen (eines zwinkert) -->
            <circle cx="80" cy="88" r="8" fill="#1a1a1a" />
            <circle cx="82" cy="85" r="2.6" fill="#ffffff" />
            <circle class="eye-open" cx="120" cy="88" r="8" fill="#1a1a1a" />
            <circle class="eye-open" cx="122" cy="85" r="2.6" fill="#ffffff" />
            <path class="eye-wink" d="M112 88 h16" stroke="#1a1a1a" stroke-width="4" stroke-linecap="round" fill="none" />

            <!-- Breites Grinsen -->
            <path d="M78 112 q22 24 44 0" fill="none" stroke="#1a1a1a"
                  stroke-width="5" stroke-linecap="round" />

            <!-- Rotierende Uhrzeiger -->
            <g class="hands" stroke="#3880ff" stroke-linecap="round" fill="none">
              <line class="hand-min" x1="100" y1="100" x2="100" y2="66" stroke-width="4" />
              <line class="hand-hour" x1="100" y1="100" x2="122" y2="100" stroke-width="5" />
              <circle cx="100" cy="100" r="5" fill="#3880ff" stroke="none" />
            </g>

            <!-- Blinzelnder Funke für den Witz -->
            <g class="sparkle" fill="#fff3b0">
              <path d="M154 44 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" />
            </g>
          </svg>
        </div>
        <strong>Willkommen bei ShiftHappens</strong>
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
          <ion-button
            v-if="canInstall"
            expand="block"
            fill="outline"
            @click="handleInstall"
          >
            <ion-icon slot="start" :icon="downloadOutline"></ion-icon>
            {{ installButtonLabel }}
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
import { alertController } from '@ionic/vue';
import { moon, sunny, settingsOutline, downloadOutline } from 'ionicons/icons';
import { computed } from 'vue';
import { isDarkMode, toggleDarkMode } from '../services/themeService';
import { canInstall, isIos, promptInstall } from '../services/pwaInstallService';

// Best-Practice-Beschriftung: iOS spricht von "Zum Home-Bildschirm",
// Android/Chromium von "App installieren".
const installButtonLabel = computed(() =>
  isIos() ? 'Zum Home-Bildschirm hinzuf\u00fcgen' : 'App installieren'
);

const showIosInstallHelp = async () => {
  const alert = await alertController.create({
    header: 'Zum Home-Bildschirm hinzuf\u00fcgen',
    message:
      'Tippe unten in der Safari-Leiste auf das Teilen-Symbol und w\u00e4hle anschlie\u00dfend "Zum Home-Bildschirm".',
    buttons: ['Verstanden']
  });
  await alert.present();
};

const handleInstall = async () => {
  if (isIos()) {
    await showIosInstallHelp();
    return;
  }
  await promptInstall();
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

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.comic-logo {
  width: 150px;
  height: 150px;
  filter: drop-shadow(4px 6px 6px rgba(0, 0, 0, 0.2));
  animation: logo-bob 3.5s ease-in-out infinite;
  transform-origin: center;
}

/* Sanftes Wippen des gesamten Logos */
@keyframes logo-bob {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-6px) rotate(1.5deg); }
}

/* Kreisende Shift-Pfeile */
.comic-logo .orbit {
  transform-origin: 100px 100px;
  animation: orbit-spin 6s linear infinite;
}
@keyframes orbit-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Uhrzeiger rotieren unterschiedlich schnell */
.comic-logo .hand-min {
  transform-origin: 100px 100px;
  animation: hand-spin 4s linear infinite;
}
.comic-logo .hand-hour {
  transform-origin: 100px 100px;
  animation: hand-spin 24s linear infinite;
}
@keyframes hand-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Zwinkern: Auge schließt sich kurz */
.comic-logo .eye-open { animation: eye-open-blink 4s ease-in-out infinite; }
.comic-logo .eye-wink { opacity: 0; animation: eye-wink-blink 4s ease-in-out infinite; }
@keyframes eye-open-blink {
  0%, 82%, 100% { opacity: 1; }
  86%, 92% { opacity: 0; }
}
@keyframes eye-wink-blink {
  0%, 82%, 100% { opacity: 0; }
  86%, 92% { opacity: 1; }
}

/* Funke blinkt und pulsiert */
.comic-logo .sparkle {
  transform-origin: 158px 58px;
  animation: sparkle-twinkle 2.5s ease-in-out infinite;
}
@keyframes sparkle-twinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.7) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.1) rotate(90deg); }
}

/* Rücksicht auf Nutzer, die Bewegung reduzieren möchten */
@media (prefers-reduced-motion: reduce) {
  .comic-logo,
  .comic-logo .orbit,
  .comic-logo .hand-min,
  .comic-logo .hand-hour,
  .comic-logo .eye-open,
  .comic-logo .eye-wink,
  .comic-logo .sparkle {
    animation: none;
  }
  .comic-logo .eye-wink { opacity: 0; }
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
