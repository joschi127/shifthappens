# Projekt-Guidelines

## Entwicklungsprinzipien
- **Mobile First:** Die App ist primär für die Nutzung auf Smartphones optimiert.
- **Offline First:** Alle Kernfunktionen müssen ohne aktive Internetverbindung funktionieren (PWA + Dexie.js).
- **Konsistenz:** Verwendung von Ionic-Komponenten für ein natives Look-and-Feel.

## Dokumentation & Changelog
- **Kontext-Berücksichtigung:** Bei der Bearbeitung von Aufgaben müssen immer die Informationen aus der `docs/roadmap.md` und dem `docs/changelog.md` einbezogen werden, um Konsistenz mit der Planung und vergangenen Änderungen zu gewährleisten.
- **Changelog-Pflicht:** Jede signifikante Änderung oder jedes neue Feature muss im `docs/changelog.md` unter der Sektion `[Unreleased]` dokumentiert werden.
- **Code-Stil:** Einheitliche Formatierung und klare Benennung von Variablen und Funktionen.

## Testen
- **Mobile First auch beim Testen:** Oberflächen werden zuerst in Smartphone-Größe geprüft (z. B. 390 × 844 bzw. 390 × 740 px), Desktop nur ergänzend. Lässt sich das Browserfenster nicht verkleinern (z. B. bei automatisierten Browser-Tests), die App über eine Seite desselben Dev-Servers in einem `<iframe>` dieser Größe laden.
- Dabei besonders auf Touch-Bedienung, Lesbarkeit kleiner Elemente, Überhänge am Bildschirmrand und Kontraste achten.
- Automatisierte Tests: `npm test` (schnell, bei jeder Änderung).

## Sprache
- **Code auf Englisch:** Datei- und Ordnernamen im Code (`src/`, `scripts/`), Funktionen, Variablen, Typen, Felder im Datenmodell, npm-Skripte und Umgebungsvariablen (z. B. `backupService.ts`, `shiftFromType`, `rosterNames`, `test:watch`).
- **Alles andere auf Deutsch:** Kommentare im Code, Oberflächentexte, Doku (`docs/`), Changelog, Commit-Nachrichten.
- Daten und Ordner, die zur Doku gehören (z. B. `docs/beispiele/` mit deutschen Feldnamen in den `*.erwartet.json`), dürfen deutsch benannt sein. Neue Felder im Datenmodell der App sind immer englisch.

## Anforderungen & Architekturentscheidungen
- **PRD pro Feature:** Größere neue Features bekommen ein Anforderungsdokument in `docs/prd/<feature>.md` (Ziel, Grundsätze, Funktionsumfang, Einschränkungen, Umsetzungsschritte mit Status). Es wird während der Umsetzung aktuell gehalten.
- **ADR pro Architekturentscheidung:** Entscheidungen, die über ein einzelnes Feature hinaus wirken oder später angezweifelt werden könnten (z. B. Datenmodell, Backup-Format, externe Dienste), werden als ADR in `docs/adr/NNNN-kurzer-titel.md` festgehalten (Status, Kontext, Entscheidung, Konsequenzen). ADRs werden fortlaufend nummeriert und nicht umgeschrieben; ändert sich eine Entscheidung, entsteht ein neues ADR, das das alte ersetzt bzw. ergänzt (Status des alten entsprechend anpassen).
- Kleinere Detailentscheidungen gehören ins PRD, nicht in ein eigenes ADR.

## Git & Commits
- **Keine Co-Autor-Zeile:** Commit-Nachrichten dürfen **keine** `Co-authored-by:`-Zeile enthalten (insbesondere kein `Co-authored-by: Some AI Agent`).

## Technische Vorgaben
- Framework: Vue.js 3 (Composition API).
- Styling: Ionic CSS Utilities und Scoped CSS in Vue-Komponenten.
- Datenhaltung: Dexie.js für lokale Speicherung; Datenmodellierung erfolgt zentral.

## Lokale Ordner `temp/` und `local/`
Beide Ordner werden **nicht** eingecheckt (außer jeweils einer `.gitkeep`, siehe `.gitignore`).
- **`temp/`** – kurzlebige Arbeitsdateien, z. B. Bilder, die zur Analyse übergeben werden. Inhalte dürfen jederzeit gelöscht werden. Was dauerhaft gebraucht wird, wird nach `docs/` (öffentliche Beispiele) oder `local/` (private Daten) übernommen.
- **`local/`** – dauerhaft aufzubewahrende **private** Daten, die wiederholt genutzt werden, aber nie ins Git oder in die Doku gehören. Beispiel: echte Dienstpläne mit erwarteten Werten als Testdaten für die Texterkennung (`local/dienstplaene/`).
- Aus Daten in `local/` werden in Doku, ADRs und Changelog nur **anonyme Kennzahlen** übernommen, keine Namen oder Inhalte. Auch Zwischenergebnisse von Skripten (z. B. Zellausschnitte) landen nur in `local/` oder `temp/`.

## Umgebungsvariablen & Secrets
- **`.env` wird ins Git eingecheckt** und darf **niemals** Secrets, Passwörter oder Client-IDs enthalten – nur nicht-geheime Standard-/Platzhalterwerte.
- **Geheime bzw. lokale Werte** (z. B. konkrete Google-Client-IDs, Tokens) gehören ausschließlich in `.env.local`. Diese Datei steht in `.gitignore` und wird **nicht** eingecheckt.
- Beim Anlegen neuer Konfigurationswerte immer prüfen: Nicht-geheim → `.env`; geheim/umgebungsspezifisch → `.env.local`.
- **CI/CD (GitHub Pages):** `VITE_*`-Werte werden von Vite zur Build-Zeit eingebacken. Da `.env.local` nicht eingecheckt ist, müssen für den Build benötigte Werte im GitHub-Actions-Build gesetzt werden – als **Repository-Variable** (`${{ vars.NAME }}`) für nicht-geheime Werte (z. B. `VITE_GOOGLE_CLIENT_ID`) bzw. als **Secret** (`${{ secrets.NAME }}`) für echte Geheimnisse.
