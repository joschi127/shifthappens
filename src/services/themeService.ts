import { ref } from 'vue';

const DARK_MODE_KEY = 'darkMode';

export const isDarkMode = ref(localStorage.getItem(DARK_MODE_KEY) === 'true');

export const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem(DARK_MODE_KEY, String(isDarkMode.value));
  applyTheme();
};

export const applyTheme = () => {
  // Ionic 7+ empfiehlt die Klasse auf dem documentElement (html) zu setzen
  document.documentElement.classList.toggle('dark', isDarkMode.value);
};

// Initial apply
applyTheme();
