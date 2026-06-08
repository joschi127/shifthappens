# Changelog

Alle relevanten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [Unreleased]
- **Schicht-Vorlagen:**
  - Lösch-Button in der Listenansicht durch ein Trash-Icon ersetzt (UI-Konsistenz zum Kalender).
- **Navigation:**
  - Back-Button in `CalendarView.vue` hinzugefügt, um die Rückkehr zur Startseite zu ermöglichen.
- **Kalender-Funktionen:**
  - Löschen von Schichten via Swipe (Sliding Item) in der Detailansicht des Tages mit Sicherheitsabfrage hinzugefügt.
- **Kalender-Verbesserungen:**
  - Optische Kennzeichnung von Nachtschichten: Statt eines separaten Indikators am Folgetag wird der Indikator am Originaltag nun verbreitert dargestellt, um den Übertrag in den nächsten Tag zu symbolisieren.
  - Bugfix: Die `nightStandbyEndTime` wird nun berücksichtigt, wenn eine Schicht über Mitternacht geht und keine `splitEndTime` gesetzt ist.
  - Bugfix: Die `splitEndTime` bei geteilten Schichten wird nun korrekt berücksichtigt, wenn eine Schicht über Mitternacht geht.
  - Markierung des aktuell ausgewählten Tages in der Monatsansicht zur besseren Orientierung hinzugefügt.
  - Schicht-Indikatoren im Kalender vergrößert (von kleinen Punkten zu quadratischen Badges).
  - Anzeige der ersten zwei Buchstaben des Schicht-Namens in den Indikatoren zur besseren Unterscheidbarkeit.
- **Kalender-Funktion:**
  - Neue Kalenderansicht (`CalendarView.vue`) mit Monatsansicht hinzugefügt.
  - Unterstützung für Wochenstart am Montag.
  - Farblich markierte Indikatoren für eingetragene Schichten im Kalender.
  - Möglichkeit, Schichten direkt über den Kalender hinzuzufügen (basierend auf Vorlagen).
  - Löschen von Schichten via Swipe (Sliding Item) in der Detailansicht des Tages.
- **Navigation:**
  - Kalender ist nun die primäre Einstiegsseite.
  - Home-View um Button zum Kalender erweitert.
- **Daten-Backup (Import/Export):**
  - Neue Einstellungsseite (`SettingsView.vue`) mit Funktionen zur Datensicherung hinzugefügt.
  - Export-Funktion: Alle Schichten und Vorlagen können als JSON-Datei heruntergeladen werden.
  - Import-Funktion: Wiederherstellung von Daten aus einer Backup-Datei mit Sicherheitsabfrage.
  - Zugriff über ein neues Einstellungen-Icon in der Toolbar der Startseite.
- Favicon und App Icon hinzugefügt:
  - SVG-basiertes Icon (`public/icon.svg`) für optimale Skalierbarkeit erstellt.
  - `index.html` und `vite.config.ts` (PWA) auf das neue Icon umgestellt.
  - Maskable Icon Support für Android hinzugefügt.
- Idee für Betreuer-Memes (ähnlich Gentler Streak Visualisierungen) zum Ideen-Backlog der Roadmap hinzugefügt.
- Moorhuhn-ähnliches Mini-Game zum Ideen-Backlog der Roadmap hinzugefügt.

### Fixed
- Fehler bei der Datumsauswahl im Kalender behoben: Die Verwendung von `toISOString()` führte aufgrund von Zeitzonen-Offsets dazu, dass beim Anklicken eines Tages oft der vorherige Tag ausgewählt wurde. Dies wurde durch eine neue Utility-Funktion `toISODateString` korrigiert, die das Datum lokal formatiert.
- Import-Fehler in `CalendarView.vue` behoben: Die Abhängigkeit `@vueuse/rxjs` wurde entfernt und durch eine direkte Subscription auf `liveQuery` ersetzt, um externe Abhängigkeiten zu minimieren und Installationsprobleme zu vermeiden.
- Fehlerhafter Icon-Import in `SettingsView.vue` behoben: `uploadOutline` existiert nicht in Ionicons und wurde durch `cloudUploadOutline` (und `cloudDownloadOutline` für Konsistenz) ersetzt.
- Redundantes Theme-Umschalt-Icon entfernt: Der Button wurde im Desktop-Browser doppelt angezeigt, da er sowohl im Standard-Header als auch im Condensed-Header (iOS) vorhanden war.
- Weiße Seite beim Start behoben: Ein `SyntaxError` wurde durch einen falschen Icon-Import (`sun` statt `sunny`) verursacht. Dies verhinderte das Laden der gesamten App.
- Dark Mode CSS & Logik: Die Selektoren und der `themeService.ts` wurden auf den Ionic-Standard (`html.dark`) migriert, was nun zusammen mit dem JavaScript-Fix korrekt funktioniert.

