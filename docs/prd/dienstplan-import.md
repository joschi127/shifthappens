# PRD: Dienstplan-Import per Foto/PDF

Ziel: Der Nutzer fotografiert einen Dienstplan oder lädt ihn als Datei hoch (JPG, PNG, PDF). Die App erkennt **nur die eigenen Einträge** und trägt die Schichten nach Bestätigung halbautomatisch ein.

## Grundsätze

- **Datenschutz:** Die Erkennung läuft lokal auf dem Gerät. Falls später eine Cloud-Erkennung als Rückfall dazukommt, verlässt nur ein Bildstreifen mit den eigenen Einträgen das Gerät, ohne Namen, ohne Kollegen und ohne EXIF-Daten.
- **Das Foto bleibt flüchtig:** Es liegt nur im Arbeitsspeicher, nie in IndexedDB, im Export oder im Drive-Sync. Nur bestätigte Schichten werden zu Einträgen.
- **Kein eigenes Backend, keine Geheimnisse in der App.**
- **Offline First:** Eingabe, Bereichsauswahl und Erkennung funktionieren ohne Netz. Große Dateien (Tesseract, pdf.js-Worker) werden beim ersten Einsatz geladen und vom Service Worker gecacht.
- **Lieber unsicher als falsch:** Was die Erkennung nicht sicher lesen kann, wird als unsicher markiert und nie stillschweigend geraten.

## Architekturentscheidungen

| ADR | Inhalt |
|---|---|
| [0001](../adr/0001-texterkennung-lokal-vor-cloud.md) | Texterkennung lokal (Tesseract.js), Cloud nur als Rückfall. Mit Nachtrag zur Simulation. |
| [0002](../adr/0002-schichtkuerzel-an-schicht-vorlage.md) | Schichtkürzel an der Schicht-Vorlage |
| [0003](../adr/0003-import-einstellungen-in-dexie-mit-sync.md) | Import-Einstellungen in Dexie, mit Backup und Sync |
| [0012](../adr/0012-abwesenheiten-als-vorlagen-art.md) | Abwesenheiten (z. B. Urlaub) als eigene Art von Schicht-Vorlage |
| [0013](../adr/0013-kombinierte-schichtkuerzel-ueber-zwei-tage.md) | Kombinierte Schichtkürzel über zwei Tage (Nachtdienste) |
| [0014](../adr/0014-herkunft-und-pruefhinweis-an-schichten.md) | Herkunft, Änderungsverlauf und Prüfhinweis an Schichten; erneuter Import überschreibt |

## Referenz-Beispiele

Vier Dummy-Dienstpläne mit erwarteten Werten liegen in [`docs/beispiele/dienstplaene/`](../beispiele/dienstplaene/README.md). Sie dienen als Testdaten und als Maßstab für die Erkennung.

| Variante | Format | Rolle |
|---|---|---|
| 1 | eine Zeile pro Person, Namens- und Kürzelspalte, Legende | soll funktionieren |
| 2 | wie 1, nur Kürzelspalte | soll funktionieren |
| **3** | **realistisch:** 5 Unterzeilen pro Person (D/S/B/A/E), farbige dreistellige Kürzel, Foto um 90° gedreht mit Falz | **Hauptfall** |
| 4 | wie 3, mit handschriftlichen Korrekturen und Notizen | Prüfhinweise |

## Unterstützte Planformate (V1)

- **Lage:** horizontal, die Tage sind Spalten. Vertikale Pläne folgen später.
- **Personenblock:** eine Zeile (Variante 1/2) oder mehrere Unterzeilen (Variante 3). Jede Unterzeile hat eine **Rolle**:

| Rolle | Beispiel (Variante 3) | V1 |
|---|---|---|
| Dienst | `D`: `F01`, `N01`, `////`, `-` | gelesen |
| Abwesenheit | `S`: `U` | gelesen |
| Bereitschaft | `B`: `B11` | gelesen (für Kombinationen, ADR 0013) |
| Anfang / Ende | `A`/`E`: `07:00` / `15:30` | **nicht gelesen** (vereinfacht die Erkennung) |
| ohne Bedeutung | – | ignoriert |

