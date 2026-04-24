# Projekt-Guidelines

## Entwicklungsprinzipien
- **Mobile First:** Die App ist primär für die Nutzung auf Smartphones optimiert.
- **Offline First:** Alle Kernfunktionen müssen ohne aktive Internetverbindung funktionieren (PWA + Dexie.js).
- **Konsistenz:** Verwendung von Ionic-Komponenten für ein natives Look-and-Feel.

## Dokumentation & Changelog
- **Changelog-Pflicht:** Jede signifikante Änderung oder jedes neue Feature muss im `CHANGELOG.md` unter der Sektion `[Unreleased]` dokumentiert werden.
- **Code-Stil:** Einheitliche Formatierung und klare Benennung von Variablen und Funktionen.

## Technische Vorgaben
- Framework: Vue.js 3 (Composition API).
- Styling: Ionic CSS Utilities und Scoped CSS in Vue-Komponenten.
- Datenhaltung: Dexie.js für lokale Speicherung; Datenmodellierung erfolgt zentral.