### Added
- Dark Mode Unterstützung hinzugefügt:
  - Umschalter in der `HomeView.vue` integriert.
  - Theme-Definitionen in `src/theme/variables.css`.
  - Dauerhafte Speicherung der Einstellung über `themeService.ts`.

### Changed
- Schicht-Vorlagen: Die manuelle Sortierung wurde robuster gestaltet, um Probleme bei Datenbank-Upgrades zu vermeiden. Ein Bug wurde behoben, durch den die Liste unter bestimmten Umständen leer blieb.
- Schicht-Vorlagen: Die automatische Sortierung nach Uhrzeit wurde entfernt. Stattdessen können Vorlagen nun manuell per Drag & Drop in der Liste umsortiert werden.
- Darstellung der Bereitschaftszeit in der Listenansicht: Formatierung an andere Zeitangaben angepasst (Leerzeichen um den Bindestrich) sowie Farbe und Schriftgröße vereinheitlicht.
- Geteilte Schichten in der Listenansicht: Abstand zur Hauptschicht angeglichen und Trenner von "&" auf "+" geändert.

### Removed
- Datenbank-Test-Funktion und Button in `HomeView.vue` entfernt, da das Grundgerüst nun stabil ist.

### Added
- Vite-Konfiguration: `--host` standardmäßig aktiviert, um die App im lokalen Netzwerk erreichbar zu machen (wichtig für Mobile-Tests).

### Changed
- Logo-Design erneut überarbeitet: Das Logo kombiniert nun eine klassische Stempeluhr mit Cyborg-Elementen (rotes Scan-Auge, Antennen). Der Wortwitz wird durch den Schriftzug "SCHICHT-TERMINATOR" und eine "SHIFT"-Stempelkarte verdeutlicht.
- Logo-Design verfeinert (vorheriger Versuch): Das Comic-Logo wurde zu einem "Cyborg-Uhr"-Stil umgestaltet.

### Added
- Detaillierte Aufschlüsselung der Arbeitszeit im Schicht-Typ-Editor:
  - Anzeige von Hauptschicht, Pause, Nachtbereitschaft und geteilter Schicht als Einzelwerte in der Zusammenfassung.
- Anzeige der Gesamt-Arbeitszeit im Schicht-Typ-Editor:
  - Automatische Berechnung basierend auf Hauptschicht, Pause, geteilter Schicht und Nachtbereitschaft (anteilig).
  - Übersichtliche Darstellung in einer Zusammenfassungs-Karte.
- Utility-Funktionen zur Zeitberechnung (`getDurationMinutes`, `formatDuration`) in `src/utils/timeUtils.ts`.

### Added
- **Projekt-Guidelines:** Hinweis zur verpflichtenden Berücksichtigung von `ROADMAP.md` und `CHANGELOG.md` bei der Bearbeitung von Aufgaben hinzugefügt.

### Added
- ROADMAP.md aktualisiert: Rufbereitschaft als geplantes Feature für V2 hinzugefügt.
- Sinnvolle Default-Werte für geteilte Schichten und Nachtbereitschaft:
  - Geteilte Schicht: Startzeit = Ende + 2h, Endzeit = Start + 2h.
  - Nachtbereitschaft: 23:00 bis 06:00 Uhr.
