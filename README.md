# ShiftHappens

Eine mobile Progressive Web App (PWA) zur Verwaltung von persönlichen Dienst- und Schichtplänen.

## Tech-Stack
- **Framework:** [Vue.js 3](https://vuejs.org/)
- **UI-Bibliothek:** [Ionic Framework (Vue)](https://ionicframework.com/docs/vue/overview)
- **Build-Tool:** [Vite](https://vitejs.dev/)
- **PWA:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- **Datenbank:** [Dexie.js](https://dexie.org/) (IndexedDB für Offline-Support)

## Features
- Komfortable Eingabe von Schichtplänen.
- Offline-Modus (PWA).
- Mobile-first Design.

## Dokumentation
- [Changelog](docs/changelog.md)
- [Roadmap](docs/roadmap.md)
- [Guidelines](docs/guidelines.md)

## Entwicklung
1. Abhängigkeiten installieren: `npm install`
2. Entwicklungs-Server starten: `npm run dev`
3. Produktions-Build erstellen: `npm run build`

## Deployment (GitHub Pages)

Das Deployment erfolgt automatisch per GitHub Actions (`.github/workflows/deploy.yml`) bei jedem Push auf den `main`-Branch. Die App wird anschließend unter `https://joschi127.github.io/shifthappens/` bereitgestellt.

### Einmalige manuelle Aktivierung
1. Projekt zu GitHub pushen (z. B. `git push -u origin main`).
2. Im GitHub-Repo unter **Settings → Actions → General** sicherstellen, dass **Workflow permissions** auf *Read and write permissions* steht (nötig, damit der Workflow den `gh-pages`-Branch schreiben darf).
3. Push auslösen (oder unter **Actions** den Workflow *Deploy to GitHub Pages* manuell starten). Beim ersten erfolgreichen Lauf legt der Workflow automatisch den `gh-pages`-Branch an.
4. Unter **Settings → Pages**:
   - **Source:** *Deploy from a branch*
   - **Branch:** `gh-pages` / `(root)` auswählen und speichern.
5. Nach 1–2 Minuten ist die App unter `https://joschi127.github.io/shifthappens/` erreichbar.

> Hinweis: Der Base-Pfad ist in `vite.config.ts` auf `/shifthappens/` gesetzt. Wird das Repository umbenannt, muss dieser Wert entsprechend angepasst werden.

## Konfiguration (Google Drive Sync)

Für die Google-Drive-Synchronisation wird eine OAuth-Client-ID benötigt.

**Konzept der Umgebungsvariablen:**
- Die Datei `.env` wird **mit ins Git eingecheckt** und enthält ausschließlich nicht-geheime Standard-/Platzhalterwerte (keine Secrets, keine Client-IDs).
- Geheime bzw. lokale Werte (z. B. die konkrete Client-ID) gehören in die Datei `.env.local`, die über `.gitignore` **nicht** eingecheckt wird.

Lege dazu lokal eine Datei `.env.local` mit folgendem Inhalt an:

```
VITE_GOOGLE_CLIENT_ID=deine-client-id.apps.googleusercontent.com
```

Die zugehörige `client_secret_*.json` sowie der Ordner `backup_files/` werden über `.gitignore` bewusst **nicht** eingecheckt.

### Client-ID für das GitHub-Pages-Deployment

Vite bäckt `VITE_GOOGLE_CLIENT_ID` **zur Build-Zeit** in die App ein. Da `.env.local` nicht eingecheckt wird und `.env` keinen Wert enthält, muss die Client-ID dem GitHub-Actions-Build separat bereitgestellt werden – sonst hat die deployte App eine leere Client-ID und die Google-Drive-Synchronisation funktioniert online nicht.

Die OAuth-Client-ID ist kein Geheimnis, daher genügt eine **Repository-Variable** (kein Secret nötig):
1. Im GitHub-Repo unter **Settings → Secrets and variables → Actions → Tab "Variables"** auf **New repository variable** klicken.
2. **Name:** `VITE_GOOGLE_CLIENT_ID`, **Value:** die konkrete Client-ID (`...apps.googleusercontent.com`).
3. Speichern. Der Workflow liest den Wert über `${{ vars.VITE_GOOGLE_CLIENT_ID }}` und setzt ihn beim Build.

> Hinweis: In der Google Cloud Console müssen für den OAuth-Client zusätzlich die autorisierten JavaScript-Ursprünge bzw. Redirect-URIs um `https://joschi127.github.io` ergänzt werden, damit der Login von der GitHub-Pages-Domain aus funktioniert.
