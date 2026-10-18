# 0004: Tech-Stack Vue 3, Ionic, Vite und PWA

- **Status:** Angenommen. Nachträglich dokumentiert, Entscheidung bereits umgesetzt.
- **Datum der Entscheidung:** 24.04.2026 (Initial Commit)

## Kontext

ShiftHappens ist ein persönlicher Schichtplaner, der vor allem auf dem Smartphone genutzt wird, auf iOS und Android. Eine Veröffentlichung in den App Stores ist nicht geplant, weil das für ein privates Projekt zu viel Aufwand und Kosten bedeutet. Die App soll sich trotzdem wie eine native App anfühlen und installierbar sein.

## Entscheidung

- **Vue 3** mit Composition API (`<script setup>`) und TypeScript.
- **Ionic** als UI-Komponentenbibliothek, damit Listen, Modale, Wischgesten und Navigation nativ wirken. Gestylt wird mit Ionic-Utilities und Scoped CSS.
- **Vite** als Build-Tool.
- **Progressive Web App** über `vite-plugin-pwa` (`generateSW`, `autoUpdate`): installierbar auf dem Startbildschirm und offline lauffähig.

## Konsequenzen

- Eine Codebasis für alle Plattformen, ausgeliefert als statische Website (siehe [ADR 0009](0009-hosting-github-pages-und-konfiguration.md)).
- Updates kommen automatisch beim nächsten Start, ohne Prüfung durch einen App Store.
- Plattformgrenzen von PWAs gelten, vor allem auf iOS: kein automatischer Installationsdialog und eingeschränkte Hintergrundausführung. Deshalb läuft der automatische Sync nur bei geöffneter App.
- Ein späterer Wechsel zu einer nativen Hülle (z. B. Capacitor) bleibt mit Ionic möglich.
