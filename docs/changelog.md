# Changelog

Alle relevanten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [Unreleased]
- **Synchronisation (Google Drive):**
  - Bugfix: Nach dem Neuladen bzw. Neustart der App lief der automatische Sync still ins Leere, weil das Zugriffstoken nur im Arbeitsspeicher lag, während die Einstellungen weiterhin „Verbunden“ anzeigten. Das Token wird nun mit Ablaufzeit gespeichert (ADR 0010), der automatische Sync läuft direkt beim App-Start, und eine abgelaufene Anmeldung wird in den Einstellungen sowie einmal pro Sitzung per Hinweis mit „Anmelden“-Knopf angezeigt (erneute Anmeldung ohne Kontoauswahl über `login_hint`).
  - Bugfix: Ein Fehler beim Abrufen der Cloud-Dateiliste wurde als „keine Datei vorhanden“ gewertet, wodurch eine zweite Backup-Datei hätte angelegt werden können. Abgelaufene Tokens (HTTP 401) werden nun erkannt.
  - Bugfix: Wurde das Google-Anmeldefenster geschlossen, blieb der Ladedialog des manuellen Syncs hängen.
  - Beim Trennen wird das Zugriffstoken bei Google widerrufen.
- **Dokumentation:**
  - Roadmap: Google Drive Sync und Dienstplan-Import als „in Arbeit“ markiert (Backup & Sync umgesetzt, Kalender-Abo offen); Rufbereitschaft, Smart-Checkout und Statistiken aus V2 ins Ideen-Backlog verschoben.
  - PRD Dienstplan-Import: Entscheidungen zu Variante 3/4 festgehalten (Urlaub übernehmen, Nachtdienste zusammenfassen, nur Kalendermonate, Uhrzeiten aus dem Plan in V1 nicht lesen); Idee „Schicht-Vorlagen automatisch aus Foto anlegen“ ins Ideen-Backlog aufgenommen.
  - PRD Dienstplan-Import: Schichten mit handschriftlicher Korrektur werden beim Import übernommen und als „zu prüfen“ markiert (gelbes „?!“-Symbol in Kalender und Tagesliste, entfernbar per „Geprüft“).
  - PRD Dienstplan-Import vollständig überarbeitet: Variante 3 (Unterzeilen D/S/B/A/E) als Hauptfall, Rollen der Unterzeilen, Ablauf inkl. Drehen, Nachbearbeitung der Erkennung (Einrasten, Ähnlichkeit, Unsicherheit), neue Umsetzungsschritte und Module.
  - ADR 0001, Nachtrag 2: Simulation mit einem echten Dienstplan-Foto (nur lokal in `local/`), Optimierung der Erkennung (Einrasten auf Gitterlinien, ungleiche Ränder mit Linienentfernung, Streifen-Erkennung, Muster pro Plan) und automatische Suche des eigenen Blocks (Name, Tageszahlen, Gitterlinien). Ergebnis über 1288 Zellen: keine sicher falsche Zelle, 3–4 % unsicher. Skripte und Parameter in `scripts/poc/`.
  - PRD Dienstplan-Import: automatischer Bereichsvorschlag, überarbeitetes Erkennungsverfahren, Simulationsergebnis; `////` und `D03` als außerhalb des Umfangs festgehalten.
  - ADR 0001: Nachtrag mit Simulation der lokalen Erkennung (`scripts/poc/lokale-erkennung.mjs`, tesseract.js 7): auf dem Foto von Variante 3 keine sicher falsche Zelle, 13 % als unsicher markiert; neues Erfolgskriterium.
  - ADR 0013: Regel zur Tageszuordnung der Teile einer Schicht (Hauptteil → Bereitschaft → zweiter Teil).
  - ADR 0014: Schichten speichern Herkunft (manuell/Import), Anlage-, Import- und Änderungszeitpunkt, die Art der letzten Änderung sowie einen Prüfhinweis; ein erneuter Import überschreibt früher importierte Schichten des Monats, selbst angelegte bleiben unangetastet.
  - PRD Dienstplan-Import: Abwesenheiten im geteilten Kalender sichtbar und am selben Tag wie eine Schicht erlaubt; unvollständige Kürzel (z. B. „S“) werden über ein zusätzliches Schichtkürzel oder per Rückfall auf die erste passende Vorlage aufgelöst und als „zu prüfen“ markiert.
  - ADR 0013: Kombinierte Schichtkürzel über zwei Tage (z. B. `N01 + B11 + F02`) im vorhandenen Feld der Schichtkürzel, damit Nachtdienste aus dem Dienstplan zu einer Schicht zusammengefasst werden.
  - ADR 0012: Abwesenheiten (z. B. Urlaub) werden als eigene Art von Schicht-Vorlage abgebildet (ganztägig, ohne Zeiten, keine Arbeitszeit); PRDs Dienstplan-Import, Schicht-Vorlagen, Kalender und Kalender teilen entsprechend ergänzt.
  - PRD „Kalender teilen (ICS-Abo)“ und ADR 0011 (ICS-Datei mit öffentlichem Link im Google Drive, Status: vorgeschlagen, PoC ausstehend) angelegt.
  - Bestehende Funktionen nachträglich als PRDs dokumentiert (`docs/prd/`: Schicht-Vorlagen, Kalender, Datensicherung und Synchronisation), inkl. Abgleich mit dem tatsächlichen Stand im Code (z. B. Wochen-/Agenda-Ansicht, Schnelleingabe und Notizen noch offen).
  - Bisherige Architekturentscheidungen nachträglich als ADR 0004–0009 dokumentiert (Tech-Stack, Offline First, Kopie der Vorlagenwerte, Zeit-/Datumsformat, Drive-Sync, Hosting & Konfiguration), jeweils mit bekannten Einschränkungen. Übersichten in `docs/adr/README.md` und `docs/prd/README.md`.
