# 0001: Texterkennung beim Dienstplan-Import zuerst lokal, Cloud nur als Rückfall

- **Status:** Angenommen
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
