# 0009: Hosting auf GitHub Pages und Konfiguration über Umgebungsvariablen

- **Status:** Angenommen. Nachträglich dokumentiert, Entscheidung bereits umgesetzt.
- **Datum der Entscheidung:** 04.08.2026 (Einrichtung des GitHub-Pages-Deployments)

## Kontext

Die App ist eine rein statische PWA (siehe [ADR 0004](0004-tech-stack-vue-ionic-vite-pwa.md) und [ADR 0005](0005-offline-first-ohne-backend.md)) und braucht nur statisches Hosting mit HTTPS. Für Google Drive ist eine OAuth-Client-ID nötig. Sie ist kein Geheimnis, unterscheidet sich aber je nach Umgebung.

## Entscheidung

- **Hosting auf GitHub Pages** als Project Site unter `/shifthappens/`, daher `base: '/shifthappens/'` in `vite.config.ts`.
- **Deployment** über GitHub Actions mit dem offiziellen Pages-Deployment (`configure-pages`, `upload-pages-artifact`, `deploy-pages` mit OIDC) bei jedem Push auf `main`. `404.html` ist eine Kopie von `index.html` und dient als Fallback für das Routing der Single-Page-App.
- **Konfiguration über `VITE_*`-Variablen,** die Vite zur Build-Zeit einbackt:
  - **`.env`** wird eingecheckt und enthält nur Werte, die nicht geheim sind (Standard- oder Platzhalterwerte).
  - **`.env.local`** für lokale bzw. umgebungsspezifische Werte wie die Google-Client-ID. Sie steht in `.gitignore`.
  - **Im CI-Build** kommen solche Werte aus Repository-Variablen (`vars.*`), echte Geheimnisse aus Secrets (`secrets.*`).

## Konsequenzen

- Kostenloses Hosting mit HTTPS und automatischem Deployment.
- **Jeder Push auf `main` geht live,** es gibt keine Staging-Umgebung. Änderungen sollten vor dem Push lokal geprüft werden (`npm test`, `npm run build`).
- **Was in den Build eingebacken wird, ist öffentlich.** Geheimnisse dürfen daher grundsätzlich nicht in die App, auch nicht über Secrets im Build. Dienste mit Schlüssel brauchen Verfahren ohne Geheimnis in der App (siehe [ADR 0001](0001-texterkennung-lokal-vor-cloud.md)).
- **Der Base-Pfad ist an den Repository-Namen gebunden.** Eine Umbenennung (siehe Ideen-Backlog in der Roadmap) erfordert Anpassungen.
