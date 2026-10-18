# Architekturentscheidungen (ADRs)

Format und Regeln: siehe [Guidelines](../guidelines.md#anforderungen--architekturentscheidungen).

| Nr. | Entscheidung | Status |
|---|---|---|
| [0001](0001-texterkennung-lokal-vor-cloud.md) | Texterkennung beim Dienstplan-Import zuerst lokal, Cloud nur als Rückfall | Angenommen |
| [0002](0002-schichtkuerzel-an-schicht-vorlage.md) | Schichtkürzel werden an der Schicht-Vorlage gespeichert | Angenommen |
| [0003](0003-import-einstellungen-in-dexie-mit-sync.md) | Import-Einstellungen in Dexie, mit Backup und Drive-Sync | Angenommen |
| [0004](0004-tech-stack-vue-ionic-vite-pwa.md) | Tech-Stack Vue 3, Ionic, Vite und PWA | Angenommen (nachträglich) |
| [0005](0005-offline-first-ohne-backend.md) | Offline First: alle Daten lokal in IndexedDB, kein Backend | Angenommen (nachträglich) |
| [0006](0006-schicht-kopiert-werte-der-vorlage.md) | Eine Schicht kopiert die Werte ihrer Vorlage | Angenommen (nachträglich) |
| [0007](0007-zeiten-und-datum-als-strings.md) | Uhrzeiten und Datum als Strings ohne Zeitzone | Angenommen (nachträglich) |
| [0008](0008-sync-ueber-google-drive-appdata.md) | Synchronisation über den Google-Drive-Anwendungsordner | Angenommen (nachträglich), ergänzt durch 0010 |
| [0009](0009-hosting-github-pages-und-konfiguration.md) | Hosting auf GitHub Pages und Konfiguration über Umgebungsvariablen | Angenommen (nachträglich) |
| [0010](0010-google-token-mit-ablaufzeit-speichern.md) | Google-Zugriffstoken mit Ablaufzeit lokal speichern | Angenommen, ergänzt 0008 |
| [0011](0011-kalender-teilen-per-ics-im-drive.md) | Kalender teilen per ICS-Datei mit öffentlichem Link im Google Drive | Vorgeschlagen (PoC ausstehend) |
