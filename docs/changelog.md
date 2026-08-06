# Changelog

Alle relevanten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [Unreleased]
- **Guidelines:**
  - Neue Regel in `docs/guidelines.md` (Abschnitt „Git & Commits"): Commit-Nachrichten dürfen keine `Co-authored-by:`-Zeile enthalten.
- **Startseite:**
  - Bugfix (iOS/Safari): Das Logo auf dem Startbildschirm (`HomeView.vue`) überlappte auf echten iPhones in Safari den Titel, da der Inhalt via `position: absolute` und `translateY(-50%)` vertikal zentriert wurde. Bei niedriger Viewport-Höhe wurde der (höhere) Inhalt über den sichtbaren Bereich hinausgeschoben. Die Zentrierung erfolgt nun im normalen Fluss per Flexbox (`min-height: 100%`) inkl. Safe-Area-Padding. Zusätzlich erhält das SVG-Logo explizite `width`/`height`-Attribute für eine zuverlässige Größenberechnung in Safari.
  - Beta-Hinweis-Box auf der Startseite (`HomeView.vue`) hinzugefügt, die darauf hinweist, dass es sich noch um eine Beta-Version handelt, es zu Fehlern kommen und Daten verloren gehen können.
- **Navigation:**
  - Startseite ist nun wieder die primäre Einstiegsseite: Der Start-Redirect (`src/router/index.ts`) verweist von `/calendar` auf `/home`, damit man beim App-Start auf der Home-Ansicht landet.
- **PWA-Installation ("Zum Startbildschirm hinzufügen"):**
  - Neuer Installations-Button auf der Startseite (`HomeView.vue`), der nur erscheint, wenn die App im Browser (nicht bereits als PWA) läuft. Der Button verwendet den `outline`-Stil (ohne gefüllte Hintergrundfarbe), damit die Beschriftung gut lesbar bleibt; das Download-Icon hebt ihn zusätzlich hervor.
  - Neuer Service `pwaInstallService.ts`, der das `beforeinstallprompt`-Event (Android/Chromium) abfängt und den Standalone-/Installationsstatus reaktiv bereitstellt.
  - Plattformgerechte Best-Practice-Beschriftung: "App installieren" (Android/Desktop) bzw. "Zum Home-Bildschirm hinzufügen" (iOS) mit Anleitung über das Safari-Teilen-Menü, da iOS keinen automatischen Installationsdialog unterstützt.
- **Konfiguration & Dokumentation:**
  - Klargestellt, dass `.env` (ohne Secrets) ins Git eingecheckt wird und geheime Werte/Client-IDs in `.env.local` gehören – in `README.md` korrigiert und in `docs/guidelines.md` ergänzt.
  - GitHub-Pages-Deployment: `VITE_GOOGLE_CLIENT_ID` wird jetzt im Actions-Build aus einer Repository-Variable (`vars.VITE_GOOGLE_CLIENT_ID`) gesetzt; Anleitung in `README.md` und `docs/guidelines.md` ergänzt.
- **Navigation & Startseite:**
  - Neues (vermutlich vorübergehendes) Comic-Logo auf dem Startbildschirm (`HomeView.vue`): moderner Uhr-Charakter mit zwinkerndem Gesicht, rotierenden Zeigern, kreisenden „Shift"-Pfeilen und blinkendem Funken – professionell, modern und humorvoll. Berücksichtigt `prefers-reduced-motion`.
  - App-/PWA-Icon (`public/icon.svg`) an den neuen Logo-Stil angepasst: vereinfachte, statische Version des Home-Logos (Gradient-Badge, Uhr-Gesicht, Zeiger, „Shift"-Pfeile) ohne Animation für optimale Lesbarkeit in kleinen Größen.
  - Menüpunkt für die Einstellungen auf der Startseite (`HomeView.vue`) hinzugefügt.
- **Einstellungen:**
  - Dark Mode / Light Mode Umschalter in die Einstellungsseite (`SettingsView.vue`) integriert.
- **Schicht-Vorlagen:**
  - Lösch-Button in der Listenansicht durch ein Trash-Icon ersetzt (UI-Konsistenz zum Kalender).
- **Navigation:**
  - Back-Button in `CalendarView.vue` hinzugefügt, um die Rückkehr zur Startseite zu ermöglichen.
- **Kalender-Funktionen:**
  - Löschen von Schichten via Swipe (Sliding Item) in der Detailansicht des Tages mit Sicherheitsabfrage hinzugefügt.
- **Kalender-Verbesserungen:**
  - Sortierung der Schichten: Schichten werden nun sowohl in der Monatsansicht (Indikatoren) als auch in der Tagesliste chronologisch nach ihrer Startzeit sortiert angezeigt.
  - Bugfix: Layout-Stabilität und Ausrichtung im Kalender weiter verfeinert. Die Markierung des ausgewählten Tages wurde von `border` auf `outline` umgestellt, um Layout-Verschiebungen zu verhindern.
  - Bugfix: Layout-Stabilität bei der Markierung des aktuellen Tages verbessert. Durch die Definition fester Dimensionen für die Datumsanzeige wird verhindert, dass die Schicht-Indikatoren bei der Hervorhebung von "Heute" verschoben werden.
  - Linksbündige Ausrichtung: Die Kalendertage (Datumszahlen) und Schicht-Indikatoren sind nun konsistent linksbündig ausgerichtet, um ein modernes und aufgeräumtes Layout zu gewährleisten.
  - Optische Verfeinerung: Der Schatten und der helle Streifen am rechten Rand der Nachtschicht-Indikatoren wurden entfernt und der Eckenradius vereinheitlicht. Zudem wurde ein linker Einzug (8px) für Nachtschichten hinzugefügt, um den späten Schichtbeginn visuell zu verdeutlichen.
  - Layout-Korrektur für Nachtschichten: Die Indikatoren werden nun linksbündig ausgerichtet (mit leichtem Einzug für Nachtschichten) und der negative Margin korrigiert, um eine präzise Überlappung in den Folgetag zu gewährleisten.
  - Bugfix: Ein Initialisierungsfehler (`ReferenceError`) im Kalender wurde behoben, indem die Definition von `calendarDays` vor den darauf zugreifenden `watch` verschoben wurde.
  - Bugfix: Die Berechnung der Zellbreite im Kalender wurde robuster gestaltet (Verwendung von `nextTick`, `requestAnimationFrame` und Fallback-Retry), um sicherzustellen, dass die CSS-Variable für Nachtschicht-Indikatoren korrekt gesetzt wird.
  - Dynamische Breite für Nachtschicht-Indikatoren: Die Breite wurde weiter optimiert (+20px) und wird basierend auf der tatsächlichen Breite der Kalenderzellen berechnet, damit der Indikator konsistent bis in den nächsten Tag ragt (Default-Fallbeback auf 61px optimiert für iPhone 14).
  - Optische Kennzeichnung von Nachtschichten: Die Indikatoren für Nachtschichten ragen nun deutlich in den Folgetag hinein, um den Überhang besser zu visualisieren.
  - Bugfix: Die Erkennung von Nachtschichten wurde robuster gestaltet, indem bei fehlenden Zeitangaben an der Schicht automatisch auf die Werte der zugehörigen Vorlage zurückgegriffen wird.
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