- **Zeitraum:** immer ein Kalendermonat. Datum = Monat + Spaltenposition.

## Ablauf und Funktionsumfang

1. **Eingabe**
   - Direkt über die Kamera oder als hochgeladene Datei (JPG, PNG, PDF).
   - **Normalisieren:** Das Bild wird über das Canvas neu gespeichert. Das korrigiert die EXIF-Drehung und entfernt Metadaten. Große Bilder werden verkleinert.
   - **Drehen:** In 90°-Schritten per Knopf. Eine automatische Erkennung der Ausrichtung (Tesseract OSD) ist optional.
   - **HEIC:** Wird konvertiert, wenn der Browser das kann, sonst mit klarem Hinweis abgelehnt.
   - **PDF:** Darstellung mit pdf.js, Seitenauswahl bei mehreren Seiten. Hat das PDF eine Textebene, werden Text und Positionen direkt gelesen.
2. **Monat und Jahr**
   - Vorschlag aus dem Kopf des Plans (Planungszeitraum „01.11.2026 - 30.11.2026“ oder Titel „Dienstplan November 2026“), sonst der nächste Monat.
   - Der Nutzer bestätigt.
3. **Bereich finden und bestätigen**
   - **Automatischer Vorschlag** (in der Simulation erfolgreich, ADR 0001, Nachtrag 2):
     - Der „Name im Dienstplan“ wird per Texterkennung im Bild gesucht, unscharf, mit Rückfall auf einen eindeutigen langen Namensteil.
     - Die Tagesspalten ergeben sich aus den erkannten Tageszahlen der Kopfzeile.
     - Die Blockgrenzen werden als Gitterlinien gesucht, mit dem Verhältnis Blockhöhe zu Spaltenbreite aus der Import-Vorlage.
   - **Viereck zur Kontrolle:** Der Vorschlag erscheint als Viereck mit vier ziehbaren Ecken und Lupe. Der Nutzer bestätigt oder korrigiert **seinen Personenblock** (alle Unterzeilen, erste bis letzte Tagesspalte). Schlägt die Suche fehl, setzt er die Ecken selbst.
   - **Entzerrung** über eine Homographie. Danach rasten die Zellgrenzen auf die tatsächlichen Gitterlinien ein, denn Unterzeilen sind im echten Plan unterschiedlich hoch.
   - **Ankerpunkte:** Vier Ecken reichen auch bei Falz und gewölbtem Papier. Zusätzliche Ankerpunkte sind **optional/später**.
4. **Import-Vorlage**
   - Beschreibt Lage, Anzahl der Unterzeilen und deren Rollen, das Verhältnis Blockhöhe zu Spaltenbreite (für die automatische Blocksuche) sowie die zuletzt gewählte Bereichslage.
   - Wird unter `importSettings.templates` gespeichert (ADR 0003). Beim ersten Import einer neuen Form legt der Nutzer die Rollen fest.