- **Dienstplan-Import (Vorbereitung, Schritt 1):**
  - Referenz-Dienstpläne (generierte Dummy-Daten, sauberes Bild und Foto) mit erwarteten Werten in `docs/beispiele/dienstplaene/`: Variante 1 mit Namens- und Kürzelspalte, Variante 2 nur mit Kürzel (per Skript abgeleitet, Foto synthetisch), Variante 3 im realistischen Format mit Unterzeilen D/S/B/A/E (Hauptfall), Variante 4 mit handschriftlichen Korrekturen (ersetzt und ersatzlos gestrichen) und Notizen; einheitliche Dateinamen (`-sauber`, `-foto`, `.erwartet.json`), Testhilfe `src/testing/referenceRosters.ts` und Konsistenztests. Erkenntnisse daraus im PRD festgehalten.
  - TypeScript: `tsconfig.json` lädt nur noch die Typen von `vite/client` automatisch; Node-Typen (`@types/node`) werden ausschließlich in Testhilfen eingebunden. Behebt nebenbei den Typfehler zu `import.meta.env` in `src/router/index.ts`.
  - Schicht-Vorlagen haben ein neues Feld **„Schichtkürzel im Dienstplan“** (`ShiftType.codes`, mehrere Kürzel möglich). Es wird so eingegeben, wie die Schicht auf dem Papier-Dienstplan steht, und dient später der automatischen Erkennung. Doppelte Kürzel über mehrere Vorlagen hinweg werden beim Speichern abgelehnt.
  - Neuer Bereich **„Dienstplan-Import“** in den Einstellungen mit „Name im Dienstplan“ (voller Name, Vor-/Nachname, Initialen oder Kürzel, mehrere Schreibweisen möglich) und „Kürzel ohne Eintrag“ (z. B. frei, Urlaub, krank). Ein Kürzel kann nicht gleichzeitig Schichtkürzel und Kürzel ohne Eintrag sein.
  - Neue Dexie-Tabelle `importSettings` (Schema-Version 5) für Import-Profil und künftige Import-Vorlagen. Sie wird im Backup-Export und in der Google-Drive-Synchronisation mitgesichert (Backup-Format Version 2). Ältere Backups (Version 1) lassen sich weiterhin importieren; die lokalen Import-Einstellungen bleiben dabei erhalten.
  - Export, Import und Drive-Sync nutzen jetzt gemeinsame Funktionen (`backupService.ts`) statt vier separater Implementierungen.
  - Neue wiederverwendbare Komponente `TagListInput.vue` für Listen-Eingaben (Chips, per Tastatur bedienbar).
  - Das Anlegen einer Schicht aus einer Vorlage ist nach `utils/shiftFactory.ts` ausgelagert (vom Kalender und künftig vom Import genutzt).
- **Synchronisation:**
  - Bugfix: Änderungen an Schicht-Vorlagen (Anlegen, Bearbeiten, Löschen, Umsortieren) haben die Daten nicht als lokal geändert markiert und wurden deshalb bei der Google-Drive-Synchronisation nicht hochgeladen bzw. konnten von einem älteren Cloud-Stand überschrieben werden. `ShiftTypeEditView.vue` und `ShiftTypeListView.vue` rufen nun `markLocalModified()` auf.
