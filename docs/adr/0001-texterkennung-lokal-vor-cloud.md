# 0001: Texterkennung beim Dienstplan-Import zuerst lokal, Cloud nur als Rückfall

- **Status:** Angenommen. Zwei Nachträge vom 18.10.2026 mit Ergebnissen der Simulation (unten).
- **Datum:** 18.10.2026
- **Feature:** [Dienstplan-Import](../prd/dienstplan-import.md)

## Kontext

Beim Dienstplan-Import müssen die Schichtkürzel der eigenen Zeile aus einem Foto oder PDF gelesen werden. Die Rahmenbedingungen:

- Die App ist eine reine PWA **ohne eigenes Backend**, und **in der App dürfen keine Geheimnisse liegen**, also keine API-Schlüssel.
- **Offline First:** Kernfunktionen sollen ohne Netz laufen.
- **Datenschutz:** Ein Dienstplan enthält Namen von Kollegen. Falls Daten das Gerät verlassen, dann nur ein Bildstreifen mit den eigenen Kürzeln, ohne Namen und ohne EXIF-Daten.
- **Zielgeräte:** Smartphones, also Safari auf iOS und Chrome auf Android.

Die Erkennung ist eingeschränkt: Die Zellen werden vorher entzerrt und einzeln ausgeschnitten, und erlaubt sind nur wenige bekannte Kürzel aus den Schicht-Vorlagen.

### Geprüfte Optionen (Recherche am 18.10.2026)

| Option | Bewertung |
|---|---|
| **Tesseract.js lokal**, pro Zelle und auf die Zeichen der Schichtkürzel beschränkt | Ohne Cloud, ohne Kosten, offline. Die Qualität bei Handyfotos ist unklar. |
| **Firebase AI Logic** (Web-SDK `firebase/ai`) mit App Check (reCAPTCHA Enterprise) | Kein eigener Server, kein Schlüssel in der App, Missbrauchsschutz und Limits pro Nutzer sind eingebaut. Braucht ein Abrechnungskonto und erweitert die Datenschutzerklärung. |
| Eigener Proxy (Cloudflare Worker, Cloud Run) mit API-Schlüssel | Freie Wahl des Anbieters, aber es ist ein Backend, und den Missbrauchsschutz müsste man selbst bauen. Verworfen. |
| Eigener API-Schlüssel des Nutzers (nur lokal gespeichert) | Keine Infrastruktur, taugt aber nur für Technikaffine. Höchstens als Entwickleroption. |
| Ephemeral Tokens der Gemini API | Nur für die Live API, und zum Erzeugen braucht man einen Server. Verworfen. |
| Drive-OAuth-Token mit Scope `cloud-platform` | Scope zu weitreichend, Abrechnung über das Projekt, Prüfung der App nötig. Verworfen. |
| Chrome Prompt API bzw. Gemini Nano (auch Hybrid-Modus von Firebase AI Logic) | Laut Firebase-Doku nur Chrome auf dem Desktop, nicht mobil. Verworfen. |
| Bildmodell im Browser (WebLLM, transformers.js) | Downloads von mehreren hundert MB bis zu GB, auf iOS unzuverlässig. Verworfen. |

### Erkenntnisse zu Firebase AI Logic und Gemini

- **Bezahlte Dienste sind Pflicht:** Laut den Gemini-API-Bedingungen dürfen API-Clients für Nutzer in EWR, Schweiz und UK nur bezahlte Dienste nutzen. Bei bezahlter Nutzung trainiert Google nicht mit den Daten. Anfragen werden nur für eine begrenzte Zeit zur Missbrauchserkennung protokolliert.
- **Gemini-API-Bedingungen** gelten nur für „berufliche Zwecke, nicht für Verbraucher“ und ab 18 Jahren.
- **Region:** Nur das **Agent Platform Gemini API** (früher Vertex AI) erlaubt eine Region. Die Gemini Developer API läuft global. Agent Platform unterliegt den Google-Cloud-Bedingungen.
- **App Check** ist für Firebase AI Logic ab dem 2.11.2026 Pflicht.
- **Nutzerlimit:** Standardmäßig 100 Anfragen pro Minute und Nutzer, das lässt sich anpassen.
- **Modelle** wechseln schnell. Stand der Recherche: `gemini-3.8-flash` bzw. `gemini-3.5-flash-lite`. Gemini 2.5 Flash wird im Oktober 2026 abgeschaltet.