- Unterstützung für Nachtbereitschaft in Schicht-Vorlagen hinzugefügt:
  - Konfiguration von Beginn, Ende und Anrechnungsprozentsatz (Default 25%).
  - Anzeige der Nachtbereitschaft in der Schicht-Typ-Liste.
- Löschfunktion für Schicht-Vorlagen im Editor hinzugefügt (zusätzlich zur Swipe-Geste in der Liste).

### Changed
- Bugfix: Korrektur der automatischen Vorbelegung für den Beginn der Nachtbereitschaft (wurde fälschlicherweise mit 23:00 Uhr initialisiert).
- Default-Wert für Beginn der Nachtbereitschaft: Verwendet nun zuverlässig die Endzeit der normalen Schicht beim Aktivieren der Option.
- Reihenfolge der Schicht-Optionen im Editor angepasst: Nachtbereitschaft wird nun vor dem geteilten Dienst angezeigt.
- Sortierung der Schicht-Vorlagen verfeinert: Primär nach Startzeit, sekundär nach Endzeit (letzte Endzeit bei geteilten Schichten).
- Aktualisierung der Schicht-Typ-Liste verbessert: Daten werden nun zuverlässig neu geladen, wenn man zur Liste zurückkehrt (Bugfix).
- Formatierung der Zeitanzeige in der Schicht-Typ-Liste korrigiert (nur Uhrzeit statt ISO-String).
- Bei geteilten Schichten werden nun auch die Zeiten des zweiten Teils in der Listenansicht angezeigt.
- Schicht-Vorlagen in der Listenansicht werden nun automatisch nach Startzeit sortiert.
- Farbauswahl im Schicht-Typ-Editor kompakter gestaltet: Von einem statischen Grid zu einer horizontal scrollbaren Zeile gewechselt, um Platz zu sparen.
- Farbauswahl im Schicht-Typ-Editor verbessert: Freie Farbwahl durch eine vordefinierte Palette von Material Design Farben ersetzt.

### Added
- Unterstützung für 24-Stunden-Format in der Roadmap und im Schicht-Typ-Editor sichergestellt.
- Erster Prototyp für die Schicht-Typ-Definition implementiert:
  - `ShiftTypeListView.vue`: Übersicht aller Schicht-Vorlagen.
  - `ShiftTypeEditView.vue`: Erstellen und Bearbeiten von Schicht-Vorlagen inkl. Pausenberechnung.
  - Routing und Navigation in `HomeView.vue` integriert.
- .gitignore mit Best Practices für Vue/Vite und IntelliJ-Dateien hinzugefügt.
- ROADMAP.md aktualisiert: Automatische Vorbelegung der Pausenzeiten nach gesetzlichen Vorgaben ergänzt.
- Technisches Datenmodell (Dexie.js) auf Version 2 aktualisiert: Unterstützung für Schicht-Typen, Pausen, Notizen und geteilte Schichten.
- ROADMAP.md aktualisiert: Kalender-Konfiguration (Wochenstart Montag) und Design-Vorgaben (Material Design Farben) ergänzt.
- ROADMAP.md aktualisiert: Dark Mode und Light Mode für V1 ergänzt.
- ROADMAP.md aktualisiert: Notizfunktion für Schichten in V1 aufgenommen.
- ROADMAP.md aktualisiert: Ideen-Backlog verfeinert (Trennung von Terminen und Aufgaben).
- ROADMAP.md aktualisiert: Sektion "Ideen-Backlog" mit ersten Zukunftsideen hinzugefügt.
- ROADMAP.md aktualisiert: Wochenansicht für V1 hinzugefügt.
- ROADMAP.md erstellt: Definition des Funktionsumfangs für V1 (inkl. Pausen, geteilte Schichten, Nachtbereitschaft) und Ausblick auf V2 (Standort-basierte Automatisierung).
- Projekt-Initialisierung mit README.md, CHANGELOG.md und Guidelines.
- Technologische Basis: Vue.js 3, Ionic Framework, Vite, Dexie.js.
- "Hallo Welt" Grundgerüst mit Ionic-Komponenten und Datenbank-Test.
- PWA-Setup mit `vite-plugin-pwa` für Offline-Support.
