# PoC: lokale Erkennung von Dienstplänen

Simulationsskripte für den [Dienstplan-Import](../../docs/prd/dienstplan-import.md). Sie bilden den geplanten Ablauf in Node nach, mit derselben Bibliothek wie später im Browser (`tesseract.js`). Sie sind **kein Produktivcode**, sondern Vorlage für `src/import/`. Ergebnisse und Einordnung: [ADR 0001](../../docs/adr/0001-texterkennung-lokal-vor-cloud.md).

## Vorbereitung

Die Abhängigkeiten werden nur temporär installiert und landen nicht in der `package.json`. Die Sprachdaten, die `tesseract.js` dabei im Projektverzeichnis ablegt (`*.traineddata`), sind in `.gitignore` ausgeschlossen.

```sh
npm install --no-save tesseract.js pngjs jpeg-js
```

## `auswertung.mjs`: alle Beispiele auf einmal (Regressionsprüfung)

```sh
node scripts/poc-lokale-erkennung/auswertung.mjs [ausgabeordner]
```

- **Was ausgewertet wird:** alle `*.erwartet.json` in `docs/beispiele/dienstplaene/` und, falls vorhanden, in `local/dienstplaene/`, und zwar für jedes Bild mit hinterlegten Ecken (`auswertung` in der JSON-Datei).
- **Einstellung:** die beste Einstellung (siehe unten).
- **Ausgabe:** eine Tabelle mit „sicher richtig / sicher falsch / unsicher“ je Bild und Zeile. Bei Bildern mit handschriftlichen Korrekturen steht dazu, ob die Zelle als unsicher markiert wurde. Ausgegeben werden nur Kennzahlen, keine Namen.
- **Laufzeit:** etwa 2–3 Minuten für alle Bilder.

## `finde-zeile.mjs`: eigenen Block finden

```sh
BLOCK_RATIO=2.66 node scripts/poc-lokale-erkennung/finde-zeile.mjs <bild> <profil.json> [rotate90] > ecken.json
```

- **Profil:** `profil.json` enthält `{"rosterNames": ["Nachname, Vorname"]}`, wie „Name im Dienstplan“.
- **`BLOCK_RATIO`:** Blockhöhe ÷ Spaltenbreite des Planformats (Variante 3: 2,66; echter Plan: 3,15). In der App kommt der Wert aus der Import-Vorlage und wird beim ersten Import gelernt.
- **Ablauf:**
  1. Texterkennung über das ganze Bild
  2. Unscharfer Namensabgleich, Rückfall auf einen eindeutigen langen Namensteil
  3. Tagesspalten per RANSAC-Gerade durch die erkannten Tageszahlen
  4. Senkrechte Ränder per Linienverfolgung
  5. Oberkante als stärkste Gitterlinie über dem Namen, Unterkante nahe der erwarteten Blockhöhe

## `lokale-erkennung.mjs`: Zellen erkennen und mit erwarteten Werten vergleichen

```sh
TEMPLATES=1 T_MIN=0.85 T_MARGIN=0.10 SNAP=1 MODE=gray SCALE=2 PLANINK=1 \
INSET_L=0.06 INSET_R=0.02 INSET_Y=0.1 LINEFIX=1 ROWOCR=1 ROWPSM=sparse GAP=60 \
IGNORE='////,D03' ERWARTET=<erwartet.json> [PERSON=<index>] \
node scripts/poc-lokale-erkennung/lokale-erkennung.mjs <bild> '<ecken>' <ausgabeordner> [rotate90]
```

Mit `PERSON` wird nur ein Personenblock ausgewertet, die Ecken sind dann die des Blocks. Ohne `PERSON` wird die ganze Tabelle mit 35 Unterzeilen ausgewertet.

| Parameter | Bedeutung (beste Einstellung fett) |
|---|---|
| `SNAP=1` | Zellgrenzen auf die tatsächlichen Gitterlinien einrasten (**an**) |
| `MODE` | Vorverarbeitung: `bin` (Schwellwert), **`gray`** (Kontraststreckung, Invertieren bei dunklem Hintergrund), `absdiff` (verworfen) |
| `SCALE` | Hochskalierung der Zelle (**2**) |
| `INSET_L/R/Y` | Ränder links/rechts/oben-unten als Anteil der Zelle (**0,06 / 0,02 / 0,1**). Rechts klein, weil die Schrift bis an die Gitterlinie reicht. |
| `LINEFIX=1` | Senkrechte Gitterlinien am Zellrand entfernen (**an**) |
| `ROWOCR=1`, `ROWPSM=sparse`, `GAP=60` | Ganze Unterzeile als Streifen erkennen, Wörter per Position den Tagen zuordnen, verschmolzene Lesungen verwerfen (**an**) |
| `TEMPLATES=1`, `T_MIN`, `T_MARGIN` | Muster pro Plan aus sicher gelesenen Zellen (inkl. „-“). Unsichere Zellen werden nur bei Ähnlichkeit ≥ `T_MIN` und Abstand ≥ `T_MARGIN` zum zweitbesten Muster entschieden (**0,85 / 0,10**). |
| `PLANINK=1` | Leer oder beschriftet **pro Plan** entscheiden: Schwelle aus der Verteilung der Zellkontraste (Otsu). Sicher leer nur klar unterhalb, im Zwischenbereich unsicher. „-“ nur sicher, wenn die Zelle nicht deutlich mehr Tinte hat als typische Strich-Zellen. (**an**) |
| (immer aktiv) | Widersprechen sich Streifen- und Einzelzellen-Lesung (z. B. Streifen ordnet Text der Nachbarzelle zu), wird die Zelle unsicher. |
| `IGNORE` | Kürzel, die nicht bewertet werden, weil sie nicht zum Umfang gehören (`////`, `D03`) |

## Testdaten

- **Öffentlich:** `docs/beispiele/dienstplaene/`. Die Ecken der ganzen Tabelle stehen je Bild in der `*.erwartet.json` (`auswertung`).
- **Privat:** `local/dienstplaene/` (echter Dienstplan, nicht im Repo, siehe `docs/guidelines.md`).