## Entscheidung

1. **Zuerst ein PoC rein lokal mit Tesseract.js:** pro entzerrter Zelle, einzeilig und auf die Zeichen der hinterlegten Schichtkürzel beschränkt. Die Tesseract-Dateien liefern wir selbst aus, statt sie vom CDN zu laden, und der Service Worker cacht sie beim ersten Einsatz.
2. **Bewertung mit echten Plänen:** Danach wird der PoC mit 2–3 echten Dienstplänen getestet. Reicht die Qualität nicht, kommt als Rückfall eine Cloud-Erkennung über **Firebase AI Logic mit App Check (reCAPTCHA Enterprise)** dazu, festgehalten in einem eigenen ADR.
3. **Gemeinsames Interface:** Alle Erkennungswege implementieren `CellRecognizer`, damit sie austauschbar bleiben. Dazu gehören Tesseract, die PDF-Textebene, eine spätere Cloud-Erkennung und die manuelle Eingabe.

Für den Cloud-Fall ist schon vorgemerkt:
- **Backend:** Agent Platform mit EU-Region bevorzugen statt der Gemini Developer API, weil ein Abrechnungskonto ohnehin nötig ist. Dafür gibt es die Wahl der Region und die Google-Cloud-Bedingungen.
- **Modellname** in der Konfiguration statt im Code.
- **reCAPTCHA-Skript** erst beim Cloud-Schritt laden.
- **Nutzerlimit senken** und Budget-Warnungen setzen.

## Konsequenzen

- Ohne Cloud braucht es weder Abrechnungskonto noch App Check, reCAPTCHA oder eine Ergänzung der Datenschutzerklärung, und der Import funktioniert offline.
- Die Erkennungsqualität hängt von Fotoqualität und Entzerrung ab. Die Bestätigungsansicht mit Korrektur per Tippen ist deshalb Pflicht, nicht optional.
- Tesseract lädt beim ersten Einsatz einige MB. Deshalb wird es dynamisch geladen und vom Service Worker gecacht, nicht vorab gespeichert.
- Falls die Cloud später doch nötig wird, müssen die Punkte unter „Erkenntnisse“ vor dem Bau gegen die aktuelle Doku geprüft werden: Klassenname des Backends, EU-Regionen des Modells und ob die Bedingungen eine Verbraucherklausel enthalten.

## Nachtrag 18.10.2026: Simulation mit Referenz-Dienstplänen

**Anlass:** Mit Variante 3 (realistisches Format) war die rein lokale Erkennung fraglich. Der Plan hat farbige Zellen mit heller Schrift, dreistellige Kürzel mit Ziffern und kleine Schrift. Das Foto ist um 90° gedreht und hat einen Falz.

**Vorgehen:** Simulation in Node mit `tesseract.js` 7, also derselben Bibliothek wie später im Browser. Skript: [`scripts/poc/lokale-erkennung.mjs`](../../scripts/poc/lokale-erkennung.mjs). Nachgebildet wird der geplante Ablauf:
1. Vier Ecken des Tagesrasters setzen (von Hand, wie später durch den Nutzer)
2. Entzerren und gleichmäßig in Zellen aufteilen
3. Zelle vorverarbeiten: Graustufen, Kontraststreckung, Invertieren bei dunklem Hintergrund, zweifach hochskaliert
4. Tesseract einzeilig, mit Zeichenliste
5. Auf bekannte Kürzel einrasten (nur eindeutige Fälle)
6. Lücken per Mehrheitsentscheid ähnlicher Zellen füllen, diese als unsicher markieren

**Ergebnis** für die D-Zeile, 7 Personen × 30 Tage = 210 Zellen:

| Bild | sicher richtig | **sicher falsch** | unsicher markiert |
|---|---|---|---|
| `variante-3-sauber.png` | 200 | **0** | 10 (alle `////`) |
| `variante-3-foto.jpg` | 182 | **0** | 28 (16 davon mit richtigem Vorschlag, 10× `////`) |