- **Tests & Agenten:**
  - Simulationsskripte für die lokale Dienstplan-Erkennung in `scripts/poc/` (`lokale-erkennung.mjs`, `finde-zeile.mjs`, Anleitung und beste Parameter in `scripts/poc/README.md`). Sie unterstützen Pläne mit und ohne Unterzeilen sowie Varianten mit Verweis auf eine Basisvariante und können mit neuen Beispielbildern wiederverwendet werden. Abhängigkeiten werden nur temporär installiert (`npm install --no-save tesseract.js pngjs jpeg-js`).
  - Neue lokale Ordner: `temp/` (kurzlebige Arbeitsdateien) und `local/` (dauerhaft aufzubewahrende private Daten, z. B. echte Dienstpläne als Testdaten); beide außer `.gitkeep` nicht eingecheckt, Zweck in `.gitignore` und `docs/guidelines.md` erklärt.
  - Vitest als Test-Framework eingeführt (`npm test`), inkl. `fake-indexeddb` für Datenbank-Tests. Erste Tests für Backup-Format, Listen-Eingaben und Schicht-Erzeugung.
  - Dokumentationsstruktur: Anforderungen als PRDs in `docs/prd/`, Architekturentscheidungen als ADRs in `docs/adr/` (Regel in `docs/guidelines.md` ergänzt). Erste Einträge: PRD Dienstplan-Import sowie ADR 0001–0003.
  - `CLAUDE.md` und `AGENTS.md` angelegt, die analog zu `.junie/guidelines.md` auf `docs/guidelines.md` verweisen.
- **Deployment (GitHub Pages / CI):**
  - Chore: Changelog-Eintrag hinzugefügt, um nach der Umstellung der Pages-Source auf *GitHub Actions* einen Push auf `main` und damit einen ersten Deployment-Lauf über den neuen offiziellen Workflow auszulösen.
  - Bugfix: Das GitHub-Pages-Deployment schlug im automatischen Workflow „pages build and deployment" mit `Invalid actions OIDC token due to No keys from key endpoint match the id token` fehl. Ursache war das branch-basierte Deployment über `peaceiris/actions-gh-pages` (Push auf `gh-pages`), das den fehleranfälligen Legacy-Pages-Build auslöste. Der Workflow (`.github/workflows/deploy.yml`) nutzt nun das **offizielle GitHub-Pages-Deployment** (`actions/configure-pages` + `actions/upload-pages-artifact` + `actions/deploy-pages`) mit den Berechtigungen `pages: write` und `id-token: write` (OIDC) sowie einer `concurrency`-Gruppe. Ein `gh-pages`-Branch wird nicht mehr benötigt; die Pages-Source muss auf *GitHub Actions* umgestellt werden.
  - Behebung der Deprecation-Warnung „Node.js 20 is deprecated": Veraltete Actions (`actions/checkout@v4`, `actions/upload-artifact@v4`) wurden durch aktuelle Versionen ersetzt (`actions/checkout@v5` bzw. das artefaktbasierte `actions/upload-pages-artifact@v3`).
- **Kalender:**
  - Bugfix: Bei mehreren Schichten an einem Tag wuchs die Kalenderzelle vertikal und der Inhalt lief über (`CalendarView.vue`). Der vertikale Überlauf wird nun ausgeblendet, während der horizontale Überlauf der Nachtschicht-Indikatoren (Überhang in den Folgetag) erhalten bleibt. Umgesetzt über `clip-path: inset(0 -100px 0 0)` auf `.calendar-day`, da ein einfaches `overflow-y: hidden` gemäß CSS-Spezifikation die andere Achse auf `auto` (clipping) zwingen und damit den horizontalen Überhang abschneiden würde.
  - Bugfix (Folgekorrektur): Der horizontale Nachtschicht-Überhang war nach der obigen Änderung nicht mehr sichtbar. Ursache: `clip-path` erzeugt pro Zelle einen eigenen Stacking-Context, wodurch der `z-index: 5` des Indikators innerhalb der Zelle „gefangen" war und die später gerenderte Folgezelle den Überhang verdeckte. Tage mit einer über Mitternacht gehenden Schicht erhalten nun die Klasse `has-crossing-shift` mit `z-index: 6`, sodass der Überhang wieder über der Nachbarzelle liegt.
  - Bugfix (finale Korrektur): Da der Überhang mit `clip-path` weiterhin nicht zuverlässig sichtbar wurde, wurde `clip-path` auf `.calendar-day` durch die Kombination `overflow-x: visible` + `overflow-y: clip` ersetzt. Diese Kombination ist laut CSS-Spezifikation zulässig (beide sind „non-scrollable values", daher wird keine Achse auf `auto`/`hidden` umgerechnet): Der vertikale Überlauf wird geklippt, der horizontale Nachtschicht-Überhang bleibt erhalten. Anders als `clip-path` erzeugt `overflow: clip` keinen eigenen Stacking-Context, wodurch der Überhang (zusammen mit `has-crossing-shift`, `z-index: 6`) korrekt über der Nachbarzelle liegt.
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
