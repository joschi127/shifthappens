# 0005: Offline First – alle Daten lokal in IndexedDB, kein Backend

- **Status:** Angenommen. Nachträglich dokumentiert, Entscheidung bereits umgesetzt.
- **Datum der Entscheidung:** 24.04.2026 (Initial Commit)

## Kontext

Schichtpläne werden oft unterwegs oder bei schlechtem Empfang angesehen, z. B. im Keller einer Einrichtung oder im Nachtdienst. Die Daten sind persönlich. Ein eigener Server würde Betrieb, Kosten, Authentifizierung und Datenschutzpflichten mit sich bringen.

## Entscheidung

- **Alle Daten liegen nur lokal im Browser** in IndexedDB, über **Dexie.js**. Das Datenmodell ist zentral in `src/db/index.ts` definiert und wird über Dexie-Schemaversionen weiterentwickelt.
- **Kein eigenes Backend.** Sicherung und Abgleich zwischen Geräten laufen über Backup-Dateien und Google Drive (siehe [ADR 0008](0008-sync-ueber-google-drive-appdata.md)).
- **Kleine Geräteeinstellungen** wie Dark Mode und Drive-Verbindungsstatus liegen in `localStorage` und werden nicht synchronisiert. Synchronisierte Einstellungen gehören in Dexie (siehe [ADR 0003](0003-import-einstellungen-in-dexie-mit-sync.md)).
- **Reaktive Ansichten** nutzen `liveQuery` von Dexie.

## Konsequenzen

- Alle Kernfunktionen laufen ohne Netz, und es entstehen keine Betriebskosten.
- **Daten können verloren gehen,** wenn der Browser-Speicher gelöscht wird, besonders unter iOS bei längerer Nichtnutzung. Gegenmittel sind Backup-Export und Drive-Sync sowie der Beta-Hinweis auf der Startseite.
- **Funktionen mit Server-Bedarf** wie KI-Erkennung oder öffentliche Kalender-Abos müssen über Dienste ohne eigenen Server gelöst werden (siehe [ADR 0001](0001-texterkennung-lokal-vor-cloud.md)).
- **Schemaänderungen** brauchen eine neue Dexie-Version und gegebenenfalls eine Migration. Das Backup-Format muss abwärtskompatibel bleiben.