S-Zeile (`U`): 100 % bzw. 90 %. B-Zeile (beschriftet ja/nein): 100 %.

**Beobachtungen:**
- Ohne Nachbearbeitung erreicht Tesseract auf dem Foto nur 65–78 %, je nach Skalierung und Binarisierung. Häufigster Fehler: fehlende Null („F1“ statt `F01`). Ein eigener harter Schwellwert verschlechtert das Ergebnis, Graustufen sind besser.
- Reine Symbolkürzel (`////`) liest Tesseract überhaupt nicht.
- Erst die Nachbearbeitung macht das Ergebnis brauchbar, also Einrasten und das Füllen von Lücken mit Unsicherheitsmarkierung. Entscheidend ist, dass **keine Zelle sicher falsch** erkannt wird.
- Vier Ecken genügen trotz Falz. Zusätzliche Ankerpunkte waren nicht nötig.

**Grenzen der Simulation:**
- Nur ein Foto, und das ist selbst generiert.
- Die Ecken habe ich sorgfältig gesetzt. Ungenauigkeit beim Nutzer kommt hinzu, die Lupe soll das abfangen.
- Variante 4 (Handschrift) ist nicht Teil der Simulation.

**Folgerung:**
- Die Entscheidung für die lokale Erkennung bleibt und ist jetzt besser begründet. Die Cloud-Erkennung bleibt Rückfall und wird vorerst nicht gebaut.
- **Erfolgskriterium** für die Umsetzung (statt „mindestens 95 % richtig“): auf `variante-3-foto.jpg` **0 sicher falsche** Zellen in der D-Zeile und **höchstens 15 % unsicher** markierte. Die Simulation erreicht 0 und 13 %.
- Die Nachbearbeitung (Einrasten, Ähnlichkeit, Unsicherheit) gehört fest zur Lösung, siehe [PRD](../prd/dienstplan-import.md).

## Nachtrag 2 (18.10.2026): Echter Dienstplan, Optimierung und automatische Blocksuche

**Anlass:** Ein echtes Handyfoto eines Dienstplans im Format von Variante 3 mit geschwärzten Namen. Es liegt nur lokal in `local/dienstplaene/` und nicht im Repo. Besonderheiten:
- Papier gewölbt, geklebte Stelle, zweites Blatt im Bild, Handschrift
- Unterzeilen unterschiedlich hoch, Schrift bis an die Gitterlinien
- Teilweise gefärbte Zellen
- Weitere Kürzel (`F03`, Bereitschaft `RB`/`RB2`) und eine leere Zelle am Feiertag

**Erster Lauf mit dem Verfahren aus Nachtrag 1:** nur 66 von 210 Zellen sicher richtig. Ursache war die gleichmäßige Rasterteilung, die Text abschnitt und Linien mitnahm.

**Verbesserungen (alle in `scripts/poc/`, Parameter in `scripts/poc/README.md`):**
1. **Zellgrenzen** auf die tatsächlichen Gitterlinien einrasten statt gleichmäßig teilen.
2. **Ränder ungleich:** links 6 %, rechts nur 2 %. Gitterlinien am Zellrand werden gezielt entfernt statt abgeschnitten.
3. **Streifen-Erkennung:** Die ganze Unterzeile wird als ein Bild mit Abständen erkannt (Tesseract „verstreuter Text“), die Wörter werden per Position den Tagen zugeordnet. Verschmolzene Lesungen werden verworfen.
4. **Muster pro Plan:** Aus sicher gelesenen Zellen desselben Fotos entstehen Muster je Kürzel, auch für „-“. Unsichere Zellen werden per Korrelation mit Verschiebungstoleranz nur entschieden, wenn die Ähnlichkeit ≥ 0,85 ist und der Abstand zum zweitbesten Muster ≥ 0,10.
5. **Dieselbe Nachbearbeitung für die S-Zeile** (Abwesenheiten).
6. **Gefährliche Regel entfernt:** „erste drei Zeichen einrasten“ erzeugte sicher falsche Werte.
7. **Verworfen:** eine Vorverarbeitung über die Abweichung vom lokalen Hintergrund (schlechter) und größere Skalierung (kein Gewinn).

