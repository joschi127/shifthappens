# 0003: Import-Einstellungen in Dexie, mit Backup und Drive-Sync

- **Status:** Angenommen
- **Datum:** 18.10.2026
- **Feature:** [Dienstplan-Import](../prd/dienstplan-import.md)

## Kontext

Der Dienstplan-Import braucht Einstellungen pro Nutzer: Name im Dienstplan, Kürzel ohne Eintrag und Import-Vorlagen mit der Lage des Bereichs. Bisherige Einstellungen wie Design und Drive-Status liegen in `localStorage` und werden weder exportiert noch synchronisiert. Auf einem neuen Gerät müsste man die Import-Einstellungen also neu einrichten.

Export, Import und Drive-Sync hatten die Tabellen `shifts` und `shiftTypes` an vier Stellen fest verdrahtet: in `dbExportService.ts` und dreimal in `syncNow()`.

## Entscheidung

- **Neue Dexie-Tabelle** `importSettings` (Schema-Version 5) mit Schlüssel-Wert-Einträgen:
  - `profile`: `{ rosterNames, ignoreCodes }`
  - `templates`: `ImportTemplate[]`
- **Backup-Format Version 2** mit `tables.importSettings`.
- **Gemeinsame Funktionen in `backupService.ts`** (`collectBackup`, `isValidBackup`, `restoreBackup`). Export, Import und Drive-Sync nutzen nur noch diese.
- **Abwärtskompatibilität:** Backups der Version 1 ohne `importSettings` lassen sich weiter einspielen. Die lokalen Import-Einstellungen bleiben dabei erhalten, statt gelöscht zu werden.
- **Sync anstoßen:** Jede Änderung an den Import-Einstellungen ruft `markLocalModified()` auf.

## Konsequenzen

- Die Import-Einstellungen sind auf allen Geräten gleich und stecken im Backup.
- Neue Tabellen müssen künftig nur an einer Stelle (`backupService.ts`) ergänzt werden.
- Ältere App-Versionen ignorieren `importSettings` in neueren Backups. Lädt ein Gerät mit alter App-Version hoch, fehlen die Import-Einstellungen danach in der Cloud-Datei. Andere Geräte behalten ihre lokalen Einstellungen, weil ein Backup ohne `importSettings` sie nicht überschreibt. Das ist akzeptabel, weil sich die PWA automatisch aktualisiert.
- Das Foto selbst wird nie gespeichert und gehört nicht zu diesen Einstellungen.
