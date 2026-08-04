import { computed, ref } from 'vue';

/**
 * Service zur Steuerung der PWA-Installation ("Zum Startbildschirm hinzufügen").
 *
 * - Android/Chromium: Nutzt das `beforeinstallprompt`-Event, um einen nativen
 *   Installationsdialog anzubieten.
 * - iOS/Safari: Es gibt kein Prompt-Event. Stattdessen wird eine Anleitung
 *   zum manuellen Hinzufügen über das Teilen-Menü angeboten.
 */

// Minimales Interface für das (noch nicht standardisierte) BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

// Das abgefangene Prompt-Event (nur auf unterstützten Browsern vorhanden)
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);

// Ist die App bereits als PWA (Standalone) gestartet?
const isStandalone = ref(detectStandalone());

// Wurde die App installiert (Ereignis "appinstalled")?
const isInstalled = ref(false);

function detectStandalone(): boolean {
  const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  // iOS Safari nutzt das nicht-standardisierte navigator.standalone
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
}

/** Erkennt iOS-Geräte (iPhone/iPad/iPod), inkl. iPadOS im Desktop-Modus. */
export function isIos(): boolean {
  const ua = window.navigator.userAgent;
  const iosDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS meldet sich teils als "Macintosh" mit Touch-Support
  const iPadOs = ua.includes('Macintosh') && 'ontouchend' in document;
  return iosDevice || iPadOs;
}

// Event-Listener registrieren (einmalig beim Import)
window.addEventListener('beforeinstallprompt', (event: Event) => {
  // Verhindert den automatischen Mini-Infobar-Prompt in Chromium
  event.preventDefault();
  deferredPrompt.value = event as BeforeInstallPromptEvent;
});

window.addEventListener('appinstalled', () => {
  deferredPrompt.value = null;
  isInstalled.value = true;
  isStandalone.value = true;
});

// Änderungen am Anzeigemodus beobachten (z. B. wechsel in Standalone)
window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', (e) => {
  isStandalone.value = e.matches;
});

/**
 * Gibt an, ob überhaupt eine Installationsoption angeboten werden soll.
 * Nicht anzeigen, wenn die App bereits als PWA läuft.
 * Auf iOS immer anbieten (manuelle Anleitung), sonst nur wenn ein Prompt vorliegt.
 */
export const canInstall = computed(() => {
  if (isStandalone.value || isInstalled.value) return false;
  if (isIos()) return true;
  return deferredPrompt.value !== null;
});

/**
 * Löst den nativen Installationsdialog aus (Android/Chromium).
 * @returns true, wenn die Installation vom Nutzer akzeptiert wurde.
 */
export async function promptInstall(): Promise<boolean> {
  const prompt = deferredPrompt.value;
  if (!prompt) return false;

  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  // Das Event kann nur einmal verwendet werden
  deferredPrompt.value = null;
  return outcome === 'accepted';
}

export { isStandalone, isInstalled };