**Automatische Blocksuche** (`finde-zeile.mjs`), auf Wunsch der Fachseite:
1. Texterkennung über das ganze Bild, unscharfer Abgleich mit „Name im Dienstplan“. Rückfall: ein eindeutiger, langer Namensteil.
2. Spalten per Ausgleichsgerade durch die erkannten Tageszahlen der Kopfzeile, robust gegen Fehltreffer.
3. Senkrechte Ränder per Linienverfolgung. Oberkante als stärkste Gitterlinie über dem Namen. Unterkante nahe der erwarteten Blockhöhe; das Verhältnis Blockhöhe zu Spaltenbreite ist je Planformat fest und gehört in die Import-Vorlage.

Die Ecken weichen um 1–3 px von sorgfältig manuell gesetzten ab. Gefunden wurden alle 7 Personen in Variante 3 und die eigene Zeile im echten Plan.

**Ergebnis mit der besten Einstellung** (`////` und `D03` nicht bewertet, siehe PRD):

| Szenario | D-Zeile sicher richtig | **sicher falsch** | unsicher | S-Zeile sicher richtig | **sicher falsch** | unsicher |
|---|---|---|---|---|---|---|
| Echter Plan, ganze Tabelle (manuelle Ecken) | 190 / 200 (Schwelle 0,75) | **0** | 10 | 202 / 210 | **0** | 8 |
| Echter Plan, eigener Block, **Ecken automatisch** | 30 / 30 | **0** | 0 | 30 / 30 | **0** | 0 |
| Variante 3 Foto, ganze Tabelle | 198 / 199 | **0** | 1 | 210 / 210 | **0** | 0 |
| Alle Szenarien zusammen (inkl. 7 Einzelblöcke Variante 3 mit automatischen Ecken), Schwelle 0,85/0,10 | 607 / 628 | **0** | 21 (3,3 %) | 632 / 660 | **0** | 28 (4,2 %) |

**Erkenntnisse:**
- **Erfolgskriterium aus Nachtrag 1 erfüllt:** 0 sicher falsche Zellen, höchstens 15 % unsicher.
- **Seltene Kürzel sind das Restrisiko.** Kommt ein Kürzel im ausgewerteten Bereich nur einmal vor und wird nicht gelesen, fehlt ein Muster. Ohne strenge Schwelle ordnet der Mustervergleich die Zelle dann dem ähnlichsten anderen Kürzel zu. Mit 0,75/0,08 trat das im Einzelblock-Betrieb zweimal auf (`F04` → `S04`, `N06` → `N01`), mit 0,85/0,10 nicht mehr.
- **Muster aus der ganzen Tabelle** wären robuster als aus dem eigenen Block, weil es mehr Beispiele gibt. Das bleibt lokal und datenschutzrechtlich unkritisch, denn importiert wird weiterhin nur die eigene Zeile.

**Folgerung:** Die lokale Erkennung ist auch für ein echtes Foto tragfähig. Die Cloud-Erkennung wird nicht weiterverfolgt. Die Verfahren aus diesem Nachtrag sind Teil der Umsetzung (PRD, Schritte 4 und 5).

## Quellen

- [Firebase AI Logic – Get started (Web)](https://firebase.google.com/docs/ai-logic/get-started?platform=web)
- [Firebase AI Logic – Models](https://firebase.google.com/docs/ai-logic/models)
- [Firebase AI Logic – Locations](https://firebase.google.com/docs/ai-logic/locations)
- [Firebase AI Logic – Pricing](https://firebase.google.com/docs/ai-logic/pricing)
- [Firebase AI Logic – Quotas](https://firebase.google.com/docs/ai-logic/quotas)
- [Firebase AI Logic – App Check](https://firebase.google.com/docs/ai-logic/app-check)
- [Firebase AI Logic – Hybrid on-device (Web)](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference?platform=web)
- [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms)
- [Gemini API Ephemeral Tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