5. **Erkennung** (lokal, ADR 0001; Parameter in `scripts/poc-lokale-erkennung/README.md`)
   - **Vorverarbeitung je Zelle:** Graustufen mit Kontraststreckung, bei dunklem Hintergrund invertiert, zweifach hochskaliert. Der Rand ist links größer als rechts, weil die Schrift bis an die rechte Gitterlinie reicht. Gitterlinien am Zellrand werden entfernt statt abgeschnitten.
   - **Streifen-Erkennung:** Die Zellen einer Unterzeile werden mit Abstand nebeneinandergesetzt und in einem Aufruf erkannt (Tesseract „verstreuter Text“). Die Wörter werden per Position den Tagen zugeordnet. Verschmolzene Lesungen verfallen, dann zählt die Erkennung der Einzelzelle.
   - **Zeichenliste:** alle Zeichen der hinterlegten Schichtkürzel und `-`.
   - **Leere Zellen** werden **pro Plan** erkannt (Schwelle aus der Verteilung der Zellkontraste). Sicher leer nur klar unterhalb, sonst unsicher.
   - **Widerspruch Streifen ↔ Einzelzelle** (z. B. Text der Nachbarzelle zugeordnet) macht die Zelle unsicher.
   - **Einrasten:** Typische Lesefehler werden bereinigt (O↔0, I/l↔1, S↔B/5 am Anfang). Fehlende Nullen werden ergänzt, wenn **genau ein** bekanntes Kürzel passt („F1“ → `F01`).
   - **Muster pro Plan:** Aus sicher gelesenen Zellen desselben Fotos entstehen Muster je Kürzel, auch für „-“. Unsichere Zellen werden nur bei hoher Ähnlichkeit (≥ 0,85) **und** klarem Abstand zum zweitbesten Muster (≥ 0,10) entschieden, sonst bleiben sie unsicher und bekommen einen Vorschlag. Die Muster sollen aus der **ganzen Tabelle** gelernt werden, nicht nur aus dem eigenen Block, weil das mehr Beispiele liefert. Das passiert nur lokal, importiert wird nur die eigene Zeile.
   - **Eine gültige eigene Lesung wird nie überstimmt.**
   - **Gleiche Nachbearbeitung** für die Abwesenheitszeile. Die Bereitschaftszeile wird per Lesung „mindestens zwei Zeichen“ als beschriftet erkannt.
   - **Durchstreichungen:** Ein langer schräger Strich über der Zelle markiert die Zelle als „zu prüfen“. Die Heuristik wird in Schritt 8 umgesetzt und mit Variante 4 geprüft.
6. **Kürzel auflösen**
   - **Exakter Vergleich** mit den Schichtkürzeln der Vorlagen, **kein Abstandsabgleich** (`S04` und `S01` sind verschiedene Schichten).
   - **Reihenfolge:**
     1. Kombinationen mit Bereitschaft (`N01 + B11 + F02`)
     2. Kombinationen ohne Bereitschaft (`N01 + F02`)
     3. Einzelne Kürzel (ADR 0013)
   - **Abwesenheiten:** Kürzel aus der Abwesenheitszeile (`U`) werden ebenso über Vorlagen der Art „Abwesenheit“ aufgelöst (ADR 0012).
   - **Unvollständige Kürzel** (z. B. handschriftlich „S“, im Team der Standard-Spätdienst):
     - **Empfohlen:** „S“ als zusätzliches Schichtkürzel an der Vorlage. Dann greift der exakte Vergleich.
     - **Rückfall:** die erste Vorlage in der Reihenfolge der Vorlagenliste, deren Kürzel mit dem Text beginnt, markiert als „zu prüfen“.
   - **„Kürzel ohne Eintrag“** (z. B. `-`, `–`, `—`, die als gleich gelten) erzeugen nichts.
   - **Unbekannte Kürzel** bleiben offen. Der Nutzer ordnet sie in der Bestätigungsansicht einer Vorlage zu und kann sie dort merken („Kürzel merken“).
7. **Bestätigungsansicht**
   - Zeigt pro Tag das Ergebnis.
   - **Unsichere** und **zu prüfende** Zellen sind hervorgehoben (gelbes „?!“).
   - **Korrektur** per Tippen auf eine Vorlage.
   - **Konflikte und erneuter Import** (ADR 0014):
     - Früher importierte Schichten des Monats werden überschrieben. Entfällt ein Tag, wird die Schicht entfernt.
     - Von Hand geänderte importierte Schichten sind gekennzeichnet und lassen sich einzeln ausnehmen.
     - Selbst angelegte Schichten bleiben unangetastet. Überschneidungen werden geklärt (überschreiben, überspringen, einzeln).
8. **Speichern**
   - Über `shiftFromType()` plus Herkunftsfelder (`source: 'import'`, `importedAt`, `importId`, `updatedAt`, `lastChangeBy`).
   - Bei Handschrift, Durchstreichung oder Rückfall-Auflösung wird `review` gesetzt.
   - Danach `markLocalModified()`, der Drive-Sync läuft wie bisher.

