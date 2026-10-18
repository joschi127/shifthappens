# PRD: Kalender teilen (ICS-Abo)

Ziel: Die eigenen Schichten erscheinen automatisch in beliebigen Kalender-Apps, bei mir selbst und bei anderen Personen wie Familie oder Partner. Die Lösung soll **systemunabhängig** sein: Outlook, Apple Kalender (auch nur lokal oder mit iCloud, ohne Google-Konto), Google Calendar und alle anderen Apps, die Kalender per URL abonnieren können.

Technischer Ansatz und Abwägung: [ADR 0011](../adr/0011-kalender-teilen-per-ics-im-drive.md) (Status: vorgeschlagen, PoC ausstehend).

## Zielgruppe

- **Ich selbst:** Anzeige der Schichten in den eigenen Kalender-Apps neben anderen Terminen.
- **Andere Personen** (Familie, Partner): sehen, wann ich arbeite. Sie brauchen dafür weder die App noch ein Google-Konto.

Alle abonnieren **denselben Link**.

## Funktionsumfang

1. **Freigabe aktivieren:** in den Einstellungen unter „Kalender teilen“. Voraussetzung ist die Verbindung mit Google Drive. Die App fordert dafür zusätzlich die Berechtigung an, eigene Dateien im Drive anzulegen (`drive.file`).
2. **Link anzeigen und weitergeben:** kopieren oder über das Teilen-Menü versenden, mit einer kurzen Anleitung zum Abonnieren in Outlook, Apple Kalender und Google Calendar.
3. **Automatische Aktualisierung:** Nach Änderungen an Schichten wird die Datei neu geschrieben, sobald die App läuft und angemeldet ist, zusammen mit dem Drive-Sync.
4. **Link zurücksetzen:** Die alte Datei wird gelöscht, eine neue mit neuem Link angelegt. Alle Abos müssen danach neu eingerichtet werden.
5. **Freigabe deaktivieren:** Die Datei wird gelöscht, der Link funktioniert nicht mehr.

## Inhalt der Termine

- **Nur Schichtname und Zeiten.** Notizen werden nie geteilt.
- **Ein Termin pro Schicht**, Titel = Schichtname.
  - **Zeitspanne:** vom Beginn bis zum Ende inklusive anschließender Nachtbereitschaft, damit erkennbar ist, wann man weg ist.
  - **Geteilte Schicht:** Der zweite Teil wird ein eigener Termin, damit die Lücke dazwischen sichtbar bleibt.
  - **Aufteilung an Mitternacht:** Ein Termin über Mitternacht wird in zwei Termine geteilt.
    - **Tag 1:** Beginn bis 23:59, Titel = Schichtname.
    - **Tag 2:** 00:00 bis Ende, Titel = „Schichtname (Fortsetzung)“.
    - **Grund:** Mehrere Kalender-Apps zeigen Termine über Mitternacht oben im Bereich für ganztägige Termine statt im Stundenraster, darunter Outlook teils und laut Nutzerberichten auch iOS-Apps. Google Calendar zeigt sie im Raster.
    - **Warum 23:59:** Der erste Teil endet bewusst nicht um 00:00, denn Termine mit Ende genau um Mitternacht landen in Outlook teils ebenfalls bei den ganztägigen Terminen.
    - **Beispiel:** Spätdienst 14:00–22:00 mit Nachtbereitschaft bis 06:00 → „Spätdienst“ 14:00–23:59 und „Spätdienst (Fortsetzung)“ 00:00–06:00.
    - **Im PoC prüfen:** Ob die Aufteilung in Google Calendar, Apple Kalender und Outlook tatsächlich besser aussieht als ein durchgehender Termin, wird mit beiden Varianten verglichen.
- **Format:**
  - iCalendar (RFC 5545), Zeiten mit Zeitzone `Europe/Berlin` (Umrechnung der Strings aus [ADR 0007](../adr/0007-zeiten-und-datum-als-strings.md)).
  - Bei Schichten über Mitternacht liegt der Fortsetzungs-Termin am Folgetag (Datum aus `Shift.date` + 1).
  - Stabile `UID` pro Termin (Schicht-ID plus Teil, z. B. Hauptteil, Fortsetzung, 2. Teil), damit Kalender-Apps Änderungen als Aktualisierung erkennen statt doppelte Termine anzulegen.
- **Zeitraum:** die letzten 2 Monate und alle künftigen Schichten. Ältere Schichten sind für Empfänger uninteressant, und die Datei bleibt klein.

## Nicht-Ziele

- Schreiben in Kalender bestimmter Anbieter, z. B. über die Google Calendar API. Das wurde verworfen, weil es nicht systemunabhängig ist.
- Mehrere Links pro Empfänger mit einzelnem Widerruf.
- Einmaliger manueller Export als Zwischenlösung. Er kann später als Ergänzung kommen, der Generator wäre wiederverwendbar.

## Bekannte Einschränkungen (akzeptiert)

- **Verzögerung:** Kalender-Apps rufen abonnierte Links in eigenem Takt ab, Google Calendar teils nur alle 12–24 Stunden. Zusätzlich wird die Datei nur aktualisiert, wenn die App läuft und die Google-Anmeldung gültig ist (siehe [ADR 0010](../adr/0010-google-token-mit-ablaufzeit-speichern.md)).
- **Öffentlicher Link:** Wer den Link kennt, sieht Schichtnamen und Zeiten. Ein Widerruf ist nur über einen neuen Link möglich.

## Umsetzungsschritte

1. **PoC** (siehe ADR 0011): Datei mit Freigabe „Jeder mit dem Link“ im Drive anlegen und das Abo in Google Calendar, Apple Kalender (iPhone ohne Google-Konto) und Outlook prüfen.
2. ICS-Generator (`src/utils/ics.ts`) mit Tests.
3. Drive-Anbindung: Datei anlegen und aktualisieren, Freigabe setzen, Link zurücksetzen und löschen.
4. Einstellungen „Kalender teilen“ mit Anleitung.
5. Doku: README und Datenschutzhinweis.
