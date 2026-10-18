# 0015: Open-Source-Lizenzen beim Build erzeugen und in der App anzeigen

- **Status:** Angenommen
- **Datum:** 18.10.2026
- **Bezug:** [ADR 0004](0004-tech-stack-vue-ionic-vite-pwa.md) (Tech-Stack), [ADR 0009](0009-hosting-github-pages-und-konfiguration.md) (Hosting), [ADR 0001](0001-texterkennung-lokal-vor-cloud.md) (Texterkennung)

## Kontext

Die App liefert fremden Code direkt an die Nutzer aus: das App-Bundle (Vue, Ionic, Dexie, …), die Laufzeit des Service Workers (Workbox) sowie für den Dienstplan-Import den Worker und den WebAssembly-Kern von tesseract.js und die Sprachdaten von Tesseract. Die Lizenzen dieser Bibliotheken (MIT, BSD, ISC, Apache-2.0) erlauben das, verlangen aber, dass Copyright-Hinweise und Lizenztexte mitgeliefert werden. Apache-2.0 verlangt zusätzlich, vorhandene NOTICE-Dateien weiterzugeben.

Beim Build entfernt Vite die Lizenzkommentare weitgehend. Eine von Hand gepflegte Liste veraltet bei jedem Update der Abhängigkeiten.

## Entscheidung

- **Erzeugen beim Build:** Ein eigenes Vite-Plugin (`scripts/third-party-licenses.mjs`) erzeugt beim Build `licenses.json`. Die Datei enthält Name, Version, Lizenz, Autor, Projektseite und den Text aller `LICENSE*`/`NOTICE*`/`COPYING*`-Dateien jedes Pakets.
- **Welche Pakete:**
  - Grundlage ist der **Modulgraph des Builds**, also genau die Pakete, die im App-Bundle landen.
  - Ergänzt werden ausgelieferte Dateien außerhalb des Bundles: tesseract.js, tesseract.js-core, die im vorgebauten Worker enthaltenen Pakete und die Workbox-Pakete des Service Workers.
  - Dazu kommen Inhalte ohne installiertes Paket: die Tesseract-Sprachdaten (Apache-2.0, Text aus tesseract.js-core), Leptonica sowie `buffer`, `base64-js` und `ieee754` im Worker.
  - Entwicklungswerkzeuge (Vite, Vitest, …) werden nicht ausgeliefert und stehen daher nicht in der Liste.
- **Fehlender Lizenztext:** Liegt einem Paket kein Lizenztext bei (z. B. `@ionic/vue`), wird der Standardtext der angegebenen Lizenz angezeigt. Dazu kommt ein Hinweis, dass der Rechteinhaber auf der Projektseite steht.
- **Im Entwicklungsserver** liefert das Plugin dieselbe Datei aus, ermittelt die Pakete aber näherungsweise über die Laufzeit-Abhängigkeiten aus `package.json`.
- **Anzeige:** Einstellungen → „Über die App“ → „Open-Source-Lizenzen“ (`/licenses`). Die Seite zeigt eine aufklappbare Liste mit den Lizenztexten. `licenses.json` wird vom Service Worker vorab geladen und ist damit offline verfügbar (ca. 70 KB, gzip ca. 7 KB).
- **Keine zusätzliche Abhängigkeit:** Fertige Plugins (z. B. `rollup-plugin-license`) erfassen die Dateien außerhalb des Bundles nicht. Das Plugin selbst ist klein und wird mit `npm test` geprüft.

## Konsequenzen

- Nach einem Update der Abhängigkeiten ist die Liste ohne Handarbeit aktuell.
- Wird **neuer fremder Inhalt außerhalb des Bundles** ausgeliefert (weitere Sprachdaten, Schriften, Dateien in `public/`), muss er in `EXTRA_PACKAGES` bzw. `EXTRA_ENTRIES` des Plugins ergänzt werden.
- Die Einträge für Leptonica, `buffer`, `base64-js` und `ieee754` sind von Hand gepflegt, weil diese Pakete nicht installiert sind. Leptonica wurde aus der Projektbeschreibung übernommen. Ob tesseract.js-core weitere Bibliotheken mit eigener Hinweispflicht einbindet, ist noch zu prüfen.
- Die App selbst hat noch keine eigene Lizenzdatei (`package.json`: ISC). Das ist eine eigene Entscheidung und gehört nicht zu diesem ADR.
