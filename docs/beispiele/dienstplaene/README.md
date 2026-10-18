# Referenz-Dienstpläne

Generierte Dummy-Dienstpläne **ohne echte Namen** in einem gängigen Format. Sie dienen als Referenz für den [Dienstplan-Import](../../prd/dienstplan-import.md) und als Testdaten.

| Datei | Inhalt |
|---|---|
| `variante-1-sauber.png` | Variante 1 als sauberes Bild, gerade und gleichmäßig ausgeleuchtet (2000 × 849 px) |
| `variante-1-foto.jpg` | Derselbe Plan abfotografiert: perspektivisch verzerrt, leicht gedreht, ungleichmäßige Ausleuchtung und Unschärfe (2000 × 986 px) |
| `variante-1.erwartet.json` | Erwartete Werte: Monat, Legende und alle Zeilen mit Namen, Kürzel und Code pro Tag |
| `variante-2-sauber.png` | Variante 2: wie Variante 1, aber **ohne Namensspalte**, das Kürzel ist die erste Spalte |
| `variante-2-foto.jpg` | Variante 2 als **synthetisches** Foto: Perspektive, Hintergrund, Ausleuchtung, Rauschen und Unschärfe sind künstlich erzeugt |
| `variante-2.erwartet.json` | Erwartete Werte für Variante 2, wie Variante 1 ohne Namen |
| `erzeugung/variante-2.py` | Skript, das Variante 2 aus Variante 1 erzeugt (Pillow, NumPy, fester Zufalls-Seed) |
| `variante-3-sauber.png` | **Variante 3 (Hauptfall):** realistisches Format mit 5 Unterzeilen je Person, farbigen Kürzeln und Uhrzeiten (2938 × 1586 px) |
| `variante-3-foto.jpg` | Variante 3 abfotografiert: um 90° gedreht, mit Falz in der Mitte, gemusterter Hintergrund, ohne Handschrift (1125 × 1869 px) |
| `variante-3.erwartet.json` | Erwartete Werte für Variante 3: alle Unterzeilen (D/S/B/A/E) je Person und Tag sowie Summen |
| `variante-4-sauber.png` | **Variante 4:** Variante 3 mit **zwei handschriftlichen Korrekturen** (2938 × 1586 px) |
| `variante-4-foto.jpg` | Variante 4 abfotografiert, zusätzlich mit handschriftlichen Notizen im Kopf (1125 × 1869 px) |
| `variante-4.erwartet.json` | Verweist für die gedruckten Werte auf Variante 3 (`basis`) und listet die handschriftlichen Einträge je Bild |
| `variante-5-sauber.png` | **Variante 5:** Variante 3 mit den Eigenheiten eines echten Plans: Unterzeilen unterschiedlich hoch, Schrift bis an die Gitterlinie, Teilfüllung (`M01`), leere Zelle, `RB`/`RB2` |
| `variante-5-foto.jpg` | Variante 5 als **synthetisches** Foto: gewölbtes Papier, Perspektive, Licht, Klebestreifen, zweites Blatt, Unschärfe, um 90° gedreht |
| `variante-5.erwartet.json` | Erwartete Werte für Variante 5 (vollständig) und die Änderungen gegenüber Variante 3 (`aenderungen`) |
| `variante-5-foto-querformat.jpg` | **Echtes Foto** eines Ausdrucks von Variante 5 im Querformat: leicht schräg von oben, Schatten (2000 × 1125 px) |
| `variante-5-foto-kopfueber.jpg` | Echtes Foto, um 180° gedreht (Blatt auf dem Kopf), deutlich perspektivisch verzerrt |
| `variante-5-dokumentmodus-farbe.jpg` | Dokumentenmodus der Android-Kamera, Farbe (zugeschnitten und entzerrt) |
| `variante-5-dokumentmodus-sw.jpg` | Dokumentenmodus mit Schwarz-Weiß-Filter: keine Farben, harte Kontraste |
| `variante-5-foto-hochformat.jpg` | Echtes Foto im Hochformat (Plan um 90° gedreht), Blatt stark gewölbt: Zeilen und Spalten sind gebogen |
| `variante-5-fotos.erwartet.json` | Ecken und Drehung der fünf echten Fotos; Werte über `basis` aus Variante 5 |
| `erzeugung/variante-5.py` | Skript, das Variante 5 aus Variante 3 erzeugt, inkl. erwarteter Werte und Ecken (Pillow, NumPy, fester Zufalls-Seed) |

