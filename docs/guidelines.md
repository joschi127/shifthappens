# Projekt-Guidelines

## Entwicklungsprinzipien
- **Mobile First:** Die App ist primär für die Nutzung auf Smartphones optimiert.
- **Offline First:** Alle Kernfunktionen müssen ohne aktive Internetverbindung funktionieren (PWA + Dexie.js).
- **Konsistenz:** Verwendung von Ionic-Komponenten für ein natives Look-and-Feel.

## Dokumentation & Changelog
- **Kontext-Berücksichtigung:** Bei der Bearbeitung von Aufgaben müssen immer die Informationen aus der `docs/roadmap.md` und dem `docs/changelog.md` einbezogen werden, um Konsistenz mit der Planung und vergangenen Änderungen zu gewährleisten.
- **Changelog-Pflicht:** Jede signifikante Änderung oder jedes neue Feature muss im `docs/changelog.md` unter der Sektion `[Unreleased]` dokumentiert werden.
- **Code-Stil:** Einheitliche Formatierung und klare Benennung von Variablen und Funktionen.

## Git & Commits
- **Keine Co-Autor-Zeile:** Commit-Nachrichten dürfen **keine** `Co-authored-by:`-Zeile enthalten (insbesondere kein `Co-authored-by: Some AI Agent`).

## Technische Vorgaben
- Framework: Vue.js 3 (Composition API).
- Styling: Ionic CSS Utilities und Scoped CSS in Vue-Komponenten.
- Datenhaltung: Dexie.js für lokale Speicherung; Datenmodellierung erfolgt zentral.

## Umgebungsvariablen & Secrets
- **`.env` wird ins Git eingecheckt** und darf **niemals** Secrets, Passwörter oder Client-IDs enthalten – nur nicht-geheime Standard-/Platzhalterwerte.
- **Geheime bzw. lokale Werte** (z. B. konkrete Google-Client-IDs, Tokens) gehören ausschließlich in `.env.local`. Diese Datei steht in `.gitignore` und wird **nicht** eingecheckt.
- Beim Anlegen neuer Konfigurationswerte immer prüfen: Nicht-geheim → `.env`; geheim/umgebungsspezifisch → `.env.local`.
- **CI/CD (GitHub Pages):** `VITE_*`-Werte werden von Vite zur Build-Zeit eingebacken. Da `.env.local` nicht eingecheckt ist, müssen für den Build benötigte Werte im GitHub-Actions-Build gesetzt werden – als **Repository-Variable** (`${{ vars.NAME }}`) für nicht-geheime Werte (z. B. `VITE_GOOGLE_CLIENT_ID`) bzw. als **Secret** (`${{ secrets.NAME }}`) für echte Geheimnisse.
