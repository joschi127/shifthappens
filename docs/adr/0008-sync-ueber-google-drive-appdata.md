# 0008: Synchronisation über den Google-Drive-Anwendungsordner

- **Status:** Angenommen. Nachträglich dokumentiert, Entscheidung bereits umgesetzt.
- **Datum der Entscheidung:** 01.08.2026 (Grundimplementierung Google Drive Sync)

## Kontext

Wegen [ADR 0005](0005-offline-first-ohne-backend.md) gibt es keinen Server. Trotzdem sollen Daten gesichert und zwischen Geräten abgeglichen werden, auf Android, iOS und im Web.

### Geprüfte Optionen

| Option | Bewertung |
|---|---|
| **Google Drive** (`appDataFolder`) | Für Entwickler kostenlos, plattformübergreifend, OAuth direkt im Browser. Ein versteckter Anwendungsordner ist möglich, ebenso die Freigabe von `.ics`-Dateien für ein späteres Kalender-Abo. |
| iCloud (CloudKit Web Services) | 99 $ pro Jahr Entwicklergebühr, komplexere API, nur für Apple-Nutzer sinnvoll. Zurückgestellt (Ideen-Backlog). |
| Eigener Server | Widerspricht ADR 0005. |

## Entscheidung

- **Anmeldung:** OAuth über **Google Identity Services** (Token-Client im Browser) mit den Scopes `drive.appdata` und `userinfo.email`. Die App kann so nur ihren eigenen versteckten Ordner sehen.
- **Ganzer Datenstand als eine Datei:** Synchronisiert wird `shifthappens_backup.json`, im selben Format wie der lokale Backup-Export (`backupService.ts`).
- **Erkennung von Änderungen über Zeitstempel:** lokale Änderung (`markLocalModified()`), letzter Sync und Zeitstempel der Cloud-Datei, mit 2 Sekunden Toleranz.
  - Nur eine Seite geändert: diese Seite wird übernommen.
  - Beide geändert, manueller Sync: Dialog „Cloud-Stand bevorzugen“ oder „Lokalen Stand hochladen“.
  - Beide geändert, automatischer Sync: Der neuere Stand gewinnt vollständig.
- **Optionaler automatischer Sync** alle 15 Minuten bei geöffneter App.
- **Zugriffstoken nur im Arbeitsspeicher,** nie dauerhaft gespeichert.

## Konsequenzen

- Keine Kosten, kein Server, und Google sieht nur die Backup-Datei der App.
- **Konflikte werden nicht zusammengeführt:** Es wird nicht pro Eintrag gemischt, sondern ein Stand gewinnt. Bei gleichzeitiger Nutzung mehrerer Geräte können Änderungen verloren gehen.
- **Der Zeitstempelvergleich hängt an der Gerätezeit.** Falsch gestellte Uhren können zu falschen Entscheidungen führen.
- **Jede Datenänderung muss `markLocalModified()` aufrufen,** sonst wird sie nicht hochgeladen. Bei den Schicht-Vorlagen fehlte das bis zum 18.10.2026.
- **Nach dem Neuladen** der App gibt es kein Token. Der automatische Sync läuft erst wieder nach einem manuellen Sync oder einer neuen Verbindung.
- **Die OAuth-Client-ID ist öffentlich** und wird zur Build-Zeit eingebacken (siehe [ADR 0009](0009-hosting-github-pages-und-konfiguration.md)).