Geladen werden die erwarteten Werte in Tests über `loadReferenceRoster('variante-1')` aus `src/testing/referenceRosters.ts`.

## Merkmale von Variante 1 (November 2026, Station 3B)

- **Lage:** horizontal, eine Zeile pro Person, 12 Personen, 30 Tagesspalten.
- **Personen:** Zwei Spalten, „Mitarbeiter/in“ im Format „Nachname, Vorname“ und „Kz.“ mit zwei Buchstaben, z. B. „AB“.
- **Kopf:** zwei Zeilen, Tageszahl (1–30) und Wochentag (So, Mo, …). Der Titel „Dienstplan November 2026“ enthält Monat und Jahr.
- **Codes:**
  - Schichten mit einem Buchstaben: `F`, `S`, `N`, `T`
  - Schichten mit zwei Buchstaben: `FB`
  - Kein Eintrag: `U` (Urlaub) und `–` (frei, ein Gedankenstrich, kein Bindestrich)
- **Schrift:** `N` ist fett, `U` kursiv, Wochenendspalten sind grau hinterlegt.
- **Legende** unter der Tabelle mit Uhrzeiten, z. B. „N = Nacht 21:15–06:15“, also über Mitternacht.

## Variante 2 (ohne Namensspalte)

- **Inhalt:** Dieselben Schichten wie Variante 1. Die Person steht nur über ihr Kürzel in der ersten Spalte „Kz.“.
- **Nicht unterstützt:** Pläne ohne Namen sind außerhalb des Umfangs (siehe [PRD](../../prd/dienstplan-import.md), Einschränkungen). Die automatische Blocksuche wird für Variante 2 nicht geprüft. Die Erkennung mit von Hand gesetzten Ecken bleibt im Regressionstest.
- **Herkunft der Bilder:** Beide Bilder sind per Skript abgeleitet, nicht abfotografiert.
  - **Saubere Version:** Die Namensspalte wurde pixelgenau entfernt.
  - **Foto:** Die Aufnahmeeffekte sind synthetisch. Für realistischere Testfotos die saubere PNG ausdrucken und mit dem Handy abfotografieren; die erwarteten Werte bleiben dann gültig.

## Variante 3 (Hauptfall, realistisches Format)

Erfundene Namen, aber Format und Darstellung wie ein echter Dienstplan eines Sozialwerks (7 Personen, November 2026).

- **Kopf:** „Dienstplan“, Planbereich „SoWo BW Lindenhaus“, Planungszeitraum „01.11.2026 - 30.11.2026“, Planstatus „Vorplan“, Träger und Kostenstelle. Kein Monatsname.
- **Personen:** Spalte „Name (Vorname)“, zweizeilig („Brandner“ / „Tobias“), **keine Kürzelspalte**.
- **Fünf Unterzeilen je Person**, beschriftet in einer eigenen Spalte:
  - `D` – Dienst (Kürzel)
  - `S` – Sonder/Abwesenheit (`U` = Urlaub)
  - `B` – Bereitschaft (`B11`)
  - `A` – Anfang (Uhrzeit)
  - `E` – Ende (Uhrzeit)
- **Kopfzeile der Tage:** Wochentag über Tageszahl („So“ / „01“). Wochenenden sind grün hinterlegt.
- **Rechts der Tage** folgen Summenspalten: „Ist+Gut“, „Soll“, zwei leere Spalten, „Übertr. / Sch-Zul.“.
- **Kürzel:**
  - Dreistellig mit Ziffern: `F01`, `F02`, `F04`, `M01`, `M05`, `S04`, `N01`, `N06`, `N08`, `D03`
  - Nur aus Symbolen: `////`
  - Frei: `-`
  - Keine Legende auf dem Plan. Die Zeiten je Kürzel sind im Beispiel konstant (siehe Test).
- **Farbige Zellen,** teils weiße Schrift auf dunklem Grund: N01 dunkelblau, S04/M01 blau, F04 hellblau, N06/D03 rot, F02 und `////` gelb.
- **Nachtdienste über zwei Tage:**
  - Tag 1: `N01` 17:30–23:57 mit `B11` in der Bereitschaftszeile
  - Tag 2: `F02` 05:57–07:15
  - Die Zeiten 23:57 und 05:57 vermeiden Mitternacht.