## Handschriftliche Korrekturen

- **Erkennt der Import Handschrift oder eine Durchstreichung**, übernimmt er den Eintrag und markiert die **gespeicherte** Schicht als „zu prüfen“ (`review`, ADR 0014).
- **Anzeige:** Bestätigungsansicht, Kalender und Tagesliste zeigen ein **gelbes „?!“-Symbol**. „Geprüft“ entfernt die Markierung.
- **Ersatzlos gestrichene Dienste** (Variante 4, Kessler am 12.) werden ebenfalls übernommen und markiert. Die App löscht nichts automatisch.
- **Ersetzte Dienste** (Variante 4, Albrecht am 5., „S“): Auflösung wie bei unvollständigen Kürzeln, immer mit Markierung.
- **Notizen im Kopf** („November“, „#3“, „Feiertag“) liegen außerhalb des gewählten Bereichs und stören nicht.

## Einstellungen

- **Name im Dienstplan** (mehrere Schreibweisen) und **Kürzel ohne Eintrag**: Einstellungen → Dienstplan-Import (umgesetzt).
- **Schichtkürzel im Dienstplan** an der Schicht-Vorlage, einzeln oder als Kombination (umgesetzt für einzelne Kürzel, Kombinationen folgen).
- **Art der Vorlage** „Schicht“ oder „Abwesenheit“ (ADR 0012).
- **Import-Vorlagen** mit Unterzeilen und Rollen (siehe oben).

## Ergebnis der Simulation (18.10.2026)

Simulation mit `tesseract.js` 7 in Node, Skripte und beste Einstellung in [`scripts/poc-lokale-erkennung/`](../../scripts/poc-lokale-erkennung/README.md). Gesamtauswertung aller Beispielbilder mit einem Befehl (`auswertung.mjs`), darunter ein **echtes Handyfoto** eines Dienstplans (nur lokal, nicht im Repo). Details: ADR 0001, Nachträge 1–3.

| Szenario | D-Zeile: sicher falsch / unsicher | S-Zeile: sicher falsch / unsicher |
|---|---|---|
| Echter Plan, eigener Block, **Ecken automatisch gefunden** | **0** / 0 von 30 | **0** / 0 von 30 |
| Alle 9 Beispielbilder (Varianten 1–4 sauber und Foto, echter Plan), ganze Tabelle | **0** / 29 von 2.436 | **0** / 48 von 1.050 |
| Handschriftliche Korrekturen (Variante 4, echter Plan) | alle als unsicher markiert | |

- **Erfolgskriterium erfüllt:** keine sicher falsche Zelle, höchstens 15 % unsicher.
- **Restrisiko:** seltene Kürzel, die im ausgewerteten Bereich nur einmal vorkommen und nicht gelesen werden. Dagegen helfen die strengen Schwellen und Muster aus der ganzen Tabelle.

## Einschränkungen in V1

- Uhrzeiten aus dem Plan werden nicht gelesen. Es gelten die Zeiten der Vorlage.
- Nur horizontale Pläne und Kalendermonate.
- Ein Kürzel pro Zelle. Kombinationen höchstens über zwei Tage.
- Reine Symbolkürzel wie `////` liest Tesseract nicht. Sie erscheinen als unsicher, bis der Nutzer sie einmal zuordnet (siehe Ideen).
- **Außerhalb des Umfangs:** `////` (Kennzeichnung für einen Kollegen in einer anderen Einrichtung) und `D03` (individuelle Sondervereinbarung, Bedeutung unbekannt). Beide betreffen nur einzelne Kollegen und werden nicht unterstützt. Taucht ein solches Kürzel in der eigenen Zeile auf, behandelt der Import es wie jedes unbekannte Kürzel.

## Offene Punkte

- Keine fachlichen Punkte offen. `////` und `D03` sind geklärt (außerhalb des Umfangs, siehe oben). Das Erfolgskriterium ist festgelegt und in der Simulation erfüllt.

## Ideen

- **Nutzerzuordnung übernehmen:** Ordnet der Nutzer eine unsichere Zelle zu, übernehmen alle sehr ähnlichen Zellen desselben Plans den Vorschlag. Das nutzt die Muster aus der Erkennung.
- **Schicht-Vorlagen automatisch aus Foto anlegen:** Knopf mit Kamera-Symbol bei den Schicht-Vorlagen. Wird verlinkt, wenn man im Kalender den Foto-Import ohne vorhandene Vorlagen startet (Ideen-Backlog der Roadmap).
- **Uhrzeiten aus dem Plan als Hinweis:** Weicht die gelesene Zeit von der Vorlage ab, zeigt die Bestätigungsansicht einen Hinweis.
- **Legende erkennen** (Variante 1) und daraus Vorlagen vorschlagen.

## Umsetzungsschritte

1. ✅ **Datenmodell und Einstellungen I:** Schichtkürzel, Import-Profil, Tabelle `importSettings`, gemeinsame Backup-Funktionen, `shiftFromType`, Vitest, Referenz-Beispiele.
2. **Datenmodell II:**
   - Art der Vorlage (`kind`, ADR 0012), mit Editor und Kalenderanzeige von Abwesenheiten
   - Herkunft und Prüfhinweis an Schichten (ADR 0014), mit gelbem „?!“ und „Geprüft“
   - Zerlegung und Prüfung kombinierter Kürzel (ADR 0013) im Vorlagen-Editor
3. **Eingabe:** Kamera und Datei, Normalisierung, Drehen, HEIC-Hinweis, PDF mit Seitenauswahl.
4. **Bereich und Raster:** automatische Blocksuche (Name, Tageszahlen, Gitterlinien), Viereck mit Lupe zur Kontrolle, Entzerrung, Einrasten auf Gitterlinien, Unterzeilen und Rollen in der Import-Vorlage, Monat und Jahr.
5. **Lokale Erkennung:** Tesseract.js im Browser (selbst ausgeliefert, vom Service Worker gecacht) mit dem Verfahren aus der Simulation: Streifen-Erkennung, Einrasten, Muster pro Plan, Unsicherheit. Die Simulation dient als Regressionstest (Variante 3 als Vitest-Test, echter Plan lokal).
6. **Kürzel auflösen, Bestätigungsansicht, Speichern, erneuter Import.**
7. **PDF-Textebene** als eigener Erkennungsweg.
8. **Ergänzungen:** Erkennung von Durchstreichungen (Variante 4), Nutzerzuordnung auf ähnliche Zellen übernehmen.
9. **Doku:** README (Einrichtung), Datenschutzhinweis.
10. (Nur falls nötig) Cloud-Erkennung über Firebase AI Logic mit App Check, mit eigenem ADR (siehe ADR 0001).

## Geplante Module

```
src/import/
  imageInput.ts       Datei → normalisiertes Bild, Drehen
  pdfInput.ts         pdf.js: Seiten rendern, Textebene mit Positionen
  geometry.ts         Homographie, Entzerrung, Gitterlinien finden und Zellgrenzen einrasten
  blockFinder.ts      eigenen Block finden: Name, Tageszahlen (RANSAC), Linienverfolgung
  cellPreprocess.ts   Zellen zuschneiden, Graustufen, Invertieren, Linien entfernen, Hochskalieren, Tintenanteil
  recognizers/        gemeinsames Interface CellRecognizer
    tesseractRecognizer.ts
    pdfTextRecognizer.ts
  cellTemplates.ts    Muster pro Plan, Korrelation mit Verschiebung, Schwellen, Übernahme von Nutzerzuordnungen
  codeResolver.ts     Einrasten, exakter Vergleich, Kombinationen, Abwesenheiten, Rückfall-Präfix
  importService.ts    Konflikte, erneuter Import, Speichern mit Herkunft und Prüfhinweis
src/views/ScheduleImportView.vue
src/components/import/RegionSelector.vue, ConfirmShiftsList.vue
```
