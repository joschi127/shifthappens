# PRD: Dienstplan-Import per Foto/PDF

Ziel: Der Nutzer fotografiert einen Dienstplan oder lädt ihn als Datei hoch (JPG, PNG, PDF). Die App erkennt **nur die eigene Zeile** und trägt die Schichten nach Bestätigung halbautomatisch ein.

## Grundsätze

- **Datenschutz:** Falls überhaupt eine Cloud-Erkennung genutzt wird, verlässt nur ein Bildstreifen mit den eigenen Schichtkürzeln das Gerät, ohne Namen, ohne Kollegen und ohne EXIF-Daten.
- **Das Foto bleibt flüchtig:** Es liegt nur im Arbeitsspeicher, nie in IndexedDB, im Export oder im Drive-Sync. Nur bestätigte Schichten werden zu normalen Einträgen.
- **Kein eigenes Backend, keine Geheimnisse in der App.**
- **Offline First:** Die lokalen Teile (Eingabe, Bereichsauswahl, Texterkennung) funktionieren ohne Netz. Große Dateien (Tesseract, pdf.js-Worker) werden beim ersten Einsatz geladen und vom Service Worker gecacht.

## Architekturentscheidungen

- [ADR 0001: Texterkennung zuerst lokal, Cloud nur als Rückfall](../adr/0001-texterkennung-lokal-vor-cloud.md)
- [ADR 0002: Schichtkürzel an der Schicht-Vorlage](../adr/0002-schichtkuerzel-an-schicht-vorlage.md)
- [ADR 0003: Import-Einstellungen in Dexie, mit Backup und Drive-Sync](../adr/0003-import-einstellungen-in-dexie-mit-sync.md)

## Funktionsumfang

1. **Eingabe:** direkt über die Kamera oder als hochgeladene Datei.
   - Das Bild wird über das Canvas neu gespeichert. Das korrigiert die EXIF-Drehung und entfernt Metadaten.
   - HEIC wird konvertiert, wenn der Browser das kann, sonst mit klarem Hinweis abgelehnt.
   - PDFs werden mit pdf.js dargestellt, bei mehreren Seiten mit Seitenauswahl.
2. **Name im Dienstplan finden:** Je nach Arbeitgeber steht dort der volle Name, nur der Vor- oder Nachname, Initialen oder ein Kürzel. Mehrere Schreibweisen sind möglich.
   - Der Abgleich toleriert mehrteilige Namen, Zeichensetzung und Reihenfolge.
   - Die Toleranz richtet sich nach der Länge: kurze Kürzel nur exakt, bis 6 Zeichen eine Abweichung, ab 7 Zeichen zwei.
   - Bei mehreren Treffern wählt der Nutzer die richtige Zeile.
   - Gesucht wird nur in der Namensspalte laut Vorlage.
   - Hat das PDF eine Textebene, wird sie direkt genutzt, sonst Tesseract.
3. **Bereichsauswahl:**
   - Ein **Viereck mit vier ziehbaren Ecken** wird entzerrt, mit einer Lupe beim Ziehen. Grund: Handyfotos sind fast immer schräg.
   - Das Viereck wird aus der Namenssuche oder der Vorlage vorbelegt und kann angepasst werden.
   - Erste und letzte Tagesspalte werden festgelegt, die Spalten dazwischen gleichmäßig aufgeteilt.
4. **Monat und Jahr** bestätigt der Nutzer (Vorschlag: nächster Monat). Das Datum ergibt sich aus der Spaltenposition.
5. **Zellraster:** Die Namenszelle wird abgeschnitten. Die Zellen werden mit lokal erzeugten Indizes (1…31) neu zusammengesetzt, mit Vorschau.
6. **Erkennung** pro Zelle über das Interface `CellRecognizer`, siehe ADR 0001.
7. **Kürzel auflösen:** Jedes Kürzel wird auf ein Schichtkürzel einer Vorlage oder auf ein Kürzel ohne Eintrag abgebildet, mit Abstandsabgleich und Konfidenz pro Zelle.
8. **Bestätigungsansicht:**
   - Unsichere Zellen sind hervorgehoben und lassen sich per Tippen auf ein Schichtkürzel korrigieren.
   - Mit „Kürzel merken“ wird ein unbekanntes Kürzel an der Vorlage gespeichert.
   - Konflikte mit bestehenden Einträgen werden geklärt: überschreiben, überspringen oder einzeln entscheiden.
   - Danach wird normal gespeichert, der Drive-Sync läuft wie bisher.

## Einstellungen

- **Name im Dienstplan** (mehrere Schreibweisen) und **Kürzel ohne Eintrag**: Einstellungen → Dienstplan-Import.
- **Schichtkürzel im Dienstplan**: an der jeweiligen Schicht-Vorlage.
- **Import-Vorlagen**: Lage (horizontal; vertikal folgt später), zuletzt gewählter Bereich und Anteil der Namenszelle.

## Einschränkungen in V1

- Ein Kürzel pro Tageszelle. Kombinationen wie „F/S“ werden als unsicher markiert.
- Nur die horizontale Vorlage (eine Zeile pro Person).

## Umsetzungsschritte

1. ✅ Datenmodell und Einstellungen: Schichtkürzel, Import-Profil, Tabelle `importSettings`, gemeinsame Backup-Funktionen, `shiftFromType`, Vitest.
2. Eingabe: Kamera und Datei, Normalisierung, HEIC-Hinweis, PDF mit Seitenauswahl.
3. Bereichsauswahl (Viereck), Monat und Jahr, Spaltenaufteilung, Zellraster mit Vorschau.
4. Bestätigungsansicht mit Konfliktklärung und Speichern.
5. PDF-Textebene: Name und Zellen direkt aus dem Text lesen.
6. Tesseract: Namenssuche sowie **PoC der Zellerkennung**. Danach anhand von 2–3 echten Plänen entscheiden, ob die Cloud-Erkennung nötig ist (ADR 0001).
7. (Optional) Cloud-Erkennung über Firebase AI Logic mit App Check, mit eigenem ADR.
8. Doku: README (Einrichtung), Datenschutzhinweis.

## Geplante Module

```
src/import/
  imageInput.ts       Datei → normalisiertes Bild
  pdfInput.ts         pdf.js: Seiten rendern, Textebene mit Positionen
  geometry.ts         Homographie, Spaltenaufteilung
  stripComposer.ts    Zellraster für die Erkennung
  nameLocator.ts      Namenssuche (Tesseract bzw. Textebene)
  codeResolver.ts     Kürzel → Schicht-Vorlage, Konfidenz
  recognizers/        gemeinsames Interface CellRecognizer
  importService.ts    Konflikte, Speichern
src/views/ScheduleImportView.vue
src/components/import/RegionSelector.vue, ConfirmShiftsList.vue
```