- **Abwesenheit** steht als `U` in der S-Zeile, die D-Zeile zeigt dann `-`.
- **Foto:**
  - Querformat-Plan im Hochformat fotografiert, also um 90° gedreht.
  - Senkrechter Falz zwischen dem 13. und 14., das Papier ist nicht eben.
  - Ein Tag ist nur etwa 33 px breit, die Uhrzeiten sind rund 6 px hoch.

## Variante 4 (Handschrift)

Derselbe Plan wie Variante 3 mit handschriftlichen Änderungen. Die gedruckten Werte sind identisch, per Bildvergleich geprüft: Nur die beiden korrigierten Zellen weichen ab.

- **Korrektur ohne Ersatz:** Kessler, Mira, am 12.: `M05` und die Zeiten 10:00/18:00 sind durchgestrichen. Der Dienst entfällt.
- **Korrektur mit Ersatz:** Albrecht, Jonas, am 5.: `M05` und die Zeiten sind durchgestrichen, in der S-Zeile darunter steht von Hand „S“. Im Team steht „S“ für den Standard-Spätdienst, hier `S04`. Der Import soll ihn über ein zusätzliches Kürzel `S` an der Vorlage oder per Rückfall auf die erste `S…`-Vorlage auflösen und als „zu prüfen“ markieren (siehe PRD).
- **Nur im Foto:** Notizen im Kopf, „November“, „Gruppe A“ (unsicher gelesen), „Feiertag“ und „#3“.

`variante-4.erwartet.json` hält nur fest, was auf den Bildern steht, und ordnet jeden Eintrag den Bildern zu, auf denen er vorkommt. Wie der Import Korrekturen behandelt, ist offen (siehe PRD).

## Variante 5 (Eigenheiten eines echten Fotos)

Erfundene Namen und Werte aus Variante 3, aber mit genau den Merkmalen, an denen die Erkennung beim echten Dienstplan-Foto (nur lokal, nicht im Repo) zunächst gescheitert ist. Sie dient als **öffentlicher Ersatz für den echten Plan** im automatischen Regressionstest.

- **Unterzeilen unterschiedlich hoch:** Die Dienstzeile ist höher (38/32/32/33/35 statt 5 × 34 px).
- **Schrift bis an die rechte Gitterlinie:** Der Inhalt der Dienstzeile ist links verankert in die Breite gezogen.
- **Teilfüllung:** Die Farbfläche von `M01` füllt nur die oberen ~60 % der Zelle, die Schrift ist dunkel.
- **Leere Zelle statt „-“** (Kessler, 17.) und **weitere Bereitschaftskürzel** `RB`, `RB2` (Kessler, 28./29.).
- **Foto:** gewölbtes Papier, Perspektive, ungleichmäßiges Licht, Klebestreifen, zweites Blatt am unteren Rand, Unschärfe, um 90° gedreht.

**Nachweis als Wächter:** Das Erkennungsverfahren vor der Optimierung (ADR 0001, Nachtrag 1) liefert auf dem Foto von Variante 5 **10 sicher falsche Zellen**, auf dem Foto von Variante 3 keine. Das aktuelle Verfahren besteht beide.

## Dateinamen

`variante-<n>-sauber.png` (Original bzw. Druckvorlage), `variante-<n>-foto.jpg` (abfotografiert bzw. synthetisch), `variante-<n>.erwartet.json` (erwartete Werte und Ecken je Bild unter `auswertung`), `erzeugung/variante-<n>.py` (Skript, falls die Variante abgeleitet ist).

## Neue Varianten hinzufügen

1. Bild bzw. Bilder nach dem Schema oben ablegen. Nur generierte oder vollständig anonymisierte Pläne verwenden und Metadaten entfernen.
2. `variante-<n>.erwartet.json` im selben Format anlegen. Unterscheidet sich eine Variante nur in der Abbildung eines bestehenden Plans, verweist sie über `basis` auf dessen Werte.
3. Die Ecken des Tagesrasters je Bild unter `auswertung` eintragen (bei gedrehten Fotos `"drehung"` in Grad im Uhrzeigersinn: 90, 180 oder 270; die Ecken gelten für das gedrehte Bild), damit `scripts/poc-local-recognition/evaluate.mjs` das Bild mit auswertet.
4. Die Variante in `src/testing/referenceRosters.test.ts` in die Liste bei `describe.each` aufnehmen.
5. KI-generierte Bilder sind möglich, aber Bildgeneratoren verändern in Tabellen gern einzelne Zeichen. Die erwarteten Werte daher immer am erzeugten Bild prüfen, nicht an der Vorlage.
